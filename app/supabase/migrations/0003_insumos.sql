-- =====================================================================
-- INSUMOS — itens comprados em lote (argola de chaveiro, saquinho, ímã…)
-- Você cadastra quanto pagou e quantas peças vieram; o custo unitário
-- sai da divisão. No produto, basta escolher o insumo e a quantidade.
-- =====================================================================

create table if not exists public.insumos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  marca       text,
  descricao   text,
  valor_pago  numeric not null default 0,   -- quanto custou o pacote/lote
  qtd_pecas   numeric not null default 1,   -- quantas peças vieram nele
  unidade     text not null default 'un',
  created_at  timestamptz not null default now(),

  custo_unitario numeric generated always as (
    coalesce(valor_pago / nullif(qtd_pecas, 0), 0)
  ) stored
);

-- Custos adicionais podem apontar para um insumo cadastrado.
-- Sem insumo, o valor continua sendo digitado à mão (comportamento antigo).
alter table public.custos_adicionais
  add column if not exists insumo_id  uuid references public.insumos(id) on delete restrict,
  add column if not exists quantidade numeric not null default 1;

create index if not exists custos_adicionais_insumo_idx on public.custos_adicionais(insumo_id);

-- Valor efetivo do custo adicional: do insumo quando houver, senão o manual.
-- As views saem e voltam inteiras — migrations posteriores acrescentam colunas
-- a elas, e `create or replace` não consegue removê-las depois.
drop view if exists public.vw_produtos_precos;
drop view if exists public.vw_produtos_custos;
drop view if exists public.vw_custos_adicionais;

create view public.vw_custos_adicionais as
select
  c.id,
  c.produto_id,
  c.insumo_id,
  c.quantidade,
  coalesce(i.nome, c.nome) as nome,
  c.valor as valor_manual,
  coalesce(i.custo_unitario, 0) as custo_unitario,
  case when c.insumo_id is null
       then c.valor
       else coalesce(i.custo_unitario, 0) * c.quantidade
  end as valor
from public.custos_adicionais c
left join public.insumos i on i.id = c.insumo_id;

alter table public.insumos enable row level security;
drop policy if exists "acesso_total" on public.insumos;
create policy "acesso_total" on public.insumos for all
  to anon, authenticated using (true) with check (true);

-- Reaproveita a view acima no consolidado do produto.
-- Consolidado por produto (aba Produto, coluna C)
create view public.vw_produtos_custos as
with prod as (
  select produto_id,
    sum(custo_material)       as custo_material,
    sum(custo_energia)        as custo_energia,
    sum(custo_manutencao)     as custo_manutencao,
    sum(custo_falhas)         as custo_falhas,
    sum(custo_acabamento)     as custo_acabamento,
    sum(retorno_investimento) as retorno_investimento,
    sum(custo_depreciacao)    as custo_depreciacao,
    sum(custo_peca)           as custos_producao,
    count(*)                  as qtd_pecas
  from public.vw_pecas_total group by produto_id
),
adic as (
  select produto_id, sum(valor) as custos_adicionais
  from public.vw_custos_adicionais group by produto_id
)
select
  pr.id            as produto_id,
  pr.nome,
  pr.descricao,
  coalesce(p.qtd_pecas, 0)             as qtd_pecas,
  coalesce(p.custo_material, 0)        as custo_material,
  coalesce(p.custo_energia, 0)         as custo_energia,
  coalesce(p.custo_manutencao, 0)      as custo_manutencao,
  coalesce(p.custo_falhas, 0)          as custo_falhas,
  coalesce(p.custo_acabamento, 0)      as custo_acabamento,
  coalesce(p.retorno_investimento, 0)  as retorno_investimento,
  coalesce(p.custo_depreciacao, 0)     as custo_depreciacao,
  coalesce(p.custos_producao, 0)       as custos_producao,
  pr.hrs_trabalhadas * pr.custo_hora   as custos_hora,
  coalesce(a.custos_adicionais, 0)     as custos_adicionais,

  -- CUSTOS TOTAIS = produção + hora + adicionais
  coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(a.custos_adicionais,0) as custos_totais,

  -- PREÇO UNITÁRIO SUGERIDO = custos totais * markup
  (coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(a.custos_adicionais,0)) * pr.markup_atacado as sugerido_atacado,
  (coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(a.custos_adicionais,0)) * pr.markup_varejo  as sugerido_varejo,

  pr.markup_atacado, pr.markup_varejo,
  pr.preco_final_atacado, pr.preco_final_varejo,
  pr.usar_preco, pr.impostos_percent,
  pr.marketplace_id,
  m.nome         as marketplace,
  coalesce(m.preco_fixo, 0)   as mkt_preco_fixo,
  coalesce(m.taxa_percent, 0) as mkt_taxa_percent
from public.produtos pr
left join prod p on p.produto_id = pr.id
left join adic a on a.produto_id = pr.id
left join public.marketplaces m on m.id = pr.marketplace_id;

-- Simulador: preço de venda já com taxas do marketplace embutidas
-- preço = (preço base + taxa fixa) / (1 - taxa %)
create view public.vw_produtos_precos as
select
  v.*,
  case when v.usar_preco = 'Final' then v.preco_final_atacado else v.sugerido_atacado end as base_atacado,
  case when v.usar_preco = 'Final' then v.preco_final_varejo  else v.sugerido_varejo  end as base_varejo,

  (case when v.usar_preco = 'Final' then v.preco_final_atacado else v.sugerido_atacado end
     + v.mkt_preco_fixo) / nullif(1 - v.mkt_taxa_percent, 0) as preco_atacado,
  (case when v.usar_preco = 'Final' then v.preco_final_varejo else v.sugerido_varejo end
     + v.mkt_preco_fixo) / nullif(1 - v.mkt_taxa_percent, 0) as preco_varejo
from public.vw_produtos_custos v;

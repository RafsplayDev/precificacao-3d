-- =====================================================================
-- MÃO DE OBRA — tabelas de custo por hora do seu trabalho
-- Produção, acabamento e modelagem têm valores diferentes; cada produto
-- escolhe quais usa e por quantos minutos.
-- =====================================================================

create table if not exists public.maos_obra (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  categoria   text not null default 'Producao'
              check (categoria in ('Producao','Acabamento','Modelagem')),
  descricao   text,
  custo_hora  numeric not null default 0,
  created_at  timestamptz not null default now(),

  custo_minuto numeric generated always as (coalesce(custo_hora / 60, 0)) stored
);

-- Quanto de cada tipo de trabalho entra num produto (em minutos).
create table if not exists public.produto_trabalhos (
  id           uuid primary key default gen_random_uuid(),
  produto_id   uuid not null references public.produtos(id) on delete cascade,
  mao_obra_id  uuid references public.maos_obra(id) on delete restrict,
  minutos      numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists produto_trabalhos_produto_idx on public.produto_trabalhos(produto_id);

create or replace view public.vw_produto_trabalhos as
select
  t.id,
  t.produto_id,
  t.mao_obra_id,
  t.minutos,
  coalesce(m.nome, 'Trabalho') as nome,
  coalesce(m.categoria, 'Producao') as categoria,
  coalesce(m.custo_hora, 0) as custo_hora,
  coalesce(m.custo_hora, 0) * t.minutos / 60 as valor
from public.produto_trabalhos t
left join public.maos_obra m on m.id = t.mao_obra_id;

-- Custo adicional sem insumo não precisa mais de nome digitado.
alter table public.custos_adicionais alter column nome drop not null;

alter table public.maos_obra enable row level security;
alter table public.produto_trabalhos enable row level security;
do $$
declare t text;
begin
  foreach t in array array['maos_obra','produto_trabalhos'] loop
    execute format('drop policy if exists "acesso_total" on public.%I', t);
    execute format('create policy "acesso_total" on public.%I for all
                    to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Alguns valores para começar (não sobrescreve o que já existir).
insert into public.maos_obra (nome, categoria, custo_hora) values
  ('Produção',   'Producao',   0),
  ('Acabamento', 'Acabamento', 0),
  ('Modelagem',  'Modelagem',  0)
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- Consolidado do produto: soma também o trabalho cadastrado.
-- ---------------------------------------------------------------------
-- A view ganha colunas novas no meio, então precisa ser recriada do zero.
drop view if exists public.vw_produtos_precos;
drop view if exists public.vw_produtos_custos;

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
),
trab as (
  select produto_id, sum(valor) as custos_trabalho
  from public.vw_produto_trabalhos group by produto_id
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

  -- "sua hora" da ficha + o trabalho detalhado por tipo
  (pr.hrs_trabalhadas * pr.custo_hora) + coalesce(t.custos_trabalho, 0) as custos_hora,
  coalesce(t.custos_trabalho, 0)       as custos_trabalho,
  coalesce(a.custos_adicionais, 0)     as custos_adicionais,

  coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(t.custos_trabalho,0) + coalesce(a.custos_adicionais,0) as custos_totais,

  (coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(t.custos_trabalho,0) + coalesce(a.custos_adicionais,0)) * pr.markup_atacado as sugerido_atacado,
  (coalesce(p.custos_producao,0) + (pr.hrs_trabalhadas * pr.custo_hora)
    + coalesce(t.custos_trabalho,0) + coalesce(a.custos_adicionais,0)) * pr.markup_varejo  as sugerido_varejo,

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
left join trab t on t.produto_id = pr.id
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

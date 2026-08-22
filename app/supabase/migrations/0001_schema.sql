-- =====================================================================
-- Calculadora de Precificação 3D — schema completo
-- Espelha a planilha "Calculadora da Fórmula da Precificação 3D — FDM V2.5"
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. IMPRESSORAS   (aba Listas, Tabela_impressoras)
-- ---------------------------------------------------------------------
create table if not exists public.impressoras (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null unique,
  marca               text,
  tempo_retorno_meses numeric not null default 10,
  valor_maquina       numeric not null default 0,   -- BRL
  hrs_dia             numeric not null default 20,
  dias_mes            numeric not null default 25,
  potencia_kw         numeric not null default 0.5,
  nivel_uso           text    not null default 'Medio'
                      check (nivel_uso in ('Basico','Medio','Profissional','Intenso')),
  percent_falhas      numeric not null default 0.05, -- fração: 0.05 = 5%
  created_at          timestamptz not null default now(),

  -- colunas calculadas (mesmas fórmulas das colunas T, U, V, W da aba Listas)
  nivel_desgaste numeric generated always as (
    case nivel_uso when 'Basico' then 0.10
                   when 'Medio' then 0.20
                   when 'Profissional' then 0.30
                   else 0.45 end
  ) stored,
  uso_estimado_anual_hrs numeric generated always as (
    tempo_retorno_meses * hrs_dia * dias_mes
  ) stored,
  hr_ano numeric generated always as (
    hrs_dia * dias_mes * 12
  ) stored,
  valor_adicionar_hr numeric generated always as (
    coalesce(valor_maquina / nullif(tempo_retorno_meses * hrs_dia * dias_mes, 0), 0)
  ) stored
);

-- ---------------------------------------------------------------------
-- 2. FILAMENTOS   (aba Listas, Tabela_filamentos)
-- ---------------------------------------------------------------------
create table if not exists public.filamentos (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null unique,
  marca                 text,
  descricao             text,
  peso_carretel_kg      numeric not null default 1,
  comprimento_carretel_m numeric not null default 335,
  custo_brl             numeric not null default 0,
  created_at            timestamptz not null default now(),

  custo_por_grama numeric generated always as (
    coalesce(custo_brl / nullif(peso_carretel_kg * 1000, 0), 0)
  ) stored
);

-- ---------------------------------------------------------------------
-- 3. MARKETPLACES   (aba Listas, Tabela_mktplace)
-- ---------------------------------------------------------------------
create table if not exists public.marketplaces (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null unique,   -- "MKT Place - Operação"
  preco_fixo    numeric not null default 0,   -- taxa fixa por venda (R$)
  taxa_percent  numeric not null default 0,   -- fração: 0.16 = 16%
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. BENS / DEPRECIAÇÃO FISCAL   (aba Listas, bloco BF:BK)
--    A soma da depreciação mensal é o intervalo nomeado "Depreciação".
-- ---------------------------------------------------------------------
create table if not exists public.bens_depreciacao (
  id                uuid primary key default gen_random_uuid(),
  bem               text not null,
  valor_aquisicao   numeric not null default 0,
  vida_util_meses   numeric not null default 12,
  taxa_anual        numeric not null default 0.10,
  created_at        timestamptz not null default now(),

  vida_util_anos numeric generated always as (vida_util_meses / 12) stored,
  depreciacao_mensal numeric generated always as (
    coalesce(valor_aquisicao / nullif(vida_util_meses, 0), 0)
  ) stored
);

-- ---------------------------------------------------------------------
-- 5. PRODUTOS   (aba Produto: markup, hora, preço final, marketplace)
-- ---------------------------------------------------------------------
create table if not exists public.produtos (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null unique,
  descricao           text,
  imagem_url          text,

  -- CUSTOS DA SUA HORA (B21:C23)
  hrs_trabalhadas     numeric not null default 1,
  custo_hora          numeric not null default 0,

  -- MARKUP DESEJADO (B36:C38)
  markup_atacado      numeric not null default 1.5,
  markup_varejo       numeric not null default 2.0,

  -- PREÇO UNITÁRIO FINAL (B44:E46)
  preco_final_atacado numeric not null default 0,
  preco_final_varejo  numeric not null default 0,

  -- SIMULADOR (I5:J6, J20)
  usar_preco          text not null default 'Sugerido' check (usar_preco in ('Sugerido','Final')),
  marketplace_id      uuid references public.marketplaces(id) on delete set null,
  impostos_percent    numeric not null default 0,

  -- Cenário com desconto (I26:K28)
  qtd_atacado         numeric not null default 100,
  desconto_atacado    numeric not null default 0,
  ajuste_custo_atacado numeric not null default 0,
  qtd_varejo          numeric not null default 100,
  desconto_varejo     numeric not null default 0,
  ajuste_custo_varejo numeric not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. PEÇAS   (aba Listas, Tabela_produtos — uma linha por peça impressa)
-- ---------------------------------------------------------------------
create table if not exists public.pecas (
  id                    uuid primary key default gen_random_uuid(),
  produto_id            uuid not null references public.produtos(id) on delete cascade,
  numero                int  not null default 1,
  nome                  text not null,
  impressora_id         uuid references public.impressoras(id) on delete restrict,
  filamento_id          uuid references public.filamentos(id) on delete restrict,
  comprimento_m         numeric not null default 0,
  tempo_impressao_horas numeric not null default 0,
  peso_gr               numeric not null default 0,
  tarifa_kwh            numeric not null default 0.95,
  percent_acabamento    numeric not null default 0.05,
  created_at            timestamptz not null default now()
);
create index if not exists pecas_produto_idx on public.pecas(produto_id);

-- ---------------------------------------------------------------------
-- 7. CUSTOS ADICIONAIS   (aba Produto, B25:C34)
-- ---------------------------------------------------------------------
create table if not exists public.custos_adicionais (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  nome        text not null,
  valor       numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists custos_adicionais_produto_idx on public.custos_adicionais(produto_id);

-- ---------------------------------------------------------------------
-- 8. CONCORRENTES   (aba Produtos & Concorrentes)
-- ---------------------------------------------------------------------
create table if not exists public.concorrentes (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  nome        text not null,
  link        text,
  preco       numeric not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists concorrentes_produto_idx on public.concorrentes(produto_id);

-- =====================================================================
-- VIEWS — as fórmulas da planilha, calculadas no banco
-- =====================================================================

-- Intervalo nomeado "Depreciação" = soma da depreciação fiscal mensal
create or replace view public.vw_depreciacao_total as
  select coalesce(sum(depreciacao_mensal), 0) as depreciacao_mensal_total
  from public.bens_depreciacao;

-- Custo por peça (colunas AC:AI da aba Listas)
create or replace view public.vw_pecas_custos as
select
  p.id,
  p.produto_id,
  p.numero,
  p.nome,
  p.comprimento_m,
  p.tempo_impressao_horas,
  p.peso_gr,
  p.tarifa_kwh,
  p.percent_acabamento,
  i.nome  as impressora,
  f.nome  as filamento,

  -- Custo Material = custo do filamento / (peso do carretel em g) * peso da peça
  coalesce(f.custo_por_grama, 0) * p.peso_gr                     as custo_material,

  -- Custo Energia = horas * potência (kW) * tarifa kWh
  p.tempo_impressao_horas * coalesce(i.potencia_kw,0) * p.tarifa_kwh as custo_energia,

  -- Custo Manutenção = (valor da máquina * nível de desgaste / horas por ano) * horas
  coalesce(i.valor_maquina * i.nivel_desgaste / nullif(i.hr_ano,0), 0)
        * p.tempo_impressao_horas                                      as custo_manutencao,

  -- Custo de Falhas = custo material * % falhas da impressora
  coalesce(f.custo_por_grama,0) * p.peso_gr * coalesce(i.percent_falhas,0) as custo_falhas,

  -- Custo de Acabamento = custo material * % acabamento
  coalesce(f.custo_por_grama,0) * p.peso_gr * p.percent_acabamento as custo_acabamento,

  -- Retorno do Investimento = (valor da máquina / uso estimado) * horas
  coalesce(i.valor_adicionar_hr,0) * p.tempo_impressao_horas     as retorno_investimento,

  -- Custo de Depreciação = uso estimado anual / depreciação fiscal mensal total
  coalesce(i.uso_estimado_anual_hrs,0) / nullif(d.depreciacao_mensal_total,0) as custo_depreciacao
from public.pecas p
left join public.impressoras i on i.id = p.impressora_id
left join public.filamentos  f on f.id = p.filamento_id
cross join public.vw_depreciacao_total d;

-- Soma dos 7 custos por peça
create or replace view public.vw_pecas_total as
select *,
  custo_material + custo_energia + custo_manutencao + custo_falhas
  + custo_acabamento + retorno_investimento + custo_depreciacao as custo_peca
from public.vw_pecas_custos;

-- Consolidado por produto (aba Produto, coluna C)
create or replace view public.vw_produtos_custos as
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
  from public.custos_adicionais group by produto_id
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
create or replace view public.vw_produtos_precos as
select
  v.*,
  case when v.usar_preco = 'Final' then v.preco_final_atacado else v.sugerido_atacado end as base_atacado,
  case when v.usar_preco = 'Final' then v.preco_final_varejo  else v.sugerido_varejo  end as base_varejo,

  (case when v.usar_preco = 'Final' then v.preco_final_atacado else v.sugerido_atacado end
     + v.mkt_preco_fixo) / nullif(1 - v.mkt_taxa_percent, 0) as preco_atacado,
  (case when v.usar_preco = 'Final' then v.preco_final_varejo else v.sugerido_varejo end
     + v.mkt_preco_fixo) / nullif(1 - v.mkt_taxa_percent, 0) as preco_varejo
from public.vw_produtos_custos v;

-- =====================================================================
-- RLS
-- Atenção: as políticas abaixo liberam leitura e escrita para a chave
-- publishable (anon). Serve para uso interno/single-user. Se o painel
-- for exposto publicamente, troque por políticas baseadas em auth.uid().
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['impressoras','filamentos','marketplaces','bens_depreciacao',
                           'produtos','pecas','custos_adicionais','concorrentes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acesso_total" on public.%I', t);
    execute format('create policy "acesso_total" on public.%I for all
                    to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

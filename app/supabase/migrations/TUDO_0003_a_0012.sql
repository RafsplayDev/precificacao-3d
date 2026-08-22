-- =====================================================================
-- Calculadora de Precificação 3D — atualização completa (0003 → 0012)
-- Rode este arquivo inteiro, de uma vez, no SQL Editor do Supabase.
-- Idempotente: rodar de novo não duplica dados nem quebra nada.
-- Não inclui 0001 (schema) nem 0002 (dados iniciais), que já rodaram.
-- =====================================================================



-- #####################################################################
-- 0003_insumos.sql
-- #####################################################################

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


-- #####################################################################
-- 0004_mao_de_obra.sql
-- #####################################################################

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


-- #####################################################################
-- 0005_configuracoes.sql
-- #####################################################################

-- =====================================================================
-- CONFIGURAÇÕES — valores que valem para o negócio inteiro
-- A tarifa de kWh não muda de peça para peça: é a conta de luz.
-- Tabela de linha única (o check em `id` garante isso).
-- =====================================================================

create table if not exists public.configuracoes (
  id          boolean primary key default true check (id),
  tarifa_kwh  numeric not null default 0.95,
  concessionaria text,
  atualizado_em timestamptz not null default now()
);

-- Começa com a tarifa que as peças já usavam, se houver alguma.
insert into public.configuracoes (id, tarifa_kwh)
values (true, coalesce((select max(tarifa_kwh) from public.pecas), 0.95))
on conflict (id) do nothing;

alter table public.configuracoes enable row level security;
drop policy if exists "acesso_total" on public.configuracoes;
create policy "acesso_total" on public.configuracoes for all
  to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- O custo de energia passa a ler a tarifa das configurações.
-- Mesmas colunas de antes, então `create or replace` basta.
-- ---------------------------------------------------------------------
create or replace view public.vw_pecas_custos as
select
  p.id,
  p.produto_id,
  p.numero,
  p.nome,
  p.comprimento_m,
  p.tempo_impressao_horas,
  p.peso_gr,
  coalesce(cfg.tarifa_kwh, p.tarifa_kwh) as tarifa_kwh,
  p.percent_acabamento,
  i.nome  as impressora,
  f.nome  as filamento,

  coalesce(f.custo_por_grama, 0) * p.peso_gr                     as custo_material,

  p.tempo_impressao_horas * coalesce(i.potencia_kw,0)
    * coalesce(cfg.tarifa_kwh, p.tarifa_kwh)                     as custo_energia,

  coalesce(i.valor_maquina * i.nivel_desgaste / nullif(i.hr_ano,0), 0)
        * p.tempo_impressao_horas                                as custo_manutencao,

  coalesce(f.custo_por_grama,0) * p.peso_gr * coalesce(i.percent_falhas,0) as custo_falhas,

  coalesce(f.custo_por_grama,0) * p.peso_gr * p.percent_acabamento as custo_acabamento,

  coalesce(i.valor_adicionar_hr,0) * p.tempo_impressao_horas     as retorno_investimento,

  coalesce(i.uso_estimado_anual_hrs,0) / nullif(d.depreciacao_mensal_total,0) as custo_depreciacao
from public.pecas p
left join public.impressoras i on i.id = p.impressora_id
left join public.filamentos  f on f.id = p.filamento_id
left join public.configuracoes cfg on cfg.id
cross join public.vw_depreciacao_total d;


-- #####################################################################
-- 0006_hora_para_mao_de_obra.sql
-- #####################################################################

-- =====================================================================
-- "Sua hora" do produto vira mão de obra de verdade
-- O par hrs_trabalhadas × custo_hora que ficava solto em cada produto
-- passa a ser uma linha em produto_trabalhos, do mesmo jeito que
-- produção, acabamento e modelagem.
-- =====================================================================

-- 1. Um tipo de trabalho para cada valor/hora que já estava em uso.
insert into public.maos_obra (nome, categoria, descricao, custo_hora)
select distinct
  'Produção — R$ ' || to_char(p.custo_hora, 'FM999999990.00') || '/h',
  'Producao',
  'Criado na migração da antiga "sua hora" do produto.',
  p.custo_hora
from public.produtos p
where p.custo_hora > 0 and p.hrs_trabalhadas > 0
on conflict (nome) do nothing;

-- 2. As horas de cada produto viram minutos na tabela de trabalhos.
insert into public.produto_trabalhos (produto_id, mao_obra_id, minutos)
select
  p.id,
  m.id,
  p.hrs_trabalhadas * 60
from public.produtos p
join public.maos_obra m
  on m.nome = 'Produção — R$ ' || to_char(p.custo_hora, 'FM999999990.00') || '/h'
where p.custo_hora > 0 and p.hrs_trabalhadas > 0;

-- 3. Zera os campos antigos: nada mais os lê.
update public.produtos set hrs_trabalhadas = 0, custo_hora = 0;

-- ---------------------------------------------------------------------
-- 4. O consolidado passa a contar só a mão de obra cadastrada.
-- ---------------------------------------------------------------------
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

  coalesce(t.custos_trabalho, 0)       as custos_hora,
  coalesce(t.custos_trabalho, 0)       as custos_trabalho,
  coalesce(a.custos_adicionais, 0)     as custos_adicionais,

  coalesce(p.custos_producao,0) + coalesce(t.custos_trabalho,0)
    + coalesce(a.custos_adicionais,0) as custos_totais,

  (coalesce(p.custos_producao,0) + coalesce(t.custos_trabalho,0)
    + coalesce(a.custos_adicionais,0)) * pr.markup_atacado as sugerido_atacado,
  (coalesce(p.custos_producao,0) + coalesce(t.custos_trabalho,0)
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
left join trab t on t.produto_id = pr.id
left join public.marketplaces m on m.id = pr.marketplace_id;


-- #####################################################################
-- 0007_insumos_tipos.sql
-- #####################################################################

-- =====================================================================
-- INSUMOS por medida, não só por peça
-- Argola vem por unidade, mas tinta vem em ml, fita em metros, resina em
-- gramas. A conta é a mesma — valor pago ÷ quantidade do pacote — só que
-- agora a quantidade tem tipo e unidade declarados.
-- =====================================================================

alter table public.insumos
  add column if not exists tipo text not null default 'Unidade'
    check (tipo in ('Unidade','Peso','Volume','Comprimento','Área','Tempo'));

comment on column public.insumos.qtd_pecas is
  'Quanto vem no pacote, na unidade da coluna `unidade` (peças, gramas, ml, metros...).';
comment on column public.insumos.custo_unitario is
  'Custo de uma unidade de medida: valor pago ÷ quantidade do pacote.';

-- A view dos custos adicionais passa a carregar a unidade, para a tela
-- conseguir dizer "× 12 ml" em vez de só "× 12".
create or replace view public.vw_custos_adicionais as
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
  end as valor,
  i.unidade,
  i.tipo
from public.custos_adicionais c
left join public.insumos i on i.id = c.insumo_id;


-- #####################################################################
-- 0008_insumos_tipos_enxutos.sql
-- #####################################################################

-- =====================================================================
-- Menos tipos de medida, só os que aparecem de verdade
-- Área e Tempo saem: insumo de impressão 3D se compra por unidade, volume
-- (tinta, resina, cola), peso (pó, grânulos) ou comprimento (fita, cordão).
-- =====================================================================

update public.insumos
   set tipo = 'Unidade', unidade = 'un'
 where tipo in ('Área', 'Tempo');

-- Unidades órfãs dos tipos removidos, caso alguma linha tenha ficado para trás.
update public.insumos set unidade = 'un' where unidade in ('par', 'kit', 'folha', 'mm', 'cm²', 'm²', 'min', 'h');

alter table public.insumos drop constraint if exists insumos_tipo_check;
alter table public.insumos
  add constraint insumos_tipo_check
  check (tipo in ('Unidade', 'Peso', 'Volume', 'Comprimento'));


-- #####################################################################
-- 0009_markup_padrao.sql
-- #####################################################################

-- =====================================================================
-- Markup padrão do negócio
-- Cada produto continua com o seu, mas produto novo nasce com estes.
-- =====================================================================

alter table public.configuracoes
  add column if not exists markup_atacado_padrao numeric not null default 1.5,
  add column if not exists markup_varejo_padrao  numeric not null default 2.0;

comment on column public.configuracoes.markup_atacado_padrao is
  'Multiplicador sugerido no atacado para produtos novos. O produto pode sobrescrever.';
comment on column public.configuracoes.markup_varejo_padrao is
  'Multiplicador sugerido no varejo para produtos novos. O produto pode sobrescrever.';


-- #####################################################################
-- 0010_faixas_atacado.sql
-- #####################################################################

-- =====================================================================
-- FAIXAS DE ATACADO
-- Atacado quase nunca é um desconto só: de 10 a 15 peças um preço, de 16 a
-- 30 outro. Cada faixa é uma linha aqui, com o desconto que vale nela.
-- =====================================================================

create table if not exists public.faixas_atacado (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  qtd_min     numeric not null default 1,
  qtd_max     numeric not null default 0,    -- 0 = "daqui para cima"
  desconto    numeric not null default 0,   -- fração: 0.1 = 10%
  created_at  timestamptz not null default now()
);
create index if not exists faixas_atacado_produto_idx on public.faixas_atacado(produto_id, qtd_min);

alter table public.faixas_atacado enable row level security;
drop policy if exists "acesso_total" on public.faixas_atacado;
create policy "acesso_total" on public.faixas_atacado for all
  to anon, authenticated using (true) with check (true);

-- Migra o cenário único que existia no produto para a primeira faixa.
-- Só faz sentido enquanto a coluna `desconto` existir: a migration 0011 a
-- substitui por `markup`, e aí este trecho vira letra morta.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'faixas_atacado' and column_name = 'desconto'
  ) then
    insert into public.faixas_atacado (produto_id, qtd_min, qtd_max, desconto)
    select p.id, greatest(p.qtd_atacado, 1), 0, p.desconto_atacado
      from public.produtos p
     where p.desconto_atacado > 0
       and not exists (select 1 from public.faixas_atacado f where f.produto_id = p.id);
  end if;
end $$;


-- #####################################################################
-- 0011_faixas_markup.sql
-- #####################################################################

-- =====================================================================
-- Faixa de atacado passa a ter markup próprio, não desconto
-- Sem faixa nenhuma, o atacado sai pelo markup padrão do negócio.
-- Criando faixas, cada uma tem o seu multiplicador.
-- =====================================================================

alter table public.faixas_atacado
  add column if not exists markup numeric not null default 1.5;

-- Converte o desconto que existia: preço com X% de desconto equivale a
-- markup do produto × (1 − X). Guardado porque numa segunda passada a
-- coluna `desconto` já não existe mais.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'faixas_atacado' and column_name = 'desconto'
  ) then
    update public.faixas_atacado f
       set markup = greatest(coalesce(p.markup_atacado, 1.5) * (1 - coalesce(f.desconto, 0)), 0)
      from public.produtos p
     where p.id = f.produto_id
       and f.desconto > 0;

    alter table public.faixas_atacado drop column desconto;
  end if;
end $$;


-- #####################################################################
-- 0012_markup_padrao_valores.sql
-- #####################################################################

-- =====================================================================
-- Markup padrão do negócio: 2,0 no varejo e 1,5 no atacado
-- Só preenche onde está zerado — se você já ajustou o seu, fica como está.
-- =====================================================================

-- Garante as colunas, caso a 0009 ainda não tenha rodado neste banco.
alter table public.configuracoes
  add column if not exists markup_atacado_padrao numeric not null default 1.5,
  add column if not exists markup_varejo_padrao  numeric not null default 2.0;

update public.configuracoes
   set markup_atacado_padrao = 1.5
 where coalesce(markup_atacado_padrao, 0) <= 0;

update public.configuracoes
   set markup_varejo_padrao = 2.0
 where coalesce(markup_varejo_padrao, 0) <= 0;

alter table public.configuracoes
  alter column markup_atacado_padrao set default 1.5,
  alter column markup_varejo_padrao  set default 2.0;

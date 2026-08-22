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

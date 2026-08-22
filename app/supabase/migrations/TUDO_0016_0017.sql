-- =====================================================================
-- Peças: quantas unidades saem em UMA impressão (uma mesa)
-- Tempo, peso e comprimento continuam sendo os da impressão inteira;
-- os custos passam a ser divididos por esta quantidade → custo por unidade.
-- =====================================================================
alter table public.pecas
  add column if not exists unidades_por_impressao int not null default 1;

alter table public.pecas
  drop constraint if exists pecas_unidades_por_impressao_check;
alter table public.pecas
  add constraint pecas_unidades_por_impressao_check
  check (unidades_por_impressao >= 1);

-- Recria a view de custos dividindo os 7 custos pelas unidades da mesa
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

  coalesce(f.custo_por_grama, 0) * p.peso_gr
        / greatest(p.unidades_por_impressao,1)                    as custo_material,

  p.tempo_impressao_horas * coalesce(i.potencia_kw,0) * p.tarifa_kwh
        / greatest(p.unidades_por_impressao,1)                    as custo_energia,

  coalesce(i.valor_maquina * i.nivel_desgaste / nullif(i.hr_ano,0), 0)
        * p.tempo_impressao_horas
        / greatest(p.unidades_por_impressao,1)                    as custo_manutencao,

  coalesce(f.custo_por_grama,0) * p.peso_gr * coalesce(i.percent_falhas,0)
        / greatest(p.unidades_por_impressao,1)                    as custo_falhas,

  coalesce(f.custo_por_grama,0) * p.peso_gr * p.percent_acabamento
        / greatest(p.unidades_por_impressao,1)                    as custo_acabamento,

  coalesce(i.valor_adicionar_hr,0) * p.tempo_impressao_horas
        / greatest(p.unidades_por_impressao,1)                    as retorno_investimento,

  coalesce(i.uso_estimado_anual_hrs,0) / nullif(d.depreciacao_mensal_total,0)
        / greatest(p.unidades_por_impressao,1)                    as custo_depreciacao,

  -- coluna nova sempre no fim: create or replace view não aceita no meio
  greatest(p.unidades_por_impressao, 1)                           as unidades_por_impressao
from public.pecas p
left join public.impressoras i on i.id = p.impressora_id
left join public.filamentos  f on f.id = p.filamento_id
cross join public.vw_depreciacao_total d;
-- =====================================================================
-- Mão de obra: quantas unidades esse trabalho atende
-- Ex.: 30 min para tirar e limpar a mesa que rendeu 10 peças → minutos 30,
-- unidades 10. O valor do trabalho passa a ser o de UMA unidade.
-- =====================================================================
alter table public.produto_trabalhos
  add column if not exists unidades int not null default 1;

alter table public.produto_trabalhos
  drop constraint if exists produto_trabalhos_unidades_check;
alter table public.produto_trabalhos
  add constraint produto_trabalhos_unidades_check check (unidades >= 1);

create or replace view public.vw_produto_trabalhos as
select
  t.id,
  t.produto_id,
  t.mao_obra_id,
  t.minutos,
  coalesce(m.nome, 'Trabalho') as nome,
  coalesce(m.categoria, 'Producao') as categoria,
  coalesce(m.custo_hora, 0) as custo_hora,
  coalesce(m.custo_hora, 0) * t.minutos / 60 / greatest(t.unidades, 1) as valor,
  greatest(t.unidades, 1) as unidades
from public.produto_trabalhos t
left join public.maos_obra m on m.id = t.mao_obra_id;

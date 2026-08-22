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

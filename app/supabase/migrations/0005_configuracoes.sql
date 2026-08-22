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

-- =====================================================================
-- Preço definido por faixa de atacado
-- No modo "preço definido" cada faixa tem o preço que você quer cobrar
-- nela, em vez de sair de um multiplicador sobre o custo.
-- =====================================================================

alter table public.faixas_atacado
  add column if not exists preco_final numeric not null default 0;

comment on column public.faixas_atacado.preco_final is
  'Preço base desejado nesta faixa. Vale quando o produto usa "Final" como base de cálculo.';

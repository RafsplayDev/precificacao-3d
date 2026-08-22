-- =====================================================================
-- Ajuste de custo do atacado em porcentagem
-- Quando as faixas são pensadas em % de desconto, o ajuste de custo também
-- é: uma fração sobre o custo unitário, e não um valor fixo por peça.
-- =====================================================================

alter table public.produtos
  add column if not exists ajuste_custo_atacado_pct numeric not null default 0;

comment on column public.produtos.ajuste_custo_atacado_pct is
  'Fração somada ao custo unitário no atacado (0.05 = 5%). Alternativa ao ajuste_custo_atacado, em reais.';

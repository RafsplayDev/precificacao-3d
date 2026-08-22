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

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

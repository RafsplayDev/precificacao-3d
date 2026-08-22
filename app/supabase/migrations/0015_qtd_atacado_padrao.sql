-- =====================================================================
-- Quantidade base do atacado no cadastro do negócio
-- Produto novo já nasce sabendo a partir de quantas peças um pedido
-- conta como atacado. Cada produto continua podendo mudar a sua.
-- =====================================================================

alter table public.configuracoes
  add column if not exists qtd_atacado_padrao numeric not null default 10;

comment on column public.configuracoes.qtd_atacado_padrao is
  'A partir de quantas unidades um pedido é atacado, para produtos novos.';

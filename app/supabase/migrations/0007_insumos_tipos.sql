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

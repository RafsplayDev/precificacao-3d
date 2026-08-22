-- =====================================================================
-- Menos tipos de medida, só os que aparecem de verdade
-- Área e Tempo saem: insumo de impressão 3D se compra por unidade, volume
-- (tinta, resina, cola), peso (pó, grânulos) ou comprimento (fita, cordão).
-- =====================================================================

update public.insumos
   set tipo = 'Unidade', unidade = 'un'
 where tipo in ('Área', 'Tempo');

-- Unidades órfãs dos tipos removidos, caso alguma linha tenha ficado para trás.
update public.insumos set unidade = 'un' where unidade in ('par', 'kit', 'folha', 'mm', 'cm²', 'm²', 'min', 'h');

alter table public.insumos drop constraint if exists insumos_tipo_check;
alter table public.insumos
  add constraint insumos_tipo_check
  check (tipo in ('Unidade', 'Peso', 'Volume', 'Comprimento'));

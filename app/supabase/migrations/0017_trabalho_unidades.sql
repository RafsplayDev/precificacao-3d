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

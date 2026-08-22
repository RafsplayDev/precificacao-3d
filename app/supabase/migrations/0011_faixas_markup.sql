-- =====================================================================
-- Faixa de atacado passa a ter markup próprio, não desconto
-- Sem faixa nenhuma, o atacado sai pelo markup padrão do negócio.
-- Criando faixas, cada uma tem o seu multiplicador.
-- =====================================================================

alter table public.faixas_atacado
  add column if not exists markup numeric not null default 1.5;

-- Converte o desconto que existia: preço com X% de desconto equivale a
-- markup do produto × (1 − X). Guardado porque numa segunda passada a
-- coluna `desconto` já não existe mais.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'faixas_atacado' and column_name = 'desconto'
  ) then
    update public.faixas_atacado f
       set markup = greatest(coalesce(p.markup_atacado, 1.5) * (1 - coalesce(f.desconto, 0)), 0)
      from public.produtos p
     where p.id = f.produto_id
       and f.desconto > 0;

    alter table public.faixas_atacado drop column desconto;
  end if;
end $$;

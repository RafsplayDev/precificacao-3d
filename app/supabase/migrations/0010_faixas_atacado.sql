-- =====================================================================
-- FAIXAS DE ATACADO
-- Atacado quase nunca é um desconto só: de 10 a 15 peças um preço, de 16 a
-- 30 outro. Cada faixa é uma linha aqui, com o desconto que vale nela.
-- =====================================================================

create table if not exists public.faixas_atacado (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  qtd_min     numeric not null default 1,
  qtd_max     numeric not null default 0,    -- 0 = "daqui para cima"
  desconto    numeric not null default 0,   -- fração: 0.1 = 10%
  created_at  timestamptz not null default now()
);
create index if not exists faixas_atacado_produto_idx on public.faixas_atacado(produto_id, qtd_min);

alter table public.faixas_atacado enable row level security;
drop policy if exists "acesso_total" on public.faixas_atacado;
create policy "acesso_total" on public.faixas_atacado for all
  to anon, authenticated using (true) with check (true);

-- Migra o cenário único que existia no produto para a primeira faixa.
-- Só faz sentido enquanto a coluna `desconto` existir: a migration 0011 a
-- substitui por `markup`, e aí este trecho vira letra morta.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'faixas_atacado' and column_name = 'desconto'
  ) then
    insert into public.faixas_atacado (produto_id, qtd_min, qtd_max, desconto)
    select p.id, greatest(p.qtd_atacado, 1), 0, p.desconto_atacado
      from public.produtos p
     where p.desconto_atacado > 0
       and not exists (select 1 from public.faixas_atacado f where f.produto_id = p.id);
  end if;
end $$;

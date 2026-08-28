-- =====================================================================
-- GESTÃO — o que saiu do bolso e o que entrou
--
-- Até aqui o app respondia "por quanto vender". Ele não respondia "e no
-- fim do mês, sobrou?". Duas tabelas fecham essa conta:
--
--   gastos  — dinheiro que saiu de verdade (carretel comprado, conta de
--             luz, bico trocado). Lançamento manual, porque a nota fiscal
--             não passa pelo app.
--   vendas  — dinheiro que entrou, uma linha por venda.
--
-- Elas respondem perguntas diferentes e por isso não se somam:
--
--   • O lucro DA VENDA usa o custo calculado da peça (custo_unitario), e
--     diz se o preço está certo.
--   • O caixa DO PERÍODO usa os gastos lançados, e diz o que sobrou.
--
-- Somar os dois seria contar o filamento duas vezes — uma no carretel
-- comprado, outra rateada na peça. A tela mostra os dois separados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. GASTOS
-- `data` é do dia do gasto, não do dia em que foi lançado: quem lança a
-- conta de luz de março em abril precisa que ela caia em março.
-- ---------------------------------------------------------------------
create table if not exists public.gastos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        date not null default current_date,
  categoria   text not null default 'Outros'
              check (categoria in ('Filamento','Energia','Manutencao','Pecas','Insumos',
                                   'Equipamento','Marketing','Taxas','Outros')),
  descricao   text,
  valor       numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. VENDAS
--
-- `custo_unitario` é cópia, não referência. O custo do produto muda toda
-- vez que o filamento encarece ou a mão de obra é reajustada; se a venda
-- lesse o custo de hoje, o lucro de uma venda de março mudaria sozinho em
-- agosto. O que valia no dia fica gravado no dia.
--
-- `produto_id` é `on delete set null`: apagar um produto do catálogo não
-- pode apagar o histórico de que ele foi vendido. A venda perde o vínculo
-- e mantém a descrição, o preço e o custo daquele dia.
-- ---------------------------------------------------------------------
create table if not exists public.vendas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data            date not null default current_date,
  produto_id      uuid references public.produtos(id) on delete set null,
  descricao       text,
  cliente         text,
  quantidade      numeric not null default 1,
  preco_unitario  numeric not null default 0,
  custo_unitario  numeric not null default 0,
  taxas           numeric not null default 0,   -- comissão do marketplace, frete pago, imposto
  created_at      timestamptz not null default now(),

  receita numeric generated always as (quantidade * preco_unitario) stored,
  custo_total numeric generated always as (quantidade * custo_unitario) stored,
  lucro numeric generated always as (
    quantidade * preco_unitario - quantidade * custo_unitario - taxas
  ) stored
);

-- ---------------------------------------------------------------------
-- 3. Índices
-- Toda leitura da tela é "as linhas desta conta, neste período".
-- ---------------------------------------------------------------------
create index if not exists gastos_user_idx on public.gastos(user_id, data desc);
create index if not exists vendas_user_idx on public.vendas(user_id, data desc);
create index if not exists vendas_produto_idx on public.vendas(produto_id);

-- ---------------------------------------------------------------------
-- 4. RLS — mesma política das outras tabelas de dados (migração 0018)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['gastos','vendas']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format('create policy "dono" on public.%I for all
                    to authenticated
                    using (user_id = auth.uid())
                    with check (user_id = auth.uid())', t);
  end loop;
end $$;

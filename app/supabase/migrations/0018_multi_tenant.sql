-- =====================================================================
-- MULTI-TENANCY — cada conta enxerga apenas os próprios dados
--
-- Até aqui o banco era de um dono só: as políticas liberavam tudo para a
-- chave publishable. Para vender acesso, cada linha precisa saber a quem
-- pertence. Este arquivo:
--   1. acrescenta `user_id` em todas as tabelas de dados;
--   2. troca os unique globais por unique por usuário
--      (dois clientes podem ter uma impressora "Ender 3");
--   3. substitui a política `acesso_total` por RLS de verdade;
--   4. liga security_invoker nas views — sem isso a view roda como dona
--      e devolve os dados de todo mundo, furando o RLS.
--
-- Os dados que já existem ficam órfãos (user_id nulo) e invisíveis.
-- Rode 0019_adotar_dados.sql depois de criar sua conta para adotá-los.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coluna user_id
-- O default auth.uid() faz o cliente não precisar mandar o campo: quem
-- insere é sempre quem está logado, e o `with check` do RLS confirma.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'impressoras','filamentos','marketplaces','insumos','maos_obra',
    'bens_depreciacao','produtos','concorrentes',
    'pecas','custos_adicionais','produto_trabalhos','faixas_atacado'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists user_id uuid
         default auth.uid() references auth.users(id) on delete cascade', t);
    execute format('create index if not exists %I on public.%I(user_id)',
                   t || '_user_idx', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2. configuracoes deixa de ser linha unica global
-- Era `id boolean primary key check (id)`: uma linha para o banco inteiro.
-- A coluna `id` continua booleana de proposito -- a view vw_pecas_custos
-- junta com `left join configuracoes cfg on cfg.id`, usando o booleano
-- como ON TRUE. Mexer no tipo obrigaria a derrubar e recriar a cadeia
-- inteira de views. Em vez disso a chave primaria passa a ser o usuario:
-- cada conta tem exatamente uma linha, e o RLS faz o join achar so a dela.
-- ---------------------------------------------------------------------
alter table public.configuracoes
  add column if not exists user_id uuid default auth.uid()
  references auth.users(id) on delete cascade;

alter table public.configuracoes drop constraint if exists configuracoes_pkey;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='configuracoes_pkey')
     and not exists (select 1 from public.configuracoes where user_id is null)
  then
    alter table public.configuracoes add primary key (user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Unique por usuário
-- "Ender 3" só pode repetir dentro da mesma conta.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['impressoras','filamentos','marketplaces',
                           'insumos','maos_obra','produtos']
  loop
    execute format('alter table public.%I drop constraint if exists %I',
                   t, t || '_nome_key');
    execute format('drop index if exists public.%I', t || '_user_nome_key');
    execute format('create unique index %I on public.%I(user_id, nome)',
                   t || '_user_nome_key', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. RLS de verdade
-- A política antiga (`using (true) to anon`) some. Agora só `authenticated`
-- entra, e só nas próprias linhas.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'impressoras','filamentos','marketplaces','insumos','maos_obra',
    'bens_depreciacao','produtos','concorrentes',
    'pecas','custos_adicionais','produto_trabalhos','faixas_atacado'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "acesso_total" on public.%I', t);
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format('create policy "dono" on public.%I for all
                    to authenticated
                    using (user_id = auth.uid())
                    with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table public.configuracoes enable row level security;
drop policy if exists "acesso_total" on public.configuracoes;
drop policy if exists "dono" on public.configuracoes;
create policy "dono" on public.configuracoes for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5. security_invoker nas views
-- Por padrão uma view roda com os privilégios de quem a criou, não de quem
-- a consulta — o que faria vw_produtos_precos devolver os produtos de
-- todas as contas, furando todo o RLS acima. Este é o passo que fecha o
-- buraco. (Postgres 15+.)
-- ---------------------------------------------------------------------
do $$
declare v text;
begin
  foreach v in array array[
    'vw_depreciacao_total','vw_pecas_custos','vw_pecas_total',
    'vw_custos_adicionais','vw_produto_trabalhos',
    'vw_produtos_custos','vw_produtos_precos'
  ]
  loop
    if exists (select 1 from pg_views
                where schemaname='public' and viewname=v) then
      execute format('alter view public.%I set (security_invoker = on)', v);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 6. Conta nova já nasce utilizável
-- Sem a linha de configuracoes o app abre com tarifa de energia zerada e
-- todo custo sai errado. O trigger cria o mínimo para a conta funcionar:
-- as configurações padrão e um canal de venda "Venda Direta" sem taxa.
-- ---------------------------------------------------------------------
create or replace function public.semear_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.configuracoes (user_id) values (new.id)
  on conflict do nothing;

  insert into public.marketplaces (user_id, nome, preco_fixo, taxa_percent)
  values (new.id, 'Venda Direta', 0, 0)
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.semear_conta();

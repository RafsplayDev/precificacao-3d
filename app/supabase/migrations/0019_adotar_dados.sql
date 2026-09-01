-- =====================================================================
-- ADOTAR OS DADOS QUE JÁ EXISTIAM
--
-- A 0018 deixou as linhas antigas com user_id nulo — o RLS as esconde de
-- todo mundo, inclusive de você. Este arquivo entrega essas linhas órfãs
-- para uma conta.
--
-- COMO USAR: crie sua conta no app primeiro, troque o e-mail abaixo pelo
-- seu, e rode este arquivo inteiro no SQL Editor do Supabase.
-- Rodar duas vezes não faz mal: só há linhas órfãs na primeira.
-- =====================================================================
do $$
declare
  dono uuid;
  email_do_dono constant text := 'rafsplayofc@gmail.com';
  t text;
  n bigint;
begin
  select id into dono from auth.users where email = email_do_dono;

  if dono is null then
    raise exception
      'Nenhuma conta com o e-mail %. Cadastre-se no app antes de rodar este arquivo.',
      email_do_dono;
  end if;

  -- O trigger de conta nova ja semeou configuracoes e um canal de venda.
  -- Se os dados antigos trazem os mesmos nomes, o unique(user_id, nome)
  -- barraria a adocao -- entao a semente sai na frente e o dado real fica.
  delete from public.configuracoes where user_id = dono
    and exists (select 1 from public.configuracoes where user_id is null);

  delete from public.marketplaces m where m.user_id = dono
    and exists (select 1 from public.marketplaces o
                 where o.user_id is null and o.nome = m.nome);

  foreach t in array array[
    'impressoras','filamentos','marketplaces','insumos','maos_obra',
    'bens_depreciacao','produtos','concorrentes',
    'pecas','custos_adicionais','produto_trabalhos','faixas_atacado'
  ]
  loop
    execute format('update public.%I set user_id = $1 where user_id is null', t)
      using dono;
    get diagnostics n = row_count;
    raise notice '% : % linha(s) adotada(s)', t, n;
  end loop;

  update public.configuracoes set user_id = dono where user_id is null;

  -- Agora que ninguém mais está órfão, o user_id vira obrigatório.
  foreach t in array array[
    'impressoras','filamentos','marketplaces','insumos','maos_obra',
    'bens_depreciacao','produtos','concorrentes',
    'pecas','custos_adicionais','produto_trabalhos','faixas_atacado'
  ]
  loop
    execute format('alter table public.%I alter column user_id set not null', t);
  end loop;

  if not exists (select 1 from pg_constraint where conname='configuracoes_pkey') then
    alter table public.configuracoes add primary key (user_id);
  end if;
end $$;

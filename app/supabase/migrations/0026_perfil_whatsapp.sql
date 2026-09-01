-- =====================================================================
-- O WHATSAPP DA CONTA NOVA
--
-- O último passo do /beta virou o cadastro: nome, WhatsApp, e-mail e
-- senha de uma vez só. O WhatsApp já ia para beta_candidatos, mas a
-- coluna `perfis.whatsapp` (0020) continuava vazia — o trigger de conta
-- nova só copiava nome e e-mail dos metadados do signUp.
--
-- Aqui ele passa a copiar o WhatsApp também. Nada mais muda: mesma
-- função, mesmo trigger, mesmas outras sementes.
-- =====================================================================

create or replace function public.semear_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.perfis (id, email, nome, whatsapp)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nome',
    -- Nulo quando a conta nasce fora do /beta: lá o campo não existe, e
    -- string vazia no lugar de nulo só atrapalharia quem for filtrar.
    nullif(new.raw_user_meta_data->>'whatsapp', '')
  )
  on conflict (id) do nothing;

  insert into public.licencas (user_id, status) values (new.id, 'pendente')
  on conflict (user_id) do nothing;

  insert into public.configuracoes (user_id) values (new.id)
  on conflict do nothing;

  insert into public.marketplaces (user_id, nome, preco_fixo, taxa_percent)
  values (new.id, 'Venda Direta', 0, 0)
  on conflict do nothing;

  return new;
end $fn$;

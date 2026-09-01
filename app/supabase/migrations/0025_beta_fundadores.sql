-- =====================================================================
-- OS FUNDADORES — quem já entrou no lote, à vista de quem ainda decide
--
-- A página do beta passa a mostrar quem já garantiu vaga: primeiro nome e
-- inicial do sobrenome. É prova de que o lote é real e está andando — e é
-- o que substitui a promessa de exclusividade por um fato.
--
-- O recorte do nome é feito aqui, no banco, e não na tela: é a única forma
-- de a lista ser pública sem a tabela ser. O nome inteiro, o e-mail e o
-- WhatsApp continuam onde estavam, atrás do RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Sem security_invoker, como a vw_beta_vagas: a vista atravessa o RLS de
-- propósito para dar ao visitante deslogado esta lista, e só ela.
--
-- Aparece quem ocupa vaga de verdade — pagou, ou está dentro da reserva.
-- Quem deixou a reserva vencer sai da lista junto com a vaga.
-- ---------------------------------------------------------------------
create or replace view public.vw_beta_fundadores as
  select
    -- "Ana Paula Souza" -> "Ana Paula S." ; "Ana" -> "Ana"
    case
      when position(' ' in btrim(nome)) = 0 then btrim(nome)
      else
        substring(btrim(nome) from 1 for position(' ' in btrim(nome)) - 1)
        || ' '
        || upper(substring(regexp_replace(btrim(nome), '^.*\s', '') from 1 for 1))
        || '.'
    end as nome,
    criado_em
  from public.beta_candidatos
  where aprovado
    and (pago_em is not null or reservada_ate > now())
  order by criado_em;

grant select on public.vw_beta_fundadores to anon, authenticated;

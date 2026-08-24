-- =====================================================================
-- PREÇO E PROMOÇÕES — o valor do produto sai do env e vai para o banco
--
-- Até aqui o preço morava em NEXT_PUBLIC_PRECO_CENTAVOS. Trocar de preço
-- ou abrir uma promoção de fim de semana exigia mexer no ambiente e
-- publicar de novo — lento demais para uma decisão comercial, e com o
-- risco de o env do build e o do servidor discordarem.
--
-- Aqui vira uma linha única, editada pelo painel de administração.
--
-- Tudo em centavos inteiros, como no resto da camada comercial.
--
-- Duas coisas diferentes convivem na mesma linha:
--   • preco_centavos      — o preço de tabela, o "de";
--   • promo_*             — a promoção vigente, o "por".
-- Guardar o preço cheio em vez de sobrescrevê-lo é o que permite mostrar
-- "de R$ 34,90 por R$ 19,90" e voltar ao normal desligando um interruptor.
-- =====================================================================

create table if not exists public.precificacao (
  id                    boolean primary key default true check (id),
  preco_centavos        integer not null default 3490 check (preco_centavos > 0),
  comissao_centavos     integer not null default 1490 check (comissao_centavos >= 0),

  promo_ativa           boolean not null default false,
  promo_preco_centavos  integer check (promo_preco_centavos > 0),
  promo_rotulo          text,
  -- Janela opcional. Nulo dos dois lados = promoção manual, que começa e
  -- termina no interruptor. Preenchida, ela se acende e se apaga sozinha —
  -- ninguém precisa lembrar de desligar a oferta na segunda de manhã.
  promo_inicio          timestamptz,
  promo_fim             timestamptz,

  atualizado_em         timestamptz not null default now()
);

-- Nasce com o que o env já usava, para o preço não mudar na migração.
insert into public.precificacao (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- RLS — só o admin lê a tabela crua; ninguém escreve pelo navegador
-- A comissão do afiliado e as datas da promoção são informação interna.
-- Quem grava é a rota /api/admin/precos, no servidor, com a service_role.
-- ---------------------------------------------------------------------
alter table public.precificacao enable row level security;

drop policy if exists "precificacao_admin_le" on public.precificacao;
create policy "precificacao_admin_le" on public.precificacao for select
  to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------------
-- A vista pública — o que a página de vendas e o checkout precisam saber
--
-- Sem security_invoker: a view roda como dona e atravessa o RLS acima de
-- propósito. É ela que dá ao visitante deslogado o preço da vitrine, sem
-- abrir junto a comissão e o calendário da promoção.
--
-- `vigente` já vem resolvido aqui, e não em cada tela, porque a pergunta
-- "a promoção está valendo agora?" tem que ter uma resposta só: a página
-- de vendas, o botão de comprar e a cobrança no Mercado Pago não podem
-- discordar sobre quanto custa.
-- ---------------------------------------------------------------------
create or replace view public.vw_preco as
select
  case when promo_vale then p.promo_preco_centavos else p.preco_centavos end
                                                        as vigente_centavos,
  p.preco_centavos                                      as cheio_centavos,
  promo_vale                                            as em_promocao,
  case when promo_vale then p.promo_rotulo end          as promo_rotulo,
  case when promo_vale then p.promo_fim end             as promo_fim
from public.precificacao p
cross join lateral (
  select
    p.promo_ativa
    and p.promo_preco_centavos is not null
    and p.promo_preco_centavos < p.preco_centavos
    and (p.promo_inicio is null or now() >= p.promo_inicio)
    and (p.promo_fim    is null or now() <= p.promo_fim)
) as j(promo_vale)
where p.id;

grant select on public.vw_preco to anon, authenticated;

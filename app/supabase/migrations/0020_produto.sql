-- =====================================================================
-- CAMADA COMERCIAL — licenças, pagamentos, afiliados e comissões
--
-- Regras do negócio, gravadas aqui para não ficarem espalhadas no código:
--   • acesso vitalício, pagamento único de R$ 34,90;
--   • quem indica recebe R$ 14,90 por venda aprovada;
--   • o repasse ao afiliado é manual (Pix), então a comissão nasce
--     "a_pagar" e alguém marca como paga depois.
--
-- Todo valor em dinheiro é INTEGER em centavos. Nunca float: 0.1 + 0.2 em
-- ponto flutuante não dá 0.3, e isso vira divergência em conciliação.
--
-- Ninguém escreve nestas tabelas pelo navegador. Quem grava é o webhook do
-- Mercado Pago, no servidor, com a service_role (que ignora RLS). Por isso
-- as políticas abaixo são só de leitura: nem o comprador nem o afiliado
-- conseguem alterar o próprio status.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERFIS — dados da pessoa, que não cabem em auth.users
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  email      text,
  whatsapp   text,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ADMINS — quem enxerga o painel de repasses
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from public.admins where user_id = auth.uid());
$fn$;

-- ---------------------------------------------------------------------
-- AFILIADOS
-- O código é o que vai na URL (?ref=CODIGO). Curto, em caixa alta, sem
-- caracteres ambíguos — é lido em voz alta e digitado à mão.
-- ---------------------------------------------------------------------
create table if not exists public.afiliados (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  codigo            text not null unique,
  comissao_centavos integer not null default 1490 check (comissao_centavos >= 0),
  ativo             boolean not null default true,
  chave_pix         text,
  criado_em         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PAGAMENTOS — o espelho local do que aconteceu no Mercado Pago
-- mp_payment_id é unique de propósito: o Mercado Pago reenvia o mesmo
-- webhook várias vezes, e é esse unique que impede a compra de ser
-- contada (e a comissão de ser gerada) duas vezes.
-- ---------------------------------------------------------------------
create table if not exists public.pagamentos (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  email             text,
  valor_centavos    integer not null,
  status            text not null default 'pendente'
                    check (status in ('pendente','aprovado','recusado',
                                      'estornado','cancelado')),
  metodo            text,
  mp_preference_id  text,
  mp_payment_id     text unique,
  afiliado_id       uuid references public.afiliados(id) on delete set null,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index if not exists pagamentos_user_idx on public.pagamentos(user_id);
create index if not exists pagamentos_pref_idx on public.pagamentos(mp_preference_id);

-- ---------------------------------------------------------------------
-- LICENÇAS — a resposta para "esta pessoa pode usar o app?"
-- Uma por conta. `origem` separa quem pagou de quem você liberou na mão.
-- ---------------------------------------------------------------------
create table if not exists public.licencas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  status        text not null default 'pendente'
                check (status in ('pendente','ativa','cancelada')),
  origem        text not null default 'compra'
                check (origem in ('compra','cortesia')),
  pagamento_id  uuid references public.pagamentos(id) on delete set null,
  ativada_em    timestamptz,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COMISSÕES — uma por venda indicada, e só uma (unique no pagamento)
-- ---------------------------------------------------------------------
create table if not exists public.comissoes (
  id             uuid primary key default gen_random_uuid(),
  afiliado_id    uuid not null references public.afiliados(id) on delete cascade,
  pagamento_id   uuid not null unique references public.pagamentos(id) on delete cascade,
  valor_centavos integer not null,
  status         text not null default 'a_pagar'
                 check (status in ('a_pagar','pago','cancelado')),
  pago_em        timestamptz,
  observacao     text,
  criado_em      timestamptz not null default now()
);
create index if not exists comissoes_afiliado_idx on public.comissoes(afiliado_id, status);

-- =====================================================================
-- RLS — leitura do que é seu; escrita só pelo servidor
-- =====================================================================
alter table public.perfis     enable row level security;
alter table public.admins     enable row level security;
alter table public.afiliados  enable row level security;
alter table public.pagamentos enable row level security;
alter table public.licencas   enable row level security;
alter table public.comissoes  enable row level security;

drop policy if exists "perfil_proprio" on public.perfis;
create policy "perfil_proprio" on public.perfis for all
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin_le" on public.admins;
create policy "admin_le" on public.admins for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "afiliado_proprio" on public.afiliados;
create policy "afiliado_proprio" on public.afiliados for select
  to authenticated using (user_id = auth.uid() or public.eh_admin());

-- A chave Pix é o único campo que o afiliado precisa poder mudar sozinho.
drop policy if exists "afiliado_edita_pix" on public.afiliados;
create policy "afiliado_edita_pix" on public.afiliados for update
  to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pagamento_proprio" on public.pagamentos;
create policy "pagamento_proprio" on public.pagamentos for select
  to authenticated using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "licenca_propria" on public.licencas;
create policy "licenca_propria" on public.licencas for select
  to authenticated using (user_id = auth.uid() or public.eh_admin());

drop policy if exists "comissao_propria" on public.comissoes;
create policy "comissao_propria" on public.comissoes for select
  to authenticated using (
    public.eh_admin()
    or afiliado_id in (select id from public.afiliados where user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- Conta nova já nasce com perfil e licença pendente
-- Estende o trigger da 0018 em vez de criar um segundo.
-- ---------------------------------------------------------------------
create or replace function public.semear_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.perfis (id, email, nome)
  values (new.id, new.email, new.raw_user_meta_data->>'nome')
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

-- ---------------------------------------------------------------------
-- Resumo por afiliado — o que o painel de repasse mostra
-- ---------------------------------------------------------------------
create or replace view public.vw_afiliados_resumo
with (security_invoker = on) as
select
  a.id,
  a.user_id,
  a.codigo,
  a.chave_pix,
  a.ativo,
  p.nome,
  p.email,
  count(c.id) filter (where c.status <> 'cancelado')                     as vendas,
  coalesce(sum(c.valor_centavos) filter (where c.status = 'a_pagar'), 0) as a_pagar_centavos,
  coalesce(sum(c.valor_centavos) filter (where c.status = 'pago'), 0)    as pago_centavos
from public.afiliados a
left join public.perfis p    on p.id = a.user_id
left join public.comissoes c on c.afiliado_id = a.id
group by a.id, a.user_id, a.codigo, a.chave_pix, a.ativo, p.nome, p.email;

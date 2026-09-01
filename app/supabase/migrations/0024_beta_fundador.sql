-- =====================================================================
-- BETA FECHADO — o lote de fundador e o filtro de entrada
--
-- São 20 vagas de acesso vitalício a R$ 39,00 em troca de feedback em
-- duas semanas. A página /beta faz 5 perguntas fechadas, decide na hora
-- e manda quem passou para o pagamento.
--
-- Duas coisas moram aqui:
--   • beta_candidatos — quem se candidatou, o que respondeu e o veredito;
--   • vw_beta_vagas   — quantas vagas sobraram, para a barra da página.
--
-- As respostas ficam em jsonb porque o critério vai mudar: a intenção é
-- trocar a aprovação binária por pontuação com nota de corte. Colunas
-- fixas por pergunta virariam migração a cada ajuste do formulário.
-- =====================================================================

create table if not exists public.beta_candidatos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text not null,
  whatsapp      text not null,
  respostas     jsonb not null,
  aprovado      boolean not null,
  -- Quais perguntas barraram. Guardado para entender depois quem ficou de
  -- fora e por quê — o formulário nunca mostra isso a quem respondeu.
  barrou        text[] not null default '{}',
  -- A vaga do aprovado fica de pé por 24h; depois disso ela volta para o
  -- lote. Nulo em quem foi reprovado: não havia vaga para segurar.
  reservada_ate timestamptz,
  -- Preenchido quando a licença é liberada. Vaga paga não expira mais.
  pago_em       timestamptz,
  criado_em     timestamptz not null default now()
);

-- Uma candidatura por e-mail: reenviar o formulário é corrigir a resposta,
-- não ocupar uma segunda vaga do lote.
-- O e-mail é gravado sempre em minúsculas pela rota, e o índice é sobre a
-- coluna crua de propósito: é ele que o "on conflict (email)" do upsert usa.
create unique index if not exists beta_candidatos_email_idx
  on public.beta_candidatos (email);

create index if not exists beta_candidatos_vaga_idx
  on public.beta_candidatos (aprovado, reservada_ate);

-- ---------------------------------------------------------------------
-- RLS — ninguém lê nem escreve pelo navegador
--
-- Nome, e-mail e WhatsApp de todo mundo que se candidatou não podem sair
-- por uma chave pública. Quem grava é /api/beta, no servidor, com a
-- service_role; quem lê é o admin.
-- ---------------------------------------------------------------------
alter table public.beta_candidatos enable row level security;

drop policy if exists "beta_candidatos_admin_le" on public.beta_candidatos;
create policy "beta_candidatos_admin_le" on public.beta_candidatos for select
  to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------------
-- A vista pública — o número da barra de vagas
--
-- Sem security_invoker de propósito: ela atravessa o RLS acima para dar ao
-- visitante deslogado só a contagem, nunca as linhas.
--
-- Ocupa vaga quem foi aprovado e ou já pagou, ou ainda está dentro das
-- 24h de reserva. A reserva vencida devolve a vaga sozinha, sem faxina
-- agendada — a barra é o estado real do lote a cada consulta.
-- ---------------------------------------------------------------------
create or replace view public.vw_beta_vagas as
  select
    20::integer as total,
    count(*)::integer as ocupadas,
    greatest(20 - count(*), 0)::integer as restantes
  from public.beta_candidatos
  where aprovado
    and (pago_em is not null or reservada_ate > now());

grant select on public.vw_beta_vagas to anon, authenticated;

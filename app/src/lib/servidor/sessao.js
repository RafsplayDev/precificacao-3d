import "server-only";
import { db } from "./cf";

/**
 * Sessões próprias, guardadas no D1.
 *
 * O cookie leva um token aleatório de 32 bytes; o banco guarda só o
 * SHA-256 dele. Assim, quem ler a tabela `sessoes` não consegue se passar
 * por ninguém, e encerrar uma sessão é apagar uma linha.
 */
export const COOKIE_SESSAO = "dc_sessao";
const DIAS = 60;

export const opcoesCookie = (maxAge) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge,
});

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256(texto) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}

export function tokenAleatorio(bytes = 32) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return hex(b);
}

/** Cria a sessão e devolve { token, maxAge } para gravar no cookie. */
export async function criarSessao(userId) {
  const banco = await db();
  const token = tokenAleatorio();
  const maxAge = DIAS * 24 * 60 * 60;
  const expira = new Date(Date.now() + maxAge * 1000).toISOString();
  await banco
    .prepare("INSERT INTO sessoes (id_hash, user_id, expira_em) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, expira)
    .run();
  // Faxina barata: a cada login some o que já venceu.
  await banco.prepare("DELETE FROM sessoes WHERE expira_em < ?").bind(new Date().toISOString()).run();
  return { token, maxAge };
}

/**
 * Quem está logado nesta requisição, ou null.
 * `req` é o Request do route handler (NextRequest).
 */
export async function usuarioDaRequisicao(req) {
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const banco = await db();
  const linha = await banco
    .prepare(
      `SELECT u.id, u.email, u.nome, u.foto_url, u.admin
         FROM sessoes s JOIN usuarios u ON u.id = s.user_id
        WHERE s.id_hash = ? AND s.expira_em > ?`
    )
    .bind(await sha256(token), new Date().toISOString())
    .first();
  return linha ? { ...linha, admin: !!linha.admin } : null;
}

export async function encerrarSessao(req) {
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  if (!token) return;
  const banco = await db();
  await banco.prepare("DELETE FROM sessoes WHERE id_hash = ?").bind(await sha256(token)).run();
}

/**
 * O equivalente ao antigo trigger `semear_conta`: toda conta nasce com a
 * linha de configurações (sem ela a tarifa de energia fica indefinida e
 * todo custo sai errado) e com o canal "Venda Direta".
 */
export async function semearConta(userId) {
  const banco = await db();
  await banco.batch([
    banco.prepare("INSERT OR IGNORE INTO configuracoes (user_id) VALUES (?)").bind(userId),
    banco
      .prepare(
        `INSERT INTO marketplaces (id, user_id, nome, preco_fixo, taxa_percent)
         SELECT ?, ?, 'Venda Direta', 0, 0
          WHERE NOT EXISTS (SELECT 1 FROM marketplaces WHERE user_id = ?)`
      )
      .bind(crypto.randomUUID(), userId, userId),
  ]);
}

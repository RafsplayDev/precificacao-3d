import "server-only";
import { NextResponse } from "next/server";
import { db } from "./cf";
import { usuarioDaRequisicao } from "./sessao";
import { TABELAS, filtrarCampos, erroComoPostgres } from "./tabelas";

export const json = (dados, status = 200) => NextResponse.json(dados, { status });

/** Porteiro comum: devolve { user, banco, def } ou uma resposta de erro pronta. */
export async function abrir(req, tabela) {
  const user = await usuarioDaRequisicao(req);
  if (!user) return { resposta: json({ message: "Entre com sua conta Google." }, 401) };
  const def = tabela ? TABELAS[tabela] : null;
  if (tabela && !def) return { resposta: json({ message: "Tabela desconhecida." }, 404) };
  return { user, banco: await db(), def };
}

/** Lê uma linha da conta, no mesmo formato que a listagem devolve. */
export async function lerLinha(banco, tabela, userId, id) {
  if (TABELAS[tabela].unicaPorConta) {
    return banco.prepare(`SELECT user_id AS id, * FROM ${tabela} WHERE user_id = ?`).bind(userId).first();
  }
  return banco.prepare(`SELECT * FROM ${tabela} WHERE id = ? AND user_id = ?`).bind(id, userId).first();
}

/**
 * Confere que cada id apontado (produto_id, impressora_id…) é da mesma
 * conta. Sem isso, bastaria adivinhar o UUID de outra pessoa para pendurar
 * uma peça no produto dela.
 */
export async function conferirRefs(banco, tabela, userId, campos) {
  const refs = TABELAS[tabela].refs || {};
  for (const [coluna, alvo] of Object.entries(refs)) {
    const v = campos[coluna];
    if (v === undefined || v === null) continue;
    const achou = await banco.prepare(`SELECT 1 FROM ${alvo} WHERE id = ? AND user_id = ?`).bind(v, userId).first();
    if (!achou) return `Referência inválida em ${coluna}.`;
  }
  return null;
}

export function respostaDeErro(e) {
  const { code, message } = erroComoPostgres(e);
  return json({ code, message }, code ? 409 : 500);
}

export { TABELAS, filtrarCampos };

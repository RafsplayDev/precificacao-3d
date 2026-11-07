import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { ehTarefa, podeGerenciar } from "@/lib/servidor/anuncios";

export const dynamic = "force-dynamic";

const json = (d, s = 200) => NextResponse.json(d, { status: s });
const num = (v) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const txt = (v, max) => (v == null ? null : String(v).replace(/\s+/g, " ").trim().slice(0, max) || null);

/**
 * POST /api/anuncios/verificacoes   (Authorization: Bearer ANUNCIOS_TOKEN)
 *
 * { "verificacoes": [ {
 *     "origem_id": "shopee:123",
 *     "disponivel": true,           // false = esgotado/removido → sai da vitrine
 *     "estoque": 8,                 // quantidade disponível, se a loja mostrar
 *     "preco": 84.9,                // preço de agora (entra no histórico das medalhas)
 *     "preco_original": 119.9,
 *     "cupom_valido": false,        // false = o cupom salvo deixou de valer
 *     "cupom_codigo": "NOVO10",     // cupom novo encontrado (opcional)
 *     "cupom_descricao": "...", "cupom_validade": "2026-12-01",
 *     "preco_cupom": 76.41,          // preço final com o cupom aplicado (opcional)
 *     "observacao": "Estoque caiu de 30 para 8; cupom FILA10 expirou."
 * } ] }
 *
 * Cada item marca o produto como verificado agora, aplica o que mudou e
 * guarda a verificação no histórico (GET devolve esse histórico).
 */
export async function POST(req) {
  if (!(await ehTarefa(req))) return json({ message: "Token inválido." }, 401);
  const corpo = await req.json().catch(() => null);
  const lista = Array.isArray(corpo) ? corpo : corpo?.verificacoes;
  if (!Array.isArray(lista) || !lista.length) return json({ message: "Envie { verificacoes: [...] }." }, 400);
  if (lista.length > 100) return json({ message: "No máximo 100 verificações por chamada." }, 400);

  const banco = await db();
  const agora = new Date().toISOString();
  const stmts = [];
  const erros = [];
  let desativados = 0;

  for (const v of lista) {
    const origem = txt(v?.origem_id, 200);
    if (!origem) { erros.push("item sem origem_id"); continue; }
    const disponivel = v.disponivel === false || v.disponivel === 0 ? 0 : 1;
    const estoque = num(v.estoque);
    const preco = num(v.preco);
    const original = num(v.preco_original);
    const obs = txt(v.observacao, 300);
    const cupomOk = v.cupom_valido === false ? 0 : v.cupom_valido === true ? 1 : null;
    const novoCupom = txt(v.cupom_codigo, 40);
    const precoCupom = num(v.preco_cupom);

    const sets = ["verificado_em = ?", "atualizado_em = ?"];
    const vals = [agora, agora];
    if (obs) { sets.push("ultima_observacao = ?"); vals.push(obs); }
    if (estoque !== null) { sets.push("estoque = ?"); vals.push(Math.round(estoque)); }
    if (preco !== null) { sets.push("preco = ?"); vals.push(preco); }
    if (original !== null) { sets.push("preco_original = ?"); vals.push(original); }
    if (precoCupom !== null && cupomOk !== 0) { sets.push("preco_cupom = ?"); vals.push(precoCupom); }
    // Esgotado (disponível falso ou estoque zero): sai da vitrine na hora.
    if (!disponivel || estoque === 0) { sets.push("ativo = 0", "esgotado_em = ?"); vals.push(agora); desativados++; }
    else sets.push("esgotado_em = NULL");
    if (novoCupom) {
      sets.push("cupom_codigo = ?", "cupom_descricao = ?", "cupom_validade = ?");
      const val = v.cupom_validade ? new Date(v.cupom_validade) : null;
      vals.push(novoCupom.toUpperCase().replace(/\s+/g, ""), txt(v.cupom_descricao, 120), val && !isNaN(val) ? val.toISOString() : null);
      // Cupom novo sem o preço calculado: o preço com o cupom antigo não vale mais.
      if (precoCupom === null) sets.push("preco_cupom = NULL");
    } else if (cupomOk === 0) {
      sets.push("cupom_codigo = NULL", "cupom_descricao = NULL", "cupom_validade = NULL", "preco_cupom = NULL");
    }

    stmts.push(banco.prepare(`UPDATE anuncios SET ${sets.join(", ")} WHERE origem_id = ?`).bind(...vals, origem));
    if (preco !== null) {
      stmts.push(
        banco
          .prepare(
            `INSERT INTO precos_historico (origem_id, dia, preco) VALUES (?, date('now'), ?)
             ON CONFLICT(origem_id, dia) DO UPDATE SET preco = excluded.preco`
          )
          .bind(origem, preco)
      );
    }
    stmts.push(
      banco
        .prepare(
          `INSERT INTO verificacoes (origem_id, em, disponivel, estoque, preco, cupom_ok, observacao)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(origem, agora, disponivel, estoque, preco, novoCupom ? 1 : cupomOk, obs)
    );
  }

  if (stmts.length) await banco.batch(stmts);
  return json({ verificados: lista.length - erros.length, desativados, erros });
}

/** GET ?origem_id=...  — o histórico de verificações de um produto (token ou admin). */
export async function GET(req) {
  if (!(await podeGerenciar(req))) return json({ message: "Sem permissão." }, 403);
  const origem = new URL(req.url).searchParams.get("origem_id");
  if (!origem) return json({ message: "Informe origem_id." }, 400);
  const { results } = await (await db())
    .prepare("SELECT * FROM verificacoes WHERE origem_id = ? ORDER BY em DESC LIMIT 50")
    .bind(origem)
    .all();
  return json({ verificacoes: results });
}

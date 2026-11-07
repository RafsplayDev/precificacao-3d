import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { normalizarProduto, podeGerenciar, ehTarefa, paraVitrine, MAX_LOTE, CATEGORIAS } from "@/lib/servidor/anuncios";

export const dynamic = "force-dynamic";

const json = (d, s = 200, h = {}) => NextResponse.json(d, { status: s, headers: h });

/**
 * GET /api/anuncios?limite=4&categoria=filamentos
 *   Pública: sorteia anúncios ativos para a vitrine. O sorteio pesa a
 *   pontuação dada pela tarefa e a taxa de clique real (CTR), com um pouco
 *   de acaso para todo produto aparecer de vez em quando.
 *
 * GET /api/anuncios?todos=1   (token ou admin)
 *   Lista completa com métricas — é o que a tarefa lê para decidir o que
 *   manter, trocar ou desativar.
 */
export async function GET(req) {
  const banco = await db();
  const p = new URL(req.url).searchParams;

  if (p.get("todos")) {
    if (!(await podeGerenciar(req))) return json({ message: "Sem permissão." }, 403);
    const { results } = await banco.prepare("SELECT * FROM anuncios ORDER BY ativo DESC, pontuacao DESC").all();
    return json({ anuncios: results, categorias: CATEGORIAS });
  }

  const limite = Math.min(Math.max(Number(p.get("limite")) || 4, 1), 12);
  const categoria = p.get("categoria");
  const agora = new Date().toISOString();

  const filtros = ["ativo = 1", "(expira_em IS NULL OR expira_em > ?)"];
  const valores = [agora];
  if (categoria && CATEGORIAS.includes(categoria)) {
    filtros.push("categoria = ?");
    valores.push(categoria);
  }

  const { results } = await banco
    .prepare(
      `SELECT * FROM anuncios WHERE ${filtros.join(" AND ")}
        ORDER BY (pontuacao + 1)
               * (1 + 20.0 * (cliques + 1) / (impressoes + 100))
               * (0.35 + (ABS(RANDOM()) % 1000) / 1000.0) DESC
        LIMIT ?`
    )
    .bind(...valores, limite)
    .all();

  if (results.length) {
    const ids = results.map((a) => a.id);
    await banco
      .prepare(`UPDATE anuncios SET impressoes = impressoes + 1 WHERE id IN (${ids.map(() => "?").join(",")})`)
      .bind(...ids)
      .run();
  }

  return json({ anuncios: results.map(paraVitrine) }, 200, { "cache-control": "no-store" });
}

/**
 * POST /api/anuncios   (Authorization: Bearer ANUNCIOS_TOKEN)
 *
 * { "produtos": [ {...}, ... ], "desativar_ausentes": false }
 *
 * Grava em lote. Produto com `origem_id` já existente é atualizado (as
 * métricas de impressões/cliques são preservadas). Com
 * `desativar_ausentes: true`, todo anúncio ativo que não veio no lote é
 * desativado — útil quando a tarefa manda a vitrine completa a cada rodada.
 */
export async function POST(req) {
  if (!(await ehTarefa(req))) return json({ message: "Token inválido." }, 401);

  const corpo = await req.json().catch(() => null);
  const lista = Array.isArray(corpo) ? corpo : corpo?.produtos;
  if (!Array.isArray(lista) || !lista.length) return json({ message: "Envie { produtos: [...] }." }, 400);
  if (lista.length > MAX_LOTE) return json({ message: `No máximo ${MAX_LOTE} produtos por lote.` }, 400);

  const erros = [];
  const validos = [];
  for (const item of lista) {
    const r = normalizarProduto(item);
    if (r.erro) erros.push(r.erro);
    else validos.push({ linha: r.ok, enviados: r.enviados });
  }

  const banco = await db();
  const agora = new Date().toISOString();
  const stmts = validos.map(({ linha, enviados }) => {
    const cols = Object.keys(linha);
    return banco
      .prepare(
        `INSERT INTO anuncios (id, ${cols.join(", ")}, atualizado_em)
         VALUES (?, ${cols.map(() => "?").join(", ")}, ?)
         ON CONFLICT(origem_id) DO UPDATE SET
           ${enviados.map((c) => `${c} = excluded.${c}`).join(", ")},
           atualizado_em = excluded.atualizado_em`
      )
      .bind(crypto.randomUUID(), ...cols.map((c) => linha[c]), agora);
  });

  let desativados = 0;
  if (corpo?.desativar_ausentes && validos.length) {
    const ids = validos.map((v) => v.linha.origem_id);
    stmts.push(
      banco
        .prepare(
          `UPDATE anuncios SET ativo = 0, atualizado_em = ?
            WHERE ativo = 1 AND origem_id NOT IN (${ids.map(() => "?").join(",")})`
        )
        .bind(agora, ...ids)
    );
  }

  if (stmts.length) {
    const res = await banco.batch(stmts);
    if (corpo?.desativar_ausentes && validos.length) desativados = res[res.length - 1].meta?.changes || 0;
  }

  return json({ gravados: validos.length, desativados, erros }, erros.length && !validos.length ? 400 : 200);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { ehTarefa, VALIDADE_HORAS } from "@/lib/servidor/anuncios";

export const dynamic = "force-dynamic";

/**
 * GET /api/anuncios/verificar?limite=20   (Authorization: Bearer ANUNCIOS_TOKEN)
 *
 * A fila da verificação: os produtos conferidos há mais tempo primeiro
 * (os nunca conferidos no topo). Cada rodada da tarefa pega o seu lote,
 * confere e devolve em POST /api/anuncios/verificacoes — assim, rodando
 * várias vezes por dia, todo produto é revisto antes de vencer.
 */
export async function GET(req) {
  if (!(await ehTarefa(req))) return NextResponse.json({ message: "Token inválido." }, { status: 401 });
  const limite = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limite")) || 20, 1), 100);
  const banco = await db();
  const { results } = await banco
    .prepare(
      `SELECT origem_id, loja, titulo, url_produto, link_afiliado, preco, preco_original, estoque,
              cupom_codigo, cupom_descricao, cupom_validade, preco_cupom, ativo, verificado_em, ultima_observacao,
              ROUND((julianday('now') - julianday(verificado_em)) * 24, 1) AS horas_desde
         FROM anuncios
        WHERE ativo = 1 OR link_afiliado IS NULL
        ORDER BY verificado_em IS NOT NULL, verificado_em ASC
        LIMIT ?`
    )
    .bind(limite)
    .all();
  const { total } = await banco.prepare("SELECT COUNT(*) AS total FROM anuncios WHERE ativo = 1").first();
  return NextResponse.json({ validade_horas: VALIDADE_HORAS, ativos: total, verificar: results });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { normalizarProduto, podeGerenciar, ehTarefa, paraVitrine, MAX_LOTE, CATEGORIAS, LOJAS } from "@/lib/servidor/anuncios";
import { gerarLinkShopee, credenciaisShopee } from "@/lib/servidor/shopee";

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
    return json({
      anuncios: results,
      categorias: CATEGORIAS,
      lojas: Object.keys(LOJAS),
      shopee_api: !!(await credenciaisShopee()),
    });
  }

  const limite = Math.min(Math.max(Number(p.get("limite")) || 4, 1), 60);
  const categoria = p.get("categoria");
  const loja = p.get("loja");
  const ordem = p.get("ordem") || "destaque";
  const agora = new Date().toISOString();

  // Sem link de afiliado o anúncio não rende nada: fica guardado, fora da vitrine.
  const filtros = ["ativo = 1", "link_afiliado IS NOT NULL", "(expira_em IS NULL OR expira_em > ?)"];
  const valores = [agora];
  if (categoria && CATEGORIAS.includes(categoria)) {
    filtros.push("categoria = ?");
    valores.push(categoria);
  }
  if (loja && LOJAS[loja]) {
    filtros.push("loja = ?");
    valores.push(loja);
  }
  if (p.get("cupom")) {
    filtros.push("cupom_codigo IS NOT NULL AND (cupom_validade IS NULL OR cupom_validade > ?)");
    valores.push(agora);
  }

  // "destaque" é o sorteio ponderado (pontuação × CTR × acaso); as outras
  // ordens são para quem está procurando algo no catálogo.
  const ORDENS = {
    destaque: `(pontuacao + 1) * (1 + 20.0 * (cliques + 1) / (impressoes + 100))
               * (0.35 + (ABS(RANDOM()) % 1000) / 1000.0) DESC`,
    "menor-preco": "preco IS NULL, preco ASC",
    desconto: "(CASE WHEN preco_original > preco THEN 1 - preco / preco_original ELSE 0 END) DESC, pontuacao DESC",
    avaliacao: "avaliacao IS NULL, avaliacao DESC, num_avaliacoes DESC",
  };
  const ordenarPor = ORDENS[ordem] || ORDENS.destaque;

  const { results } = await banco
    .prepare(
      `SELECT * FROM anuncios WHERE ${filtros.join(" AND ")}
        ORDER BY ${ordenarPor}
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
 * métricas de impressões/cliques são preservadas, e só mudam os campos que
 * vieram). Com `desativar_ausentes: true`, todo anúncio ativo que não veio
 * no lote é desativado.
 *
 * Link de afiliado:
 *  • Shopee: mandando só `url_produto`, o servidor gera o link de afiliado
 *    pela Open API (precisa de SHOPEE_APP_ID/SHOPEE_APP_SECRET).
 *  • Mercado Livre: não há API de afiliados. Sem `link_afiliado`, o produto
 *    entra como pendente e você cola o link no /admin.
 * Os pendentes voltam em `pendentes_link`.
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

  // Shopee sem link de afiliado: gera pela API, um por um (são poucos por lote).
  const temShopeeApi = !!(await credenciaisShopee());
  for (const v of validos) {
    const l = v.linha;
    if (l.loja !== "shopee" || l.link_afiliado || !l.url_produto || !temShopeeApi) continue;
    try {
      l.link_afiliado = await gerarLinkShopee(l.url_produto);
      if (!v.enviados.includes("link_afiliado")) v.enviados.push("link_afiliado");
    } catch (e) {
      erros.push(`${l.origem_id}: não foi possível gerar o link da Shopee (${e.message})`);
    }
  }

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

  const desativar = corpo?.desativar_ausentes && validos.length;
  if (desativar) {
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

  let desativados = 0;
  if (stmts.length) {
    const res = await banco.batch(stmts);
    if (desativar) desativados = res[res.length - 1].meta?.changes || 0;
  }

  // O que ficou sem link — conferido no banco, porque o link pode ter sido
  // colado antes no /admin e preservado nesta atualização.
  let pendentes_link = [];
  if (validos.length) {
    const ids = validos.map((v) => v.linha.origem_id);
    const { results } = await banco
      .prepare(
        `SELECT origem_id, loja, titulo, url_produto FROM anuncios
          WHERE link_afiliado IS NULL AND origem_id IN (${ids.map(() => "?").join(",")})`
      )
      .bind(...ids)
      .all();
    pendentes_link = results;
  }

  return json(
    { gravados: validos.length, desativados, pendentes_link, erros },
    erros.length && !validos.length ? 400 : 200
  );
}

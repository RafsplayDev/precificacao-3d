import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { paraVitrine, VALIDADE_HORAS } from "@/lib/servidor/anuncios";
import { estatisticasHistorico, medalhaDe } from "@/lib/servidor/medalhas";
import { MARCAS_FILAMENTO, CORES } from "@/lib/catalogoBase";

export const dynamic = "force-dynamic";

/**
 * GET /api/anuncios/relacionados?texto=PETG Masterprint Branco&limite=1
 *
 * O achado que combina com o filamento que a pessoa está cadastrando.
 * Regras de combinação, nesta ordem de peso:
 *  • material: obrigatório e igual (PETG não casa com PLA; "Silk" conta);
 *  • marca: mesma marca vale muito;
 *  • cor: mesma cor vale; cor diferente explícita pesa contra.
 * Só entra o que passa de PONTOS_MINIMOS — melhor não mostrar nada do que
 * mostrar um filamento que a pessoa não usa.
 */
const PONTOS_MINIMOS = 6;
const MATERIAIS = ["silk", "petg", "pla", "abs", "asa", "tpu", "nylon"];
const norm = (s) => ` ${String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9+]+/g, " ")} `;
const tem = (t, palavra) => t.includes(` ${palavra} `);
const material = (t) => {
  if (tem(t, "silk")) return "pla silk";
  return MATERIAIS.find((m) => tem(t, m)) || null;
};
const marcas = MARCAS_FILAMENTO.map((m) => norm(m).trim());
const cores = CORES.map((c) => norm(c).trim());

function pontuar(busca, titulo) {
  const mb = material(busca);
  const mt = material(titulo);
  if (!mb || mb !== mt) return 0;
  let p = 5;
  const marca = marcas.find((m) => busca.includes(` ${m} `));
  if (marca) p += titulo.includes(` ${marca} `) ? 4 : -1;
  const cor = cores.find((c) => busca.includes(` ${c} `));
  if (cor) {
    if (titulo.includes(` ${cor} `)) p += 2;
    else if (cores.some((c) => titulo.includes(` ${c} `))) p -= 2;
  }
  return p;
}

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const busca = norm(p.get("texto"));
  const limite = Math.min(Math.max(Number(p.get("limite")) || 1, 1), 4);
  if (!material(busca)) return NextResponse.json({ anuncios: [] });

  const banco = await db();
  const validoDesde = new Date(Date.now() - VALIDADE_HORAS * 3600e3).toISOString();
  const { results } = await banco
    .prepare(
      `SELECT * FROM anuncios
        WHERE ativo = 1 AND link_afiliado IS NOT NULL AND categoria = 'filamentos'
          AND (expira_em IS NULL OR expira_em > ?) AND verificado_em > ?
        LIMIT 300`
    )
    .bind(new Date().toISOString(), validoDesde)
    .all();

  const melhores = results
    .map((a) => ({ a, pontos: pontuar(busca, norm(a.titulo)) }))
    .filter((x) => x.pontos >= PONTOS_MINIMOS)
    .sort((x, y) => y.pontos - x.pontos || (y.a.pontuacao || 0) - (x.a.pontuacao || 0))
    .slice(0, limite);

  const est = await estatisticasHistorico(banco, melhores.map((x) => x.a.origem_id));
  if (melhores.length) {
    await banco
      .prepare("UPDATE anuncios SET impressoes = impressoes + 1 WHERE id IN (SELECT value FROM json_each(?))")
      .bind(JSON.stringify(melhores.map((x) => x.a.id)))
      .run();
  }
  return NextResponse.json(
    { anuncios: melhores.map((x) => ({ ...paraVitrine(x.a, medalhaDe(x.a, est[x.a.origem_id])), combina: x.pontos >= 9 ? "exato" : "parecido" })) },
    { headers: { "cache-control": "no-store" } }
  );
}

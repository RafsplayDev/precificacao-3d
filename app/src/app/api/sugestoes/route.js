import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { usuarioDaRequisicao } from "@/lib/servidor/sessao";
import { IMPRESSORAS_BASE, MARCAS_FILAMENTO, MATERIAIS, CORES } from "@/lib/catalogoBase";

export const dynamic = "force-dynamic";

/**
 * GET /api/sugestoes?tipo=impressoras|filamentos
 *
 * As sugestões do cadastro: a base pronta (src/lib/catalogoBase.js) mais o
 * que as pessoas cadastram. Um nome só entra quando MIN_CONTAS contas
 * diferentes o usam — assim a lista aprende os modelos populares sem
 * expor o que alguém escreveu só para si ("Impressora do João").
 */
const MIN_CONTAS = 3;
const chave = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export async function GET(req) {
  const user = await usuarioDaRequisicao(req);
  if (!user) return NextResponse.json({ message: "Entre com sua conta Google." }, { status: 401 });
  const tipo = new URL(req.url).searchParams.get("tipo");
  const banco = await db();

  const agregado = async (tabela, coluna, extra = "") =>
    (await banco
      .prepare(
        `SELECT MAX(TRIM(${coluna})) AS valor, COUNT(DISTINCT user_id) AS contas ${extra}
           FROM ${tabela} WHERE ${coluna} IS NOT NULL AND TRIM(${coluna}) <> ''
          GROUP BY lower(TRIM(${coluna})) HAVING contas >= ? ORDER BY contas DESC LIMIT 150`
      )
      .bind(MIN_CONTAS)
      .all()).results;

  /** Junta a base com o agregado, somando a popularidade e ordenando por ela. */
  function juntar(base, vindos, montar) {
    const mapa = new Map();
    base.forEach((b, i) => mapa.set(chave(b.valor), { ...b, contas: 0, ordem: i }));
    for (const v of vindos) {
      const k = chave(v.valor);
      const atual = mapa.get(k);
      if (atual) atual.contas = v.contas;
      else mapa.set(k, { ...montar(v), contas: v.contas, ordem: 1000 });
    }
    return [...mapa.values()].sort((a, b) => b.contas - a.contas || a.ordem - b.ordem);
  }

  if (tipo === "impressoras") {
    const modelos = juntar(
      IMPRESSORAS_BASE.map((p) => ({ valor: `${p.marca} ${p.modelo}`, marca: p.marca, potencia_kw: p.potencia_kw })),
      await agregado("impressoras", "nome", ", MAX(TRIM(marca)) AS marca, ROUND(AVG(potencia_kw), 3) AS potencia_kw"),
      (v) => ({ valor: v.valor, marca: v.marca || null, potencia_kw: v.potencia_kw || null })
    );
    const marcas = juntar(
      [...new Set(IMPRESSORAS_BASE.map((p) => p.marca))].map((m) => ({ valor: m })),
      await agregado("impressoras", "marca"),
      (v) => ({ valor: v.valor })
    );
    return NextResponse.json({ modelos, marcas });
  }

  if (tipo === "filamentos") {
    const base = MATERIAIS.flatMap((m) => CORES.slice(0, 5).map((c) => ({ valor: `${m.nome} ${c}`, material: m.nome })));
    const nomes = juntar(base, await agregado("filamentos", "nome"), (v) => ({ valor: v.valor }));
    const marcas = juntar(MARCAS_FILAMENTO.map((m) => ({ valor: m })), await agregado("filamentos", "marca"), (v) => ({ valor: v.valor }));
    return NextResponse.json({ nomes, marcas });
  }

  return NextResponse.json({ message: "tipo deve ser impressoras ou filamentos" }, { status: 400 });
}

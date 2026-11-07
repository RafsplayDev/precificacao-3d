import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";
import { podeGerenciar, normalizarProduto } from "@/lib/servidor/anuncios";

export const dynamic = "force-dynamic";

const json = (d, s = 200) => NextResponse.json(d, { status: s });

/** PATCH { ativo, pontuacao, ... } — liga/desliga ou ajusta um anúncio (token ou admin). */
export async function PATCH(req, { params }) {
  if (!(await podeGerenciar(req))) return json({ message: "Sem permissão." }, 403);
  const { id } = await params;
  const banco = await db();
  const atual = await banco.prepare("SELECT * FROM anuncios WHERE id = ?").bind(id).first();
  if (!atual) return json({ message: "Anúncio não encontrado." }, 404);

  const corpo = await req.json().catch(() => ({}));
  let atributos = corpo.atributos;
  if (atributos === undefined && atual.atributos) {
    try { atributos = JSON.parse(atual.atributos); } catch { atributos = null; }
  }
  const r = normalizarProduto({ ...atual, ...corpo, atributos, ativo: corpo.ativo ?? !!atual.ativo });
  if (r.erro) return json({ message: r.erro }, 400);
  const { origem_id, ...campos } = r.ok;
  const cols = Object.keys(campos);
  await banco
    .prepare(`UPDATE anuncios SET ${cols.map((c) => `${c} = ?`).join(", ")}, atualizado_em = ? WHERE id = ?`)
    .bind(...cols.map((c) => campos[c]), new Date().toISOString(), id)
    .run();
  return json(await banco.prepare("SELECT * FROM anuncios WHERE id = ?").bind(id).first());
}

export async function DELETE(req, { params }) {
  if (!(await podeGerenciar(req))) return json({ message: "Sem permissão." }, 403);
  const { id } = await params;
  await (await db()).prepare("DELETE FROM anuncios WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

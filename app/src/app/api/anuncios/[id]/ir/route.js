import { NextResponse } from "next/server";
import { db } from "@/lib/servidor/cf";

export const dynamic = "force-dynamic";

/**
 * O clique no anúncio passa por aqui: conta o clique e redireciona para o
 * link de afiliado. Assim a vitrine sabe o que converte (CTR) e a tarefa
 * pode priorizar o que dá resultado.
 */
export async function GET(req, { params }) {
  const { id } = await params;
  const banco = await db();
  const a = await banco.prepare("SELECT link_afiliado FROM anuncios WHERE id = ?").bind(id).first();
  if (!a) return NextResponse.redirect(new URL("/", req.url));
  await banco.prepare("UPDATE anuncios SET cliques = cliques + 1 WHERE id = ?").bind(id).run();
  const res = NextResponse.redirect(a.link_afiliado, 302);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

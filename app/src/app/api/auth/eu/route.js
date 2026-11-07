import { NextResponse } from "next/server";
import { usuarioDaRequisicao } from "@/lib/servidor/sessao";

export const dynamic = "force-dynamic";

/** Quem está logado — o que o menu precisa para mostrar e-mail, foto e o link de admin. */
export async function GET(req) {
  const user = await usuarioDaRequisicao(req);
  return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
}

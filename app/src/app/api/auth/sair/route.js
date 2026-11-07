import { NextResponse } from "next/server";
import { COOKIE_SESSAO, encerrarSessao, opcoesCookie } from "@/lib/servidor/sessao";

export const dynamic = "force-dynamic";

export async function POST(req) {
  await encerrarSessao(req);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_SESSAO, "", opcoesCookie(0));
  return res;
}

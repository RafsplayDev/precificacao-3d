import { NextResponse } from "next/server";
import { COOKIE_OAUTH, credenciais, origemDoSite, urlRetorno, aleatorio, desafioPkce } from "@/lib/servidor/google";

export const dynamic = "force-dynamic";

/** Só caminho do próprio site: `proximo` vem da URL, que qualquer um monta. */
function interno(d) {
  return typeof d === "string" && d.startsWith("/") && !d.startsWith("//") ? d : "/";
}

/** Começa o login: guarda state + PKCE num cookie curto e manda para o Google. */
export async function GET(req) {
  const { id } = await credenciais();
  const origem = await origemDoSite(req);
  const proximo = interno(new URL(req.url).searchParams.get("proximo"));

  const state = aleatorio(24);
  const verificador = aleatorio(48);

  const destino = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  destino.search = new URLSearchParams({
    client_id: id,
    redirect_uri: urlRetorno(origem),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await desafioPkce(verificador),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  const res = NextResponse.redirect(destino);
  res.cookies.set(COOKIE_OAUTH, JSON.stringify({ state, verificador, proximo }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 600,
  });
  return res;
}

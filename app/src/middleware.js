import { NextResponse } from "next/server";

/**
 * Porteiro das telas.
 *
 * Sem plano pago, há só duas situações: com sessão (usa o app) e sem sessão
 * (vai para /entrar, com `proximo` para voltar ao lugar certo).
 *
 * Aqui só se olha se o cookie existe — o middleware não consulta o banco.
 * Quem garante de verdade é a API: /api/dados confere a sessão no D1 a cada
 * chamada, e com um cookie inválido a tela recebe 401 e volta para o login.
 */
const PUBLICAS = ["/entrar", "/privacidade", "/termos"];
const COOKIE_SESSAO = "dc_sessao";

const comeca = (caminho, lista) => lista.some((p) => caminho === p || caminho.startsWith(p + "/"));

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const logado = /^[0-9a-f]{64}$/.test(req.cookies.get(COOKIE_SESSAO)?.value || "");

  if (comeca(pathname, PUBLICAS)) {
    return logado && pathname === "/entrar"
      ? NextResponse.redirect(new URL("/", req.url))
      : NextResponse.next();
  }

  if (!logado) {
    const destino = new URL("/entrar", req.url);
    if (pathname !== "/") destino.searchParams.set("proximo", pathname);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tudo, menos /api (as rotas checam a sessão por conta própria) e arquivos estáticos.
    "/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};

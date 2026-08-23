import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/** Páginas que existem para quem ainda não pagou (ou nem tem conta). */
const PUBLICAS = ["/vendas", "/entrar", "/auth"];

/** Páginas que exigem login, mas não licença ativa. */
const SEM_LICENCA = ["/assinar", "/sair"];

const COOKIE_REF = "ref_afiliado";
const TRINTA_DIAS = 60 * 60 * 24 * 30;

function comeca(caminho, lista) {
  return lista.some((p) => caminho === p || caminho.startsWith(p + "/"));
}

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;
  let res = NextResponse.next({ request: req });

  // ------------------------------------------------------------------
  // Indicação do afiliado
  // Gravada aqui, no primeiro request, porque qualquer redirect adiante
  // descarta a query string — e com ela a única prova de quem indicou.
  // O primeiro link a chegar é o que vale: quem trouxe a pessoa foi ele,
  // e sobrescrever depois abriria espaço para roubo de indicação.
  // ------------------------------------------------------------------
  const ref = searchParams.get("ref");
  if (ref && !req.cookies.get(COOKIE_REF)) {
    res.cookies.set(COOKIE_REF, ref.trim().toUpperCase().slice(0, 32), {
      maxAge: TRINTA_DIAS,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser, não getSession: só o getUser valida o token contra o servidor
  // do Supabase. O getSession confia no cookie, que o próprio visitante
  // controla — daria para forjar um e entrar sem pagar.
  const { data: { user } } = await supabase.auth.getUser();

  if (comeca(pathname, PUBLICAS)) {
    // Quem já pagou não tem o que fazer na página de vendas.
    if (user && pathname.startsWith("/vendas")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return res;
  }

  if (!user) {
    const destino = new URL("/entrar", req.url);
    if (pathname !== "/") destino.searchParams.set("proximo", pathname);
    return NextResponse.redirect(destino);
  }

  if (comeca(pathname, SEM_LICENCA)) return res;

  const { data: licenca } = await supabase
    .from("licencas")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (licenca?.status !== "ativa") {
    // ------------------------------------------------------------------
    // O afiliado não é um cliente que ainda não pagou
    //
    // Quem divulga não precisa ter comprado, e mandar essa pessoa para a
    // tela de pagamento é dizer que ela não tem o que veio fazer aqui —
    // além de trancá-la fora da própria página, onde estão o link de
    // indicação e a chave Pix para receber. Ela ficava sem acesso ao que
    // é dela por direito.
    // ------------------------------------------------------------------
    const { data: afiliado } = await supabase
      .from("afiliados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (afiliado) {
      return pathname.startsWith("/afiliado")
        ? res
        : NextResponse.redirect(new URL("/afiliado", req.url));
    }

    return NextResponse.redirect(new URL("/assinar", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos:
     *  - /api      (o webhook do Mercado Pago não tem sessão e precisa passar;
     *               as demais rotas checam a licença por conta própria)
     *  - arquivos estáticos e imagens
     */
    "/((?!api|_next/static|_next/image|favicon.ico|brand|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};

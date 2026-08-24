import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Só caminho do próprio site. Igual ao `caminhoInterno` de lib/navegar, que
 * não dá para reaproveitar aqui: aquele arquivo é "use client" e importá-lo
 * numa rota de servidor o transformaria em referência de cliente.
 */
function interno(destino) {
  if (typeof destino !== "string") return "/";
  if (!destino.startsWith("/") || destino.startsWith("//")) return "/";
  return destino;
}

/**
 * Onde o link do e-mail de confirmação aterrissa.
 *
 * O cliente do navegador é o `createBrowserClient` do @supabase/ssr, que usa
 * o fluxo PKCE: o link não traz uma sessão pronta, traz um código de uso
 * único que precisa ser trocado por ela — e a troca tem que acontecer no
 * servidor, para a sessão nascer já em cookie e o middleware enxergá-la no
 * mesmo request. Sem esta rota o link levava a uma página que ignorava o
 * `?code=` e mandava a pessoa para o login de novo, como se nada tivesse
 * sido confirmado.
 *
 * Templates mais antigos do Supabase mandam `token_hash` + `type` em vez do
 * código. Os dois são aceitos aqui porque o formato depende de uma
 * configuração no painel, não do código deste app.
 */
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const proximo = interno(searchParams.get("proximo"));

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");

  const sb = supabaseServidor();
  let erro = null;

  if (code) {
    ({ error: erro } = await sb.auth.exchangeCodeForSession(code));
  } else if (tokenHash && tipo) {
    ({ error: erro } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo }));
  } else {
    erro = { message: "Link de confirmação incompleto." };
  }

  if (erro) {
    // Link já usado ou vencido. A pessoa precisa saber disso na tela de
    // entrar, e não cair num painel vazio sem entender o que houve.
    const destino = new URL("/entrar", origin);
    destino.searchParams.set("confirmacao", "falhou");
    return NextResponse.redirect(destino);
  }

  // Página inteira, com o cookie recém-gravado: o middleware decide entre o
  // painel e /assinar com a sessão já valendo.
  return NextResponse.redirect(new URL(proximo, origin));
}

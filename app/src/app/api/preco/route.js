import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabaseServer";
import { precoDe, lerPreco } from "@/lib/precos";

export const dynamic = "force-dynamic";

/**
 * O preço de quem está pedindo.
 *
 * Existe desde que o valor deixou de ser um só: quem tem vaga de fundador no
 * beta paga o preço do lote. A tela do paywall consultava `vw_preco` direto
 * do navegador, o que agora mostraria o preço de tabela a um fundador — e o
 * checkout cobraria outro valor, sem aviso.
 *
 * A vaga é resolvida aqui, no servidor, a partir do e-mail da sessão: pedir
 * o e-mail no corpo do request deixaria qualquer pessoa comprar pelo preço
 * de fundador digitando o e-mail de um.
 */
export async function GET() {
  const {
    data: { user },
  } = await supabaseServidor().auth.getUser();

  const preco = user?.email
    ? await precoDe(user.email)
    : { ...(await lerPreco()), fundador: false, reservada_ate: null };

  return NextResponse.json(preco, { headers: { "cache-control": "no-store" } });
}

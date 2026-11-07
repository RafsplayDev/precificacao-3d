import { NextResponse } from "next/server";
import { db, variavel } from "@/lib/servidor/cf";
import { COOKIE_SESSAO, criarSessao, semearConta, opcoesCookie } from "@/lib/servidor/sessao";

export const dynamic = "force-dynamic";

/**
 * Login de DESENVOLVIMENTO: entra como um usuário admin de teste, sem Google.
 *
 * Só existe quando DEV_LOGIN=1 está no .dev.vars (o arquivo do servidor
 * local, que o deploy não envia). Em produção a variável não existe e a
 * rota responde 404 — não há como ligá-la de fora.
 */
export async function GET(req) {
  if ((await variavel("DEV_LOGIN")) !== "1") return new NextResponse("Not found", { status: 404 });
  // A tela de entrar pergunta se o login de teste existe antes de mostrar o botão.
  if (new URL(req.url).searchParams.get("checar")) return NextResponse.json({ ativo: true });

  const banco = await db();
  const id = "dev-admin";
  await banco
    .prepare(
      `INSERT INTO usuarios (id, google_sub, email, nome, admin) VALUES (?, 'dev', 'dev@localhost', 'Teste local', 1)
       ON CONFLICT(id) DO UPDATE SET admin = 1`
    )
    .bind(id)
    .run();
  await semearConta(id);

  const { token, maxAge } = await criarSessao(id);
  const proximo = new URL(req.url).searchParams.get("proximo") || "/";
  const res = NextResponse.redirect(new URL(proximo.startsWith("/") ? proximo : "/", req.url));
  res.cookies.set(COOKIE_SESSAO, token, { ...opcoesCookie(maxAge), secure: false });
  return res;
}

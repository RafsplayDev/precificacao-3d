import { NextResponse } from "next/server";
import { db, variavel } from "@/lib/servidor/cf";
import { COOKIE_OAUTH, origemDoSite, trocarCodigo } from "@/lib/servidor/google";
import { COOKIE_SESSAO, criarSessao, semearConta, opcoesCookie } from "@/lib/servidor/sessao";

export const dynamic = "force-dynamic";

function falhou(origem, motivo) {
  console.error("[login google]", motivo);
  const destino = new URL("/entrar", origem);
  destino.searchParams.set("erro", "google");
  const res = NextResponse.redirect(destino);
  res.cookies.set(COOKIE_OAUTH, "", { path: "/api/auth", maxAge: 0 });
  return res;
}

/** E-mails que viram admin no login (lista separada por vírgula). */
async function ehAdmin(email) {
  const lista = String((await variavel("ADMIN_EMAILS")) || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return lista.includes(email);
}

export async function GET(req) {
  const origem = await origemDoSite(req);
  const url = new URL(req.url);

  if (url.searchParams.get("error")) return falhou(origem, url.searchParams.get("error"));

  let guardado;
  try {
    guardado = JSON.parse(req.cookies.get(COOKIE_OAUTH)?.value || "null");
  } catch {}
  const codigo = url.searchParams.get("code");
  if (!guardado || !codigo || url.searchParams.get("state") !== guardado.state) {
    return falhou(origem, "state ausente ou diferente (cookie expirou ou outra aba)");
  }

  let quem;
  try {
    quem = await trocarCodigo({ codigo, verificador: guardado.verificador, origem });
  } catch (e) {
    return falhou(origem, e.message);
  }

  const banco = await db();
  const admin = (await ehAdmin(quem.email)) ? 1 : 0;

  // 1) já entrou com esse Google antes; 2) conta importada do Supabase com o
  // mesmo e-mail, que é "adotada" agora; 3) conta nova.
  let user = await banco.prepare("SELECT id FROM usuarios WHERE google_sub = ?").bind(quem.sub).first();
  if (!user) {
    user = await banco
      .prepare("SELECT id FROM usuarios WHERE email = ? AND google_sub IS NULL")
      .bind(quem.email)
      .first();
  }
  const agora = new Date().toISOString();
  if (user) {
    await banco
      .prepare(
        `UPDATE usuarios SET google_sub = ?, email = ?, nome = COALESCE(?, nome), foto_url = ?,
                admin = MAX(admin, ?), ultimo_login = ? WHERE id = ?`
      )
      .bind(quem.sub, quem.email, quem.nome, quem.foto, admin, agora, user.id)
      .run();
  } else {
    user = { id: crypto.randomUUID() };
    try {
      await banco
        .prepare(
          `INSERT INTO usuarios (id, google_sub, email, nome, foto_url, admin, ultimo_login)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(user.id, quem.sub, quem.email, quem.nome, quem.foto, admin, agora)
        .run();
    } catch (e) {
      return falhou(origem, `não deu para criar a conta: ${e.message}`);
    }
  }
  await semearConta(user.id);

  const { token, maxAge } = await criarSessao(user.id);
  const res = NextResponse.redirect(new URL(guardado.proximo || "/", origem));
  res.cookies.set(COOKIE_SESSAO, token, opcoesCookie(maxAge));
  res.cookies.set(COOKIE_OAUTH, "", { path: "/api/auth", maxAge: 0 });
  return res;
}

import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Libera ou revoga acesso na mão.
 *
 * Serve para cortesia, para o próprio dono do sistema e para consertar uma
 * compra que travou. A licença fica com origem 'cortesia', separada de quem
 * pagou — misturar as duas estragaria qualquer contagem de vendas.
 */
export async function PATCH(req) {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }
  const { admin } = porteiro;

  const { email, acao } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ erro: "Informe o e-mail." }, { status: 400 });
  if (!["liberar", "revogar"].includes(acao)) {
    return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
  }

  const { data: perfil } = await admin
    .from("perfis")
    .select("id")
    .ilike("email", String(email).trim().toLowerCase())
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json({ erro: "Nenhuma conta com este e-mail." }, { status: 404 });
  }

  const campos =
    acao === "liberar"
      ? { status: "ativa", origem: "cortesia", ativada_em: new Date().toISOString() }
      : { status: "cancelada" };

  const { error } = await admin
    .from("licencas")
    .upsert({ user_id: perfil.id, ...campos }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ erro: "Não foi possível atualizar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

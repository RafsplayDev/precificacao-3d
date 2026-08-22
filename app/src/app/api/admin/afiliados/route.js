import { NextResponse } from "next/server";
import { exigirAdmin, gerarCodigo } from "@/lib/admin";
import { COMISSAO_CENTAVOS } from "@/lib/produto";

export const dynamic = "force-dynamic";

/** Convida alguém que já tem conta para ser afiliado. */
export async function POST(req) {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }
  const { admin } = porteiro;

  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ erro: "Informe o e-mail." }, { status: 400 });

  const alvo = String(email).trim().toLowerCase();

  const { data: perfil } = await admin
    .from("perfis")
    .select("id, nome, email")
    .ilike("email", alvo)
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json(
      { erro: "Ninguém com este e-mail tem conta ainda. Peça para se cadastrar primeiro." },
      { status: 404 }
    );
  }

  const { data: existente } = await admin
    .from("afiliados")
    .select("codigo")
    .eq("user_id", perfil.id)
    .maybeSingle();
  if (existente) {
    return NextResponse.json(
      { erro: `Esta pessoa já é afiliada (código ${existente.codigo}).` },
      { status: 409 }
    );
  }

  // O código é aleatório e unique; a colisão é improvável mas possível, e
  // aqui ela custa uma retentativa em vez de um erro na cara do usuário.
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const { data, error } = await admin
      .from("afiliados")
      .insert({
        user_id: perfil.id,
        codigo: gerarCodigo(),
        comissao_centavos: COMISSAO_CENTAVOS,
      })
      .select()
      .single();

    if (!error) return NextResponse.json({ afiliado: data });
    if (error.code !== "23505") {
      return NextResponse.json({ erro: "Não foi possível criar o afiliado." }, { status: 500 });
    }
  }

  return NextResponse.json({ erro: "Não foi possível gerar um código livre." }, { status: 500 });
}

/** Liga e desliga um afiliado sem apagar o histórico de comissões. */
export async function PATCH(req) {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }

  const { id, ativo } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ erro: "Falta o id." }, { status: 400 });

  const { error } = await porteiro.admin
    .from("afiliados")
    .update({ ativo: !!ativo })
    .eq("id", id);

  if (error) return NextResponse.json({ erro: "Não foi possível atualizar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { VAGAS, HORAS_DE_RESERVA, decidir, limparRespostas } from "@/lib/beta";

export const dynamic = "force-dynamic";

/**
 * Quantas vagas sobraram — o número da barra da página.
 *
 * Quando a consulta falha, devolve o lote cheio em vez de erro: a barra é
 * enfeite ao lado do formulário, e derrubar a candidatura inteira porque a
 * contagem não veio seria trocar uma informação por todas as outras.
 */
async function vagas() {
  try {
    const { data } = await supabaseAdmin().from("vw_beta_vagas").select("*").maybeSingle();
    const total = Number(data?.total) || VAGAS;
    const ocupadas = Math.max(0, Math.min(total, Number(data?.ocupadas) || 0));
    return { total, ocupadas, restantes: total - ocupadas };
  } catch {
    return { total: VAGAS, ocupadas: 0, restantes: VAGAS };
  }
}

/**
 * Quem já está dentro, na forma abreviada que a vista devolve.
 *
 * O recorte do nome é feito no banco (migração 0025): daqui não sai nome
 * inteiro nem contato, mesmo que a tela um dia peça.
 */
async function fundadores() {
  try {
    const { data } = await supabaseAdmin()
      .from("vw_beta_fundadores")
      .select("nome")
      .limit(20);
    return data || [];
  } catch {
    return [];
  }
}

export async function GET() {
  const [lote, lista] = await Promise.all([vagas(), fundadores()]);
  return NextResponse.json(
    { ...lote, fundadores: lista },
    { headers: { "cache-control": "no-store" } }
  );
}

function texto(v, limite) {
  return String(v ?? "").trim().slice(0, limite);
}

export async function POST(req) {
  let corpo;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const nome = texto(corpo?.nome, 120);
  const email = texto(corpo?.email, 200).toLowerCase();
  const whatsapp = texto(corpo?.whatsapp, 40);
  if (!nome || !email.includes("@") || whatsapp.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { erro: "Confira nome, e-mail e WhatsApp antes de enviar." },
      { status: 400 }
    );
  }

  // A decisão é refeita aqui, do zero. A tela também calcula, para responder
  // na hora, mas o que vale é este resultado: o corpo do request vem do
  // navegador e um "aprovado: true" escrito à mão não pode comprar uma vaga.
  const respostas = limparRespostas(corpo?.respostas);
  const { aprovado, incompleto, barrou } = decidir(respostas);
  if (incompleto) {
    return NextResponse.json({ erro: "Responda todas as perguntas." }, { status: 400 });
  }

  const lote = await vagas();
  // Lote cheio não vira reprovação: a pessoa passou no filtro, só chegou
  // depois das 20. Vai para a lista de espera com essa distinção registrada.
  const temVaga = lote.restantes > 0;
  const entra = aprovado && temVaga;

  const reservadaAte = entra
    ? new Date(Date.now() + HORAS_DE_RESERVA * 3600 * 1000).toISOString()
    : null;

  try {
    const { error } = await supabaseAdmin()
      .from("beta_candidatos")
      .upsert(
        {
          nome,
          email,
          whatsapp,
          respostas,
          aprovado: entra,
          barrou,
          reservada_ate: reservadaAte,
        },
        { onConflict: "email" }
      );
    if (error) throw error;
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível registrar sua resposta agora. Tente de novo em um minuto." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    aprovado: entra,
    // Separa "não é o seu momento" de "as 20 vagas acabaram" — são recusas
    // diferentes e a página fala de um jeito diferente em cada uma.
    lotado: aprovado && !temVaga,
    reservada_ate: reservadaAte,
    vagas: await vagas(),
  });
}

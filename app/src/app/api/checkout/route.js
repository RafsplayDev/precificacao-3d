import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { supabaseServidor, supabaseAdmin } from "@/lib/supabaseServer";
import { NOME_PRODUTO } from "@/lib/produto";
import { precoParaCobrar } from "@/lib/precos";

export const dynamic = "force-dynamic";

function urlBase(req) {
  // Em produção vem do env; no túnel de teste e no localhost, do próprio
  // request. O Mercado Pago exige URLs absolutas nos back_urls.
  const cfg = process.env.NEXT_PUBLIC_URL_SITE;
  if (cfg) return cfg.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export async function POST(req) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { erro: "Pagamento não configurado: falta MP_ACCESS_TOKEN." },
      { status: 500 }
    );
  }

  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  }

  const admin = supabaseAdmin();

  // O preço sai do banco na hora da cobrança, nunca do que a tela mandou.
  const precoCentavos = await precoParaCobrar();

  // Já pagou? Cobrar de novo por acesso vitalício seria cobrar duas vezes
  // pela mesma coisa.
  const { data: licenca } = await admin
    .from("licencas")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (licenca?.status === "ativa") {
    return NextResponse.json({ erro: "Seu acesso já está ativo." }, { status: 409 });
  }

  // ------------------------------------------------------------------
  // Quem indicou
  // O código chega pelo cookie que o middleware gravou. Só vale se existir
  // e estiver ativo — e nunca o do próprio comprador, senão bastaria usar o
  // próprio link para pagar R$ 34,90 e receber R$ 14,90 de volta.
  // ------------------------------------------------------------------
  let afiliadoId = null;
  const codigo = cookies().get("ref_afiliado")?.value;
  if (codigo) {
    const { data: af } = await admin
      .from("afiliados")
      .select("id, user_id, ativo")
      .eq("codigo", codigo.toUpperCase())
      .maybeSingle();
    if (af?.ativo && af.user_id !== user.id) afiliadoId = af.id;
  }

  const { data: pagamento, error: erroPagamento } = await admin
    .from("pagamentos")
    .insert({
      user_id: user.id,
      email: user.email,
      valor_centavos: precoCentavos,
      status: "pendente",
      afiliado_id: afiliadoId,
    })
    .select()
    .single();

  if (erroPagamento) {
    return NextResponse.json({ erro: "Não foi possível iniciar a compra." }, { status: 500 });
  }

  const base = urlBase(req);

  try {
    const mp = new MercadoPagoConfig({ accessToken: token });
    const pref = await new Preference(mp).create({
      body: {
        items: [
          {
            id: pagamento.id,
            title: NOME_PRODUTO,
            quantity: 1,
            currency_id: "BRL",
            unit_price: precoCentavos / 100,
          },
        ],
        // Sem payer: o Mercado Pago pergunta ao comprador quem ele é.
        //
        // Fixar o e-mail aqui parecia uma gentileza — um campo a menos para
        // digitar — mas amarra a cobrança a uma identidade que muitas vezes
        // não é a de quem está pagando: a pessoa se cadastrou no site com um
        // e-mail e paga com a conta do Mercado Pago de outro. Quando os dois
        // não batem, o checkout desabilita o botão Pagar sem explicar nada, e
        // a venda se perde em silêncio. A ligação entre o pagamento e a conta
        // aqui é o external_reference, não o e-mail, então nada se perde.
        // external_reference é o fio que liga o pagamento no Mercado Pago à
        // linha aqui. É por ele que o webhook sabe qual licença ativar.
        external_reference: pagamento.id,
        back_urls: {
          success: `${base}/assinar?retorno=sucesso`,
          pending: `${base}/assinar?retorno=pendente`,
          failure: `${base}/assinar?retorno=falha`,
        },
        auto_return: "approved",
        notification_url: `${base}/api/mp/webhook`,
        statement_descriptor: "PRECIFICACAO3D",
      },
    });

    await admin
      .from("pagamentos")
      .update({ mp_preference_id: pref.id, atualizado_em: new Date().toISOString() })
      .eq("id", pagamento.id);

    // sandbox_init_point só existe com credencial de teste; em produção é null.
    return NextResponse.json({ url: pref.init_point || pref.sandbox_init_point });
  } catch (e) {
    await admin
      .from("pagamentos")
      .update({ status: "cancelado", atualizado_em: new Date().toISOString() })
      .eq("id", pagamento.id);
    console.error("[checkout] Mercado Pago recusou a preferência:", e);
    return NextResponse.json(
      { erro: "O Mercado Pago não aceitou a cobrança. Tente novamente em instantes." },
      { status: 502 }
    );
  }
}

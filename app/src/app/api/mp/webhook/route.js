import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { COMISSAO_CENTAVOS } from "@/lib/produto";

export const dynamic = "force-dynamic";

/**
 * Confere a assinatura do Mercado Pago.
 *
 * Este endpoint é público — precisa ser, o Mercado Pago não faz login. Sem
 * esta checagem, qualquer pessoa poderia dar um POST aqui dizendo "pagamento
 * aprovado" e liberar o acesso de graça. O manifesto é montado exatamente na
 * ordem que a documentação define; qualquer campo fora de lugar muda o hash.
 */
function assinaturaConfere(req, idRecurso) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) return { ok: false, motivo: "MP_WEBHOOK_SECRET não configurado" };

  const assinatura = req.headers.get("x-signature");
  const idRequisicao = req.headers.get("x-request-id");
  if (!assinatura) return { ok: false, motivo: "sem x-signature" };

  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return { ok: false, motivo: "x-signature incompleto" };

  const manifesto =
    `id:${String(idRecurso).toLowerCase()};` +
    (idRequisicao ? `request-id:${idRequisicao};` : "") +
    `ts:${ts};`;

  const esperado = crypto.createHmac("sha256", segredo).update(manifesto).digest("hex");

  // timingSafeEqual em vez de === : a comparação normal termina no primeiro
  // byte diferente, e esse tempo vaza o hash correto byte a byte.
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, motivo: "assinatura não confere" };
  }
  return { ok: true };
}

/** Vocabulário do Mercado Pago traduzido para o check da tabela pagamentos. */
function traduzirStatus(mp) {
  switch (mp) {
    case "approved":
      return "aprovado";
    case "rejected":
      return "recusado";
    case "refunded":
    case "charged_back":
      return "estornado";
    case "cancelled":
      return "cancelado";
    default:
      return "pendente"; // in_process, in_mediation, authorized, pending
  }
}

export async function POST(req) {
  let corpo = {};
  try {
    corpo = await req.json();
  } catch {}

  const tipo = corpo?.type || corpo?.topic;
  const idPagamento = corpo?.data?.id || corpo?.resource;

  // O Mercado Pago manda vários tipos de aviso no mesmo endpoint.
  if (tipo !== "payment" || !idPagamento) {
    return NextResponse.json({ ignorado: true });
  }

  const conferencia = assinaturaConfere(req, idPagamento);
  if (!conferencia.ok) {
    console.warn("[webhook] recusado:", conferencia.motivo);
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ erro: "sem token" }, { status: 500 });

  // O corpo do aviso só traz o id. O estado real do pagamento é buscado na
  // API — o que chega pela rede nunca é a fonte da verdade sobre dinheiro.
  let pago;
  try {
    const mp = new MercadoPagoConfig({ accessToken: token });
    pago = await new Payment(mp).get({ id: idPagamento });
  } catch (e) {
    console.error("[webhook] falha ao consultar o pagamento:", e);
    // 500 faz o Mercado Pago tentar de novo mais tarde, que é o desejado
    // quando a falha é nossa (rede, indisponibilidade).
    return NextResponse.json({ erro: "consulta falhou" }, { status: 500 });
  }

  const referencia = pago.external_reference;
  if (!referencia) return NextResponse.json({ ignorado: true });

  const admin = supabaseAdmin();
  const status = traduzirStatus(pago.status);

  const { data: pagamento, error } = await admin
    .from("pagamentos")
    .update({
      status,
      metodo: pago.payment_method_id || null,
      mp_payment_id: String(pago.id),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", referencia)
    .select()
    .single();

  if (error || !pagamento) {
    console.error("[webhook] pagamento não encontrado:", referencia, error);
    return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
  }

  if (status === "aprovado" && pagamento.user_id) {
    await admin
      .from("licencas")
      .update({
        status: "ativa",
        origem: "compra",
        pagamento_id: pagamento.id,
        ativada_em: new Date().toISOString(),
      })
      .eq("user_id", pagamento.user_id);

    if (pagamento.afiliado_id) {
      const { data: af } = await admin
        .from("afiliados")
        .select("comissao_centavos")
        .eq("id", pagamento.afiliado_id)
        .maybeSingle();

      // O Mercado Pago reenvia o mesmo aviso várias vezes. O unique em
      // comissoes.pagamento_id transforma a repetição em conflito, e o
      // ignoreDuplicates faz dela um silêncio em vez de um erro — é o que
      // impede a mesma venda de gerar duas comissões.
      await admin.from("comissoes").upsert(
        {
          afiliado_id: pagamento.afiliado_id,
          pagamento_id: pagamento.id,
          valor_centavos: af?.comissao_centavos ?? COMISSAO_CENTAVOS,
          status: "a_pagar",
        },
        { onConflict: "pagamento_id", ignoreDuplicates: true }
      );
    }
  }

  if (status === "estornado" && pagamento.user_id) {
    // Devolveu o dinheiro, perde o acesso — e a comissão daquela venda cai
    // junto, para não repassar Pix de uma venda que não existe mais.
    await admin
      .from("licencas")
      .update({ status: "cancelada" })
      .eq("user_id", pagamento.user_id);

    await admin
      .from("comissoes")
      .update({ status: "cancelado", observacao: "Compra estornada." })
      .eq("pagamento_id", pagamento.id)
      .eq("status", "a_pagar");
  }

  return NextResponse.json({ ok: true });
}

// O Mercado Pago às vezes valida o endpoint com um GET antes de usá-lo.
export async function GET() {
  return NextResponse.json({ ok: true });
}

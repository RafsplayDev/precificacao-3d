import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { lerComissao } from "@/lib/precos";

export const dynamic = "force-dynamic";

/**
 * Confere a assinatura do Mercado Pago.
 *
 * Este endpoint é público — precisa ser, o Mercado Pago não faz login. Sem
 * esta checagem, qualquer pessoa poderia dar um POST aqui dizendo "pagamento
 * aprovado" e liberar o acesso de graça.
 *
 * O manifesto assinado varia conforme a origem do aviso: o id pode ser o da
 * query string ou o do corpo, e o request-id às vezes não entra na conta.
 * Como não dá para saber de fora qual combinação o Mercado Pago usou, todas
 * as plausíveis são testadas. Isso não afrouxa nada: cada tentativa continua
 * exigindo o HMAC correto do segredo, que só o Mercado Pago tem. Sem ele
 * nenhuma combinação fecha, e um forjador não ganha nada com a variedade.
 */
function assinaturaConfere(req, ids) {
  // Duas chaves porque o Mercado Pago tem uma por modo (teste e produção), e
  // nem todo aviso vem assinado com a que está no painel de webhooks: o que
  // nasce do notification_url da preferência pode usar a outra. Aceitar as
  // duas evita ficar trocando a variável no escuro para descobrir qual é.
  const segredos = [
    ["principal", process.env.MP_WEBHOOK_SECRET],
    ["alternativo", process.env.MP_WEBHOOK_SECRET_2],
  ].filter(([, v]) => v);

  if (!segredos.length) return { ok: false, motivo: "MP_WEBHOOK_SECRET não configurado" };

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

  const recebido = Buffer.from(v1, "hex");

  const candidatos = [];
  for (const id of [...new Set(ids.filter(Boolean).map(String))]) {
    for (const comRequestId of idRequisicao ? [true, false] : [false]) {
      candidatos.push({
        rotulo: `id=${id}${comRequestId ? "+request-id" : ""}`,
        manifesto:
          `id:${id.toLowerCase()};` +
          (comRequestId ? `request-id:${idRequisicao};` : "") +
          `ts:${ts};`,
      });
    }
  }

  for (const [nome, segredo] of segredos) {
    for (const c of candidatos) {
      const esperado = crypto.createHmac("sha256", segredo).update(c.manifesto).digest("hex");
      const a = Buffer.from(esperado, "hex");
      // timingSafeEqual em vez de === : a comparação normal termina no primeiro
      // byte diferente, e esse tempo vaza o hash correto byte a byte.
      if (a.length === recebido.length && crypto.timingSafeEqual(a, recebido)) {
        return { ok: true, rotulo: `${c.rotulo} (segredo ${nome})` };
      }
    }
  }

  // Nenhuma fechou. Os rótulos e os primeiros bytes dos hashes vão para o log
  // porque é com eles que se descobre a causa: se um dos candidatos chegasse
  // perto, seria formato; nenhum chegando perto aponta para o segredo trocado.
  // O segredo em si nunca aparece, e prefixo de hash não o revela.
  return {
    ok: false,
    motivo: "assinatura não confere",
    detalhe:
      `tentou [${candidatos.map((c) => c.rotulo).join(", ")}]` +
      ` com ${segredos.length} segredo(s)` +
      ` | v1 recebido: ${v1.slice(0, 8)}…`,
  };
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

  // ------------------------------------------------------------------
  // De onde sai o id
  //
  // A assinatura do Mercado Pago é calculada sobre o `data.id` da QUERY
  // STRING, não sobre o que vem no corpo. Os dois costumam ser o mesmo
  // número, mas no formato antigo (IPN) o corpo traz `resource` como uma
  // URL inteira — e aí o manifesto sai diferente do que foi assinado, e
  // todo aviso é recusado com "assinatura não confere". Por isso a query
  // manda, e o corpo é só o plano B.
  // ------------------------------------------------------------------
  const idPagamento =
    req.nextUrl.searchParams.get("data.id") ||
    req.nextUrl.searchParams.get("id") ||
    corpo?.data?.id ||
    null;

  // O Mercado Pago manda vários tipos de aviso no mesmo endpoint.
  if (tipo !== "payment" || !idPagamento) {
    return NextResponse.json({ ignorado: true });
  }

  // ------------------------------------------------------------------
  // Duas provas de autenticidade, não uma
  //
  // A assinatura é a prova preferida. Quando ela fecha, o aviso segue em
  // frente. Quando não fecha, o aviso não é descartado: passa a valer
  // apenas como um palpite de id, e quem decide é a API do Mercado Pago,
  // consultada logo abaixo com o nosso Access Token.
  //
  // Isso é seguro porque nada do corpo da requisição é aproveitado — nem o
  // status, nem o valor, nem a referência. Só o id, e ainda assim como
  // pergunta, não como resposta. Para conseguir alguma coisa, um forjador
  // teria que acertar o id de um pagamento que já é seu e que o Mercado
  // Pago já confirma como aprovado; nesse caso, ativar a licença é
  // exatamente o comportamento correto.
  //
  // O motivo de existir esse segundo caminho: os avisos reais chegavam com
  // assinatura que não fechava com nenhuma das chaves do painel, enquanto o
  // simulador passava. O resultado era um cliente pagando e não recebendo o
  // acesso — a pior falha possível aqui — por causa de um detalhe de
  // formato de assinatura.
  // ------------------------------------------------------------------
  const conferencia = assinaturaConfere(req, [idPagamento, corpo?.data?.id]);
  if (conferencia.ok) {
    console.log("[webhook] assinatura ok:", conferencia.rotulo, "| id:", idPagamento);
  } else {
    console.warn(
      "[webhook] sem assinatura válida, confirmando na API:",
      conferencia.motivo,
      conferencia.detalhe || ""
    );
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
    // O objeto de erro do SDK não imprime nada de útil quando cai no log:
    // sai "[object Object]" e o motivo se perde. Os campos que importam são
    // extraídos à mão.
    const status = e?.status || e?.statusCode || null;
    console.error(
      "[webhook] falha ao consultar o pagamento:",
      "| id:", idPagamento,
      "| status:", status ?? "(sem status)",
      "| mensagem:", e?.message || String(e)
    );

    // 404 não é falha nossa: esse id não é de um pagamento (costuma ser de
    // um merchant_order, que chega no mesmo endpoint). Insistir não muda o
    // resultado, então responde 200 para o Mercado Pago parar de reenviar —
    // um aviso que nunca vai dar em nada não deve ficar em fila para sempre.
    if (status === 404) {
      return NextResponse.json({ ignorado: "id não é de um pagamento" });
    }

    // Nos demais casos o 500 é proposital: faz o Mercado Pago tentar de novo
    // mais tarde, que é o certo quando a falha é nossa (rede, fora do ar).
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
          valor_centavos: af?.comissao_centavos ?? (await lerComissao()),
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

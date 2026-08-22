import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Marca comissões como pagas (ou cancela).
 *
 * O repasse em si acontece fora daqui — você faz o Pix pelo banco. Esta
 * rota só registra que ele aconteceu, para a comissão sair do "a pagar".
 */
export async function PATCH(req) {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }
  const { admin } = porteiro;

  const { afiliado_id, ids, acao, observacao } = await req.json().catch(() => ({}));
  if (!["pagar", "cancelar"].includes(acao)) {
    return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
  }

  const campos =
    acao === "pagar"
      ? { status: "pago", pago_em: new Date().toISOString(), observacao: observacao || null }
      : { status: "cancelado", observacao: observacao || null };

  // Só mexe no que está "a_pagar": sem isso, um segundo clique reescreveria
  // a data de um repasse já feito, ou ressuscitaria um cancelamento.
  let q = admin.from("comissoes").update(campos).eq("status", "a_pagar");

  if (Array.isArray(ids) && ids.length) {
    q = q.in("id", ids);
  } else if (afiliado_id) {
    // Quitar tudo de um afiliado de uma vez — o caso comum, já que o Pix
    // sai somado.
    q = q.eq("afiliado_id", afiliado_id);
  } else {
    return NextResponse.json({ erro: "Informe ids ou afiliado_id." }, { status: 400 });
  }

  const { data, error } = await q.select("id");
  if (error) {
    return NextResponse.json({ erro: "Não foi possível atualizar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, atualizadas: data?.length || 0 });
}

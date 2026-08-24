import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/admin";
import { centavosDeTexto } from "@/lib/produto";

export const dynamic = "force-dynamic";

/** A linha crua da precificação, para o painel preencher o formulário. */
export async function GET() {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }

  const { data, error } = await porteiro.admin
    .from("precificacao")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ erro: "Não foi possível ler a precificação." }, { status: 500 });
  }
  return NextResponse.json({ precificacao: data });
}

/**
 * Salva preço e promoção.
 *
 * A validação é feita aqui, e não só no formulário: esta rota é alcançável
 * por um PATCH direto, e um preço zerado ou uma "promoção" mais cara que o
 * preço de tabela passariam batidos se a única barreira fosse a tela.
 */
export async function PATCH(req) {
  const porteiro = await exigirAdmin();
  if (porteiro.erro) {
    return NextResponse.json({ erro: porteiro.erro }, { status: porteiro.status });
  }

  const corpo = await req.json().catch(() => ({}));

  const preco = centavosDeTexto(corpo.preco);
  if (!preco) {
    return NextResponse.json({ erro: "Informe um preço válido." }, { status: 400 });
  }

  const comissao =
    corpo.comissao === "" || corpo.comissao == null ? 0 : centavosDeTexto(corpo.comissao) ?? 0;
  if (comissao > preco) {
    return NextResponse.json(
      { erro: "A comissão não pode ser maior que o preço da venda." },
      { status: 400 }
    );
  }

  const promoAtiva = !!corpo.promo_ativa;
  const promoPreco = centavosDeTexto(corpo.promo_preco);

  if (promoAtiva) {
    if (!promoPreco) {
      return NextResponse.json(
        { erro: "Para ligar a promoção, informe o preço promocional." },
        { status: 400 }
      );
    }
    if (promoPreco >= preco) {
      return NextResponse.json(
        { erro: "O preço promocional precisa ser menor que o preço normal." },
        { status: 400 }
      );
    }
  }

  // Datas vêm do <input type="datetime-local">, que manda hora local sem
  // fuso. new Date() a interpreta no fuso do navegador do admin, que é o
  // mesmo do público — é o que faz "sexta às 18h" significar sexta às 18h.
  const quando = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const inicio = quando(corpo.promo_inicio);
  const fim = quando(corpo.promo_fim);

  if (inicio && fim && new Date(fim) <= new Date(inicio)) {
    return NextResponse.json(
      { erro: "O fim da promoção precisa ser depois do início." },
      { status: 400 }
    );
  }

  const { data, error } = await porteiro.admin
    .from("precificacao")
    .upsert(
      {
        id: true,
        preco_centavos: preco,
        comissao_centavos: comissao,
        promo_ativa: promoAtiva,
        promo_preco_centavos: promoPreco,
        promo_rotulo: String(corpo.promo_rotulo || "").trim() || null,
        promo_inicio: inicio,
        promo_fim: fim,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ erro: "Não foi possível salvar." }, { status: 500 });
  }
  return NextResponse.json({ precificacao: data });
}

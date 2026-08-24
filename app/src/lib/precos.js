import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  PRECO_CENTAVOS,
  COMISSAO_CENTAVOS,
  PRECO_PADRAO,
  normalizarPreco,
} from "@/lib/produto";

/**
 * Preço e comissão vigentes, do lado do servidor.
 *
 * Separado de produto.js porque este arquivo fala com o banco: importá-lo de
 * um componente "use client" arrastaria a service_role para o navegador.
 *
 * Quando a consulta falha o valor do env assume. É deliberado: sem isso, uma
 * instabilidade do banco derrubaria a página de vendas e o botão de comprar
 * junto, e um preço levemente desatualizado é melhor do que nenhuma venda.
 */
export async function lerPreco() {
  try {
    const { data } = await supabaseAdmin()
      .from("vw_preco")
      .select("*")
      .maybeSingle();
    return normalizarPreco(data);
  } catch {
    return PRECO_PADRAO;
  }
}

/** Quanto o afiliado recebe por venda, para afiliados novos. */
export async function lerComissao() {
  try {
    const { data } = await supabaseAdmin()
      .from("precificacao")
      .select("comissao_centavos")
      .maybeSingle();
    return Number(data?.comissao_centavos) || COMISSAO_CENTAVOS;
  } catch {
    return COMISSAO_CENTAVOS;
  }
}

/**
 * O preço que vai ser cobrado de fato.
 *
 * O checkout não pode confiar no número que a tela mostrou: entre abrir a
 * página e clicar em comprar, a promoção pode ter acabado — e, pior, o valor
 * poderia vir do corpo do request, onde qualquer um o escreveria. Este é o
 * único lugar de onde sai o `unit_price` da cobrança.
 */
export async function precoParaCobrar() {
  const preco = await lerPreco();
  return Number(preco.vigente_centavos) || PRECO_CENTAVOS;
}

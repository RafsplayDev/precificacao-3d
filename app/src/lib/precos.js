import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  PRECO_CENTAVOS,
  COMISSAO_CENTAVOS,
  PRECO_PADRAO,
  normalizarPreco,
} from "@/lib/produto";
import { PRECO_FUNDADOR_CENTAVOS } from "@/lib/beta";

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
 * A vaga de fundador de um e-mail, se ela existir e ainda estiver de pé.
 *
 * "De pé" é: aprovado no filtro do beta e ou já pago, ou dentro das 24h de
 * reserva. Quem passou no filtro e deixou a reserva vencer perdeu o preço de
 * fundador, não o direito de comprar — volta a ser um cliente comum.
 *
 * O e-mail é o fio entre as duas pontas: a candidatura acontece antes de a
 * conta existir, e é com o mesmo e-mail que a pessoa se cadastra para pagar.
 */
export async function vagaDeFundador(email) {
  const chave = String(email || "").trim().toLowerCase();
  if (!chave) return null;
  try {
    const { data } = await supabaseAdmin()
      .from("beta_candidatos")
      .select("reservada_ate, pago_em")
      .eq("email", chave)
      .eq("aprovado", true)
      .maybeSingle();
    if (!data) return null;
    const valendo =
      Boolean(data.pago_em) ||
      (data.reservada_ate && new Date(data.reservada_ate) > new Date());
    return valendo ? data : null;
  } catch {
    // Banco fora do ar não vira desconto nem bloqueio: o preço de tabela
    // assume, como no resto deste arquivo.
    return null;
  }
}

/**
 * O preço de uma pessoa específica, já resolvido — é o que a tela mostra.
 *
 * Existe porque o valor deixou de ser único: quem tem vaga de fundador paga
 * {@link PRECO_FUNDADOR_CENTAVOS}, e o resto paga a tabela. Uma tela que
 * consultasse `vw_preco` por conta própria mostraria o preço errado para
 * metade das pessoas.
 */
export async function precoDe(email) {
  const preco = await lerPreco();
  const vaga = await vagaDeFundador(email);
  if (!vaga) return { ...preco, fundador: false, reservada_ate: null };

  return {
    ...preco,
    vigente_centavos: PRECO_FUNDADOR_CENTAVOS,
    // O "de" é o preço de tabela cheio, não o promocional: é dele que o
    // fundador está saindo.
    cheio_centavos: Math.max(preco.cheio_centavos, PRECO_FUNDADOR_CENTAVOS),
    em_promocao: preco.cheio_centavos > PRECO_FUNDADOR_CENTAVOS,
    promo_rotulo: "Lote de fundador",
    promo_fim: null,
    fundador: true,
    reservada_ate: vaga.reservada_ate || null,
  };
}

/**
 * O preço que vai ser cobrado de fato.
 *
 * O checkout não pode confiar no número que a tela mostrou: entre abrir a
 * página e clicar em comprar, a promoção pode ter acabado ou a reserva de
 * fundador pode ter vencido — e, pior, o valor poderia vir do corpo do
 * request, onde qualquer um o escreveria. Este é o único lugar de onde sai o
 * `unit_price` da cobrança.
 */
export async function precoParaCobrar(email) {
  if (await vagaDeFundador(email)) return PRECO_FUNDADOR_CENTAVOS;
  const preco = await lerPreco();
  return Number(preco.vigente_centavos) || PRECO_CENTAVOS;
}

/**
 * Números do produto, em um lugar só.
 *
 * Sempre em centavos e sempre inteiros. Preço e comissão aparecem no
 * checkout, no webhook, no painel do afiliado e no de repasses — se cada um
 * carregasse a própria cópia, bastaria um reajuste para as contas
 * divergirem entre telas.
 */
export const PRECO_CENTAVOS = Number(process.env.NEXT_PUBLIC_PRECO_CENTAVOS || 3490);
export const COMISSAO_CENTAVOS = Number(process.env.COMISSAO_CENTAVOS || 1490);

export const NOME_PRODUTO = "Precificação 3D — acesso vitalício";

/** 3490 → "R$ 34,90" */
export function reais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

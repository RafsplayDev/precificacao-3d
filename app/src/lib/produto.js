/**
 * Números do produto, em um lugar só.
 *
 * Sempre em centavos e sempre inteiros. Preço e comissão aparecem no
 * checkout, no webhook, no painel do afiliado e no de repasses — se cada um
 * carregasse a própria cópia, bastaria um reajuste para as contas
 * divergirem entre telas.
 *
 * A fonte da verdade é a tabela `precificacao` (migração 0021), editada pelo
 * painel de administração. Os valores abaixo são só a rede de segurança para
 * quando o banco não responde: um checkout que cai porque a consulta de preço
 * falhou custa a venda inteira. Este arquivo não importa nada do servidor de
 * propósito — ele é usado também em componentes de cliente.
 */
export const PRECO_CENTAVOS = Number(process.env.NEXT_PUBLIC_PRECO_CENTAVOS || 3490);
export const COMISSAO_CENTAVOS = Number(process.env.COMISSAO_CENTAVOS || 1490);

export const NOME_PRODUTO = "Precificação 3D — acesso vitalício";

/** O que as telas mostram quando o preço ainda não chegou do banco. */
export const PRECO_PADRAO = {
  vigente_centavos: PRECO_CENTAVOS,
  cheio_centavos: PRECO_CENTAVOS,
  em_promocao: false,
  promo_rotulo: null,
  promo_fim: null,
};

/**
 * Normaliza uma linha de `vw_preco`.
 *
 * A view já resolve se a promoção vale agora; aqui só se conserta o formato
 * (números que vêm como texto, linha ausente) para nenhuma tela precisar
 * repetir essa checagem.
 */
export function normalizarPreco(linha) {
  if (!linha) return PRECO_PADRAO;
  const vigente = Number(linha.vigente_centavos) || PRECO_CENTAVOS;
  const cheio = Number(linha.cheio_centavos) || vigente;
  return {
    vigente_centavos: vigente,
    cheio_centavos: cheio,
    em_promocao: !!linha.em_promocao && cheio > vigente,
    promo_rotulo: linha.promo_rotulo || null,
    promo_fim: linha.promo_fim || null,
  };
}

/** 3490 → "R$ 34,90" */
export function reais(centavos) {
  return (Number(centavos || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** "34,90", "R$ 34,90", "3490" (com vírgula ou ponto) → 3490 centavos. */
export function centavosDeTexto(texto) {
  const limpo = String(texto ?? "").replace(/[^\d,.-]/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

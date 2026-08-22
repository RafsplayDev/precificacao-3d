const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlPrecise = new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4,
});

export const money = (n) => brl.format(Number(n) || 0);
export const moneyPrecise = (n) => brlPrecise.format(Number(n) || 0);
export const pct = (n, d = 1) =>
  `${((Number(n) || 0) * 100).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
export const num = (n, d = 2) =>
  (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const toNum = (v) => {
  if (v === "" || v === null || v === undefined) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Máscara de dinheiro no estilo caixa de banco: os dígitos entram pela direita,
 * o primeiro vira centavo, o segundo dezena de centavo, e assim por diante.
 */
export function mascaraMoeda(entrada) {
  const digitos = String(entrada ?? "").replace(/\D/g, "").slice(0, 15);
  return (Number(digitos || 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

/** O número por trás da máscara. */
export function moedaParaNumero(texto) {
  const digitos = String(texto ?? "").replace(/\D/g, "").slice(0, 15);
  return Number(digitos || 0) / 100;
}

/** Número do banco → texto mascarado (2 casas, sem símbolo). */
export function numeroParaMoeda(valor) {
  return (Number(valor) || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

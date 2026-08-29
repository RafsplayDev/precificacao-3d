const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// Dinheiro é sempre em centavos: as casas extras só poluíam a leitura.
export const money = (n) => brl.format(Number(n) || 0);
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

/**
 * Hoje em "AAAA-MM-DD", o formato da coluna `date`.
 *
 * Montado a partir da data local, não do `toISOString()`: no Brasil o UTC
 * já virou o dia às 21h, e uma venda lançada à noite cairia amanhã.
 */
export function hojeISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-08-28" → "28/08/2026", sem passar por Date (que aplicaria fuso). */
export function dataBR(iso) {
  const [a, m, d] = String(iso ?? "").slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : "—";
}

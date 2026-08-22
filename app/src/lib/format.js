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

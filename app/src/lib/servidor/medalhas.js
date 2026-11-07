import "server-only";

/**
 * Medalhas de oferta (ouro, prata, bronze), calculadas pelo histórico
 * PRÓPRIO de preços — nunca pelo desconto que a loja anuncia.
 *
 * Aquecimento: o produto só concorre depois de AQUECIMENTO_DIAS desde o
 * primeiro registro e com preço visto em pelo menos MIN_DIAS dias
 * diferentes. Antes disso não há dado para dizer o que é "preço normal".
 *
 * Referência: o menor preço e a média dos JANELA_DIAS dias ANTERIORES a
 * hoje (o dia de hoje fica de fora, para a própria oferta não puxar a
 * média para baixo).
 */
export const REGRAS = {
  AQUECIMENTO_DIAS: 14,
  MIN_DIAS: 4,
  JANELA_DIAS: 30,
  NOTA_MINIMA: 4.0,
  OURO: 0.15,   // ≥ 15% abaixo da média E no menor preço já visto
  PRATA: 0.10,  // ≥ 10% abaixo da média
  BRONZE: 0.05, // ≥ 5% abaixo da média
};

/** Agregados do histórico por produto — uma consulta só para a lista toda. */
export async function estatisticasHistorico(banco, origemIds) {
  if (!origemIds.length) return {};
  const { results } = await banco
    .prepare(
      `SELECT origem_id,
              MIN(dia) AS primeiro_dia,
              MIN(CASE WHEN dia < date('now') AND dia >= date('now', ?) THEN preco END) AS menor,
              AVG(CASE WHEN dia < date('now') AND dia >= date('now', ?) THEN preco END) AS media,
              COUNT(CASE WHEN dia < date('now') AND dia >= date('now', ?) THEN 1 END) AS dias
         FROM precos_historico
        WHERE origem_id IN (SELECT value FROM json_each(?))
        GROUP BY origem_id`
    )
    .bind(...Array(3).fill(`-${REGRAS.JANELA_DIAS} days`), JSON.stringify(origemIds))
    .all();
  return Object.fromEntries(results.map((r) => [r.origem_id, r]));
}

const reais = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (x) => `${Math.round(x * 100)}%`;

/**
 * { nivel: "ouro" | "prata" | "bronze", motivo } — ou, sem medalha,
 * { nivel: null, aquecendo: { dias, faltam } } enquanto o histórico se forma.
 */
export function medalhaDe(anuncio, est) {
  const preco = Number(anuncio.preco);
  if (!preco || !est) return { nivel: null };

  const desde = est.primeiro_dia ? Math.floor((Date.now() - Date.parse(est.primeiro_dia + "T00:00:00Z")) / 86400000) : 0;
  if (desde < REGRAS.AQUECIMENTO_DIAS || est.dias < REGRAS.MIN_DIAS || !est.media) {
    return { nivel: null, aquecendo: { dias: desde, faltam: Math.max(REGRAS.AQUECIMENTO_DIAS - desde, 0) } };
  }
  if (anuncio.avaliacao != null && anuncio.avaliacao < REGRAS.NOTA_MINIMA) return { nivel: null };

  const abaixo = 1 - preco / est.media; // fração abaixo da média
  const noMenor = preco <= est.menor + 0.005;
  const media = `${pct(abaixo)} abaixo da média de ${REGRAS.JANELA_DIAS} dias (${reais(est.media)})`;

  if (noMenor && abaixo >= REGRAS.OURO) {
    return { nivel: "ouro", motivo: `Menor preço em ${REGRAS.JANELA_DIAS} dias · ${pct(abaixo)} abaixo da média` };
  }
  if (abaixo >= REGRAS.PRATA) return { nivel: "prata", motivo: media };
  if (abaixo >= REGRAS.BRONZE) return { nivel: "bronze", motivo: media };
  return { nivel: null };
}

export const ORDEM_MEDALHA = { ouro: 3, prata: 2, bronze: 1 };

/**
 * Motor de cálculo — as fórmulas da planilha
 * "Calculadora da Fórmula da Precificação 3D — FDM V2.5", em JavaScript.
 *
 * As mesmas contas existem como views no Postgres (vw_pecas_custos,
 * vw_produtos_custos, vw_produtos_precos). Aqui elas rodam no navegador
 * para o simulador responder instantaneamente enquanto você digita.
 */

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const div = (a, b) => (n(b) === 0 ? 0 : n(a) / n(b));

/** Nível de uso da impressora → % de desgaste (coluna W da aba Listas). */
export const DESGASTE = { Basico: 0.1, Medio: 0.2, Profissional: 0.3, Intenso: 0.45 };
export const desgaste = (nivel) => DESGASTE[nivel] ?? 0.45;

/** Soma da depreciação fiscal mensal — o intervalo nomeado "Depreciação". */
export function depreciacaoTotal(bens = []) {
  return bens.reduce((acc, b) => acc + div(b.valor_aquisicao, b.vida_util_meses), 0);
}

/**
 * Os 7 custos de produção de uma peça (colunas AC:AI da aba Listas).
 * Tempo, peso e comprimento são os da impressão inteira; quando mais de uma
 * unidade sai na mesma mesa (`unidades_por_impressao`), os custos são
 * divididos por ela e o resultado é o custo de UMA unidade.
 */
export function custosPeca(peca, impressora, filamento, deprTotal, tarifaKwh) {
  const horas = n(peca.tempo_impressao_horas);
  const unidades = Math.max(1, n(peca.unidades_por_impressao) || 1);
  const custoPorGrama = div(filamento?.custo_brl, n(filamento?.peso_carretel_kg) * 1000);
  const custo_material = custoPorGrama * n(peca.peso_gr);

  const hrAno = n(impressora?.hrs_dia) * n(impressora?.dias_mes) * 12;
  const usoAnual =
    n(impressora?.tempo_retorno_meses) * n(impressora?.hrs_dia) * n(impressora?.dias_mes);

  const c = {
    custo_material,
    custo_energia: horas * n(impressora?.potencia_kw) * n(tarifaKwh),
    custo_manutencao:
      div(n(impressora?.valor_maquina) * desgaste(impressora?.nivel_uso), hrAno) * horas,
    custo_falhas: custo_material * n(impressora?.percent_falhas),
    custo_acabamento: custo_material * n(peca.percent_acabamento),
    retorno_investimento: div(impressora?.valor_maquina, usoAnual) * horas,
    custo_depreciacao: div(usoAnual, deprTotal),
  };
  for (const k of Object.keys(c)) c[k] = c[k] / unidades;
  c.unidades_por_impressao = unidades;
  c.custo_peca =
    c.custo_material + c.custo_energia + c.custo_manutencao + c.custo_falhas +
    c.custo_acabamento + c.retorno_investimento + c.custo_depreciacao;
  return c;
}

/** As sete linhas de custo que compõem "CUSTOS PRODUÇÃO", na ordem da planilha. */
export const LINHAS_CUSTO = [
  { key: "custo_material", label: "Custo material", cor: "var(--fil-magenta)" },
  { key: "custo_energia", label: "Custo energia", cor: "var(--fil-yellow)" },
  { key: "custo_manutencao", label: "Custo de manutenção", cor: "var(--fil-orange)" },
  { key: "custo_falhas", label: "Custo de falhas", cor: "var(--fil-coral)" },
  { key: "custo_acabamento", label: "Custo de acabamento", cor: "var(--fil-mint)" },
  { key: "retorno_investimento", label: "Retorno do investimento", cor: "var(--fil-cyan)" },
  { key: "custo_depreciacao", label: "Custo de depreciação", cor: "var(--fil-violet)" },
];

/**
 * Valor de um custo adicional. Quando ele aponta para um insumo cadastrado,
 * o valor é o custo unitário do insumo (valor pago ÷ peças) vezes a quantidade.
 */
export function valorAdicional(custo, insumos = []) {
  if (!custo?.insumo_id) return n(custo?.valor);
  const ins = insumos.find((i) => i.id === custo.insumo_id);
  if (!ins) return 0;
  const unit = div(ins.valor_pago, ins.qtd_pecas);
  return unit * n(custo.quantidade ?? 1);
}

/**
 * Valor de um trabalho do produto: custo/hora do tipo × minutos ÷ 60.
 * Quando os minutos são de um lote (`unidades` > 1) o valor é dividido por
 * ele — o resultado é sempre o custo de UMA unidade.
 */
export function valorTrabalho(trabalho, maosObra = []) {
  const mo = maosObra.find((m) => m.id === trabalho?.mao_obra_id);
  if (!mo) return 0;
  const unidades = Math.max(1, n(trabalho.unidades) || 1);
  return div(n(mo.custo_hora) * n(trabalho.minutos), 60) / unidades;
}

/** Consolidado de um produto: custos, markup e preços sugeridos. */
export function custosProduto({ produto, pecas = [], impressoras = [], filamentos = [], adicionais = [], insumos = [], trabalhos = [], maosObra = [], bens = [], tarifaKwh = 0 }) {
  const deprTotal = depreciacaoTotal(bens);
  const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const imp = byId(impressoras);
  const fil = byId(filamentos);

  const detalhes = pecas.map((p) => ({
    peca: p,
    ...custosPeca(p, imp[p.impressora_id], fil[p.filamento_id], deprTotal, tarifaKwh),
  }));

  const soma = (k) => detalhes.reduce((a, d) => a + d[k], 0);
  const linhas = Object.fromEntries(LINHAS_CUSTO.map((l) => [l.key, soma(l.key)]));

  const custos_producao = soma("custo_peca");
  const custos_trabalho = trabalhos.reduce((a, t) => a + valorTrabalho(t, maosObra), 0);
  const custos_hora = custos_trabalho;
  const custos_adicionais = adicionais.reduce((a, c) => a + valorAdicional(c, insumos), 0);
  const custos_totais = custos_producao + custos_hora + custos_adicionais;

  return {
    detalhes,
    ...linhas,
    custos_producao,
    custos_hora,
    custos_trabalho,
    custos_adicionais,
    custos_totais,
    sugerido_atacado: custos_totais * n(produto?.markup_atacado),
    sugerido_varejo: custos_totais * n(produto?.markup_varejo),
    depreciacao_total_mensal: deprTotal,
  };
}

/**
 * Preço com as taxas do marketplace embutidas:
 *   preço = (preço base + taxa fixa) / (1 − taxa %)
 */
export function precoComMarketplace(base, marketplace) {
  const taxa = n(marketplace?.taxa_percent);
  if (taxa >= 1) return 0;
  return div(n(base) + n(marketplace?.preco_fixo), 1 - taxa);
}

/** Cenário unitário do simulador (bloco "Cénario sem desconto"). */
export function cenarioUnitario({ base, marketplace, custosTotais, impostos }) {
  const preco_unitario = precoComMarketplace(base, marketplace);
  const taxas_mkt = preco_unitario - n(base);
  const custo_unitario = n(custosTotais) + taxas_mkt;
  const margem = preco_unitario - custo_unitario;
  const imposto = preco_unitario * n(impostos);
  const lucro_liquido = margem - imposto;
  return {
    preco_unitario,
    taxas_mkt,
    custo_unitario,
    margem,
    margem_pct: div(margem, preco_unitario),
    imposto,
    lucro_liquido,
    lucro_liquido_pct: div(lucro_liquido, preco_unitario),
  };
}

/** Cenário com desconto e volume (bloco "Cénario com desconto"). */
export function cenarioDesconto({ unitario, quantidade, desconto, ajusteCusto, impostos }) {
  const preco_unitario = n(unitario.preco_unitario) * (1 - n(desconto));
  const vendas = preco_unitario * n(quantidade);
  const custos = (n(unitario.custo_unitario) + n(ajusteCusto)) * n(quantidade);
  const margem = vendas - custos;
  const lucro_liquido = margem - vendas * n(impostos);
  return {
    preco_unitario,
    vendas,
    custos,
    margem,
    margem_pct: div(margem, vendas),
    lucro_liquido,
    lucro_liquido_pct: div(lucro_liquido, vendas),
    dif_pts: div(lucro_liquido, vendas) - n(unitario.lucro_liquido_pct),
    dif_valor: lucro_liquido - n(unitario.lucro_liquido) * n(quantidade),
  };
}

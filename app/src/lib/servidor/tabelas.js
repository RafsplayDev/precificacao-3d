import "server-only";

/**
 * O que a rota /api/dados aceita, tabela por tabela.
 *
 * É a lista branca que substitui o RLS do Supabase: o nome da tabela e o das
 * colunas entram no SQL, então só passa o que está escrito aqui. Os valores
 * vão sempre por `bind`. Colunas geradas (custo_por_grama etc.), `id`,
 * `user_id` e `created_at` ficam de fora de `colunas` porque o servidor os
 * preenche — mandá-los é ignorado, não é erro.
 *
 * `refs` lista as colunas que apontam para outra tabela do usuário. Antes de
 * gravar, a rota confere que o id apontado pertence à mesma conta: a chave
 * estrangeira do SQLite só garante que a linha existe, não de quem ela é.
 */
export const TABELAS = {
  impressoras: {
    ordem: "nome",
    colunas: ["nome", "marca", "tempo_retorno_meses", "valor_maquina", "hrs_dia", "dias_mes",
      "potencia_kw", "nivel_uso", "percent_falhas"],
  },
  filamentos: {
    ordem: "nome",
    colunas: ["nome", "marca", "descricao", "peso_carretel_kg", "comprimento_carretel_m", "custo_brl"],
  },
  marketplaces: {
    ordem: "nome",
    colunas: ["nome", "preco_fixo", "taxa_percent"],
  },
  insumos: {
    ordem: "nome",
    colunas: ["nome", "marca", "descricao", "tipo", "valor_pago", "qtd_pecas", "unidade"],
  },
  maos_obra: {
    ordem: "nome",
    colunas: ["nome", "categoria", "descricao", "custo_hora"],
  },
  bens_depreciacao: {
    ordem: "bem",
    colunas: ["bem", "valor_aquisicao", "vida_util_meses", "taxa_anual"],
  },
  produtos: {
    ordem: "nome",
    colunas: ["nome", "descricao", "imagem_url", "hrs_trabalhadas", "custo_hora", "markup_atacado",
      "markup_varejo", "preco_final_atacado", "preco_final_varejo", "usar_preco", "marketplace_id",
      "impostos_percent", "qtd_atacado", "desconto_atacado", "ajuste_custo_atacado",
      "ajuste_custo_atacado_pct", "qtd_varejo", "desconto_varejo", "ajuste_custo_varejo"],
    refs: { marketplace_id: "marketplaces" },
    tocaUpdatedAt: true,
  },
  pecas: {
    ordem: "numero",
    colunas: ["produto_id", "numero", "nome", "impressora_id", "filamento_id", "comprimento_m",
      "tempo_impressao_horas", "peso_gr", "tarifa_kwh", "percent_acabamento", "unidades_por_impressao"],
    refs: { produto_id: "produtos", impressora_id: "impressoras", filamento_id: "filamentos" },
  },
  custos_adicionais: {
    ordem: "created_at",
    colunas: ["produto_id", "insumo_id", "nome", "valor", "quantidade"],
    refs: { produto_id: "produtos", insumo_id: "insumos" },
  },
  produto_trabalhos: {
    ordem: "created_at",
    colunas: ["produto_id", "mao_obra_id", "minutos", "unidades"],
    refs: { produto_id: "produtos", mao_obra_id: "maos_obra" },
  },
  faixas_atacado: {
    ordem: "qtd_min",
    colunas: ["produto_id", "qtd_min", "qtd_max", "markup", "preco_final"],
    refs: { produto_id: "produtos" },
  },
  concorrentes: {
    ordem: "created_at",
    colunas: ["produto_id", "nome", "link", "preco"],
    refs: { produto_id: "produtos" },
  },
  gastos: {
    ordem: "data",
    colunas: ["data", "categoria", "descricao", "valor"],
  },
  vendas: {
    ordem: "data",
    colunas: ["data", "produto_id", "descricao", "cliente", "quantidade", "preco_unitario",
      "custo_unitario", "taxas"],
    refs: { produto_id: "produtos" },
  },
  // Uma linha por conta, com chave no user_id. Para as telas ela continua
  // tendo `id` (= user_id), como tinha no Supabase.
  configuracoes: {
    unicaPorConta: true,
    colunas: ["tarifa_kwh", "concessionaria", "markup_atacado_padrao", "markup_varejo_padrao",
      "qtd_atacado_padrao"],
  },
};

/** Só as colunas permitidas, com booleanos virando 0/1 (o SQLite não tem bool). */
export function filtrarCampos(tabela, campos) {
  const def = TABELAS[tabela];
  const saida = {};
  for (const c of def.colunas) {
    if (campos && Object.prototype.hasOwnProperty.call(campos, c)) {
      let v = campos[c];
      if (typeof v === "boolean") v = v ? 1 : 0;
      if (v !== null && typeof v === "object") v = JSON.stringify(v);
      if (v === "" && c.endsWith("_id")) v = null;
      saida[c] = v === undefined ? null : v;
    }
  }
  return saida;
}

/**
 * Traduz o erro do SQLite para os códigos do Postgres que as telas já
 * sabem tratar (tratarMensagemErro em lib/useDados).
 */
export function erroComoPostgres(e) {
  const msg = String(e?.message || e);
  if (/UNIQUE constraint failed/i.test(msg)) return { code: "23505", message: "duplicate key value violates unique constraint" };
  if (/FOREIGN KEY constraint failed/i.test(msg)) return { code: "23503", message: "violates foreign key constraint" };
  if (/CHECK constraint failed/i.test(msg)) return { code: "23514", message: "Valor fora do permitido." };
  return { code: null, message: msg };
}

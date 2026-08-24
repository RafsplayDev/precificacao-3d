"use client";

/**
 * O banco do modo teste.
 *
 * Quem entra sem licença precisa ver a calculadora funcionando com número
 * dela — impressora de verdade, filamento de verdade, preço de verdade. O
 * que essa pessoa não pode é ocupar o banco de dados de quem pagou. Então
 * o modo teste troca o Supabase por este arquivo: mesma forma de chamada
 * (listar / inserir / atualizar / remover), mesmos nomes de tabela, mesmo
 * formato de linha — só que tudo vive no localStorage do navegador.
 *
 * Duas coisas o Postgres fazia sozinho e aqui precisam de código:
 *
 *  • As colunas `generated always` (custo por grama, custo por minuto,
 *    nível de desgaste…). A calculadora lê esses campos direto da linha,
 *    então eles são recalculados a cada escrita — as fórmulas abaixo são
 *    tradução literal das do schema, e mudar uma sem mudar a outra faz o
 *    teste mentir sobre o preço.
 *  • O `unique (nome)`, o `on delete cascade` e o `on delete restrict`. Sem
 *    eles o teste divergiria do app real justo nos erros, que é onde ele
 *    ensina.
 *
 * O limite de linhas é o que faz o teste ser teste: dá para precificar um
 * produto do começo ao fim, não para tocar a operação de graça.
 */

const CHAVE = "dc_teste_v1";

/** Até onde o teste vai. Um produto inteiro cabe; um catálogo, não. */
export const LIMITES = {
  impressoras: 1,
  filamentos: 2,
  insumos: 3,
  maos_obra: 2,
  marketplaces: 2,
  bens_depreciacao: 2,
  produtos: 1,
  pecas: 2,
  custos_adicionais: 3,
  produto_trabalhos: 3,
  faixas_atacado: 2,
  concorrentes: 3,
};

/** Como chamar cada coisa quando o limite estoura. */
const NOMES = {
  impressoras: ["impressora", "impressoras"],
  filamentos: ["filamento", "filamentos"],
  insumos: ["insumo", "insumos"],
  maos_obra: ["tipo de trabalho", "tipos de trabalho"],
  marketplaces: ["canal de venda", "canais de venda"],
  bens_depreciacao: ["bem", "bens"],
  produtos: ["produto", "produtos"],
  pecas: ["peça", "peças"],
  custos_adicionais: ["custo adicional", "custos adicionais"],
  produto_trabalhos: ["linha de mão de obra", "linhas de mão de obra"],
  faixas_atacado: ["faixa de atacado", "faixas de atacado"],
  concorrentes: ["concorrente", "concorrentes"],
};

/** Valores que o banco preencheria sozinho quando o formulário não manda. */
const PADROES = {
  impressoras: { marca: null, tempo_retorno_meses: 10, valor_maquina: 0, hrs_dia: 20, dias_mes: 25, potencia_kw: 0.5, nivel_uso: "Medio", percent_falhas: 0.05 },
  filamentos: { marca: null, descricao: null, peso_carretel_kg: 1, comprimento_carretel_m: 335, custo_brl: 0 },
  insumos: { marca: null, descricao: null, tipo: "Unidade", unidade: "un", valor_pago: 0, qtd_pecas: 1 },
  maos_obra: { categoria: "Producao", descricao: null, custo_hora: 0 },
  marketplaces: { preco_fixo: 0, taxa_percent: 0 },
  bens_depreciacao: { valor_aquisicao: 0, vida_util_meses: 12, taxa_anual: 0.1 },
  produtos: {
    descricao: null, imagem_url: null, hrs_trabalhadas: 1, custo_hora: 0,
    markup_atacado: 1.5, markup_varejo: 2, preco_final_atacado: 0, preco_final_varejo: 0,
    usar_preco: "Sugerido", marketplace_id: null, impostos_percent: 0,
    qtd_atacado: 100, desconto_atacado: 0, ajuste_custo_atacado: 0, ajuste_custo_atacado_pct: 0,
    qtd_varejo: 100, desconto_varejo: 0, ajuste_custo_varejo: 0,
  },
  pecas: {
    numero: 1, impressora_id: null, filamento_id: null, comprimento_m: 0,
    tempo_impressao_horas: 0, peso_gr: 0, tarifa_kwh: 0.95, percent_acabamento: 0.05,
    unidades_por_impressao: 1,
  },
  custos_adicionais: { nome: null, valor: 0, insumo_id: null, quantidade: 0 },
  produto_trabalhos: { mao_obra_id: null, minutos: 0, unidades: 1 },
  faixas_atacado: { qtd_min: 1, markup: 1.5, preco_final: 0 },
  concorrentes: { link: null, preco: 0 },
  configuracoes: { tarifa_kwh: 0.95, concessionaria: null, markup_varejo_padrao: 2, markup_atacado_padrao: 1.5, qtd_atacado_padrao: 10 },
};

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const dividir = (a, b) => (n(b) === 0 ? 0 : n(a) / n(b));

/** As colunas `generated always` do schema, recalculadas a cada escrita. */
const CALCULADOS = {
  impressoras: (l) => {
    const desgaste = { Basico: 0.1, Medio: 0.2, Profissional: 0.3 }[l.nivel_uso] ?? 0.45;
    const horasAteRetorno = n(l.tempo_retorno_meses) * n(l.hrs_dia) * n(l.dias_mes);
    return {
      nivel_desgaste: desgaste,
      uso_estimado_anual_hrs: horasAteRetorno,
      hr_ano: n(l.hrs_dia) * n(l.dias_mes) * 12,
      valor_adicionar_hr: dividir(l.valor_maquina, horasAteRetorno),
    };
  },
  filamentos: (l) => ({ custo_por_grama: dividir(l.custo_brl, n(l.peso_carretel_kg) * 1000) }),
  insumos: (l) => ({ custo_unitario: dividir(l.valor_pago, l.qtd_pecas) }),
  maos_obra: (l) => ({ custo_minuto: n(l.custo_hora) / 60 }),
  bens_depreciacao: (l) => ({
    vida_util_anos: n(l.vida_util_meses) / 12,
    depreciacao_mensal: dividir(l.valor_aquisicao, l.vida_util_meses),
  }),
};

/** Tabelas em que o nome não pode repetir — o `unique` do schema. */
const NOME_UNICO = {
  impressoras: "nome", filamentos: "nome", insumos: "nome",
  maos_obra: "nome", marketplaces: "nome", produtos: "nome",
};

/** O `on delete cascade`: apagar o pai apaga os filhos. */
const FILHOS = {
  produtos: ["pecas", "custos_adicionais", "produto_trabalhos", "faixas_atacado", "concorrentes"],
};

/** O `on delete restrict`: quem está em uso não sai. */
const EM_USO = [
  ["impressoras", "pecas", "impressora_id"],
  ["filamentos", "pecas", "filamento_id"],
  ["insumos", "custos_adicionais", "insumo_id"],
  ["maos_obra", "produto_trabalhos", "mao_obra_id"],
  ["marketplaces", "produtos", "marketplace_id"],
];

const agora = () => new Date().toISOString();

const novoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `local-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

function comCalculados(tabela, linha) {
  return CALCULADOS[tabela] ? { ...linha, ...CALCULADOS[tabela](linha) } : linha;
}

/**
 * O que o trigger `semear_conta` cria no Supabase quando a conta nasce.
 * Sem a linha de configurações a tarifa de energia fica indefinida e todo
 * custo sai errado — o teste começaria quebrado.
 */
function semear() {
  return {
    configuracoes: [{ ...PADROES.configuracoes, id: true }],
    // `_semente` distingue o que o app criou do que a pessoa criou. Sem essa
    // marca, um navegador que só abriu a tela já "tinha dados de teste" e
    // pediria migração para quem nunca digitou nada.
    marketplaces: [{ ...PADROES.marketplaces, id: novoId(), nome: "Venda Direta", created_at: agora(), _semente: true }],
  };
}

/**
 * `criar: false` lê sem semear. Quem já pagou passa por aqui só para
 * perguntar "sobrou algo do teste?" — e essa pergunta não pode ser a coisa
 * que cria o teste.
 */
function ler(criar = true) {
  if (typeof window === "undefined") return {};
  try {
    const cru = window.localStorage.getItem(CHAVE);
    if (!cru) {
      if (!criar) return {};
      const inicial = semear();
      gravar(inicial);
      return inicial;
    }
    return JSON.parse(cru) || {};
  } catch {
    return criar ? semear() : {};
  }
}

function gravar(banco) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(banco));
  } catch {
    // Navegador sem espaço, ou aba anônima trancada. O teste segue com o
    // que está na memória da página: perder isso ao recarregar é melhor
    // que travar a pessoa no meio do cadastro.
  }
}

/** Erro com a cara dos que vêm do Postgres, para as telas tratarem igual. */
function erro(mensagem, code) {
  const e = new Error(mensagem);
  if (code) e.code = code;
  return e;
}

/** Lê uma tabela inteira, ordenada como o Supabase ordenaria. */
export function listarLocal(tabela, ordem) {
  const linhas = ler()[tabela] || [];
  if (!ordem) return linhas;
  return [...linhas].sort((a, b) => {
    const x = a[ordem], y = b[ordem];
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x ?? "").localeCompare(String(y ?? ""), "pt-BR");
  });
}

export function inserirLocal(tabela, campos) {
  const banco = ler();
  const linhas = banco[tabela] || [];

  const teto = LIMITES[tabela];
  if (teto != null && linhas.length >= teto) {
    const [um, muitos] = NOMES[tabela] || ["registro", "registros"];
    throw erro(
      `No teste grátis dá para cadastrar ${teto === 1 ? `1 ${um}` : `${teto} ${muitos}`}. ` +
        "Crie sua conta para cadastrar quantos quiser — o que você já digitou vai junto.",
      "LIMITE_TESTE"
    );
  }

  const chave = NOME_UNICO[tabela];
  if (chave && linhas.some((l) => mesmoNome(l[chave], campos[chave]))) {
    throw erro("duplicate key value violates unique constraint", "23505");
  }

  const linha = comCalculados(tabela, {
    ...(PADROES[tabela] || {}),
    ...campos,
    id: novoId(),
    created_at: agora(),
  });
  banco[tabela] = [...linhas, linha];
  gravar(banco);
  return linha;
}

export function atualizarLocal(tabela, id, campos) {
  const banco = ler();
  const linhas = banco[tabela] || [];
  const alvo = linhas.find((l) => l.id === id);
  if (!alvo) throw erro("Este registro não existe mais.");

  const chave = NOME_UNICO[tabela];
  if (
    chave &&
    campos[chave] !== undefined &&
    linhas.some((l) => l.id !== id && mesmoNome(l[chave], campos[chave]))
  ) {
    throw erro("duplicate key value violates unique constraint", "23505");
  }

  // Mexeu na linha, ela deixa de ser semente: agora é dado da pessoa.
  const atualizada = comCalculados(tabela, { ...alvo, ...campos, _semente: undefined });
  banco[tabela] = linhas.map((l) => (l.id === id ? atualizada : l));
  gravar(banco);
  return atualizada;
}

export function removerLocal(tabela, id) {
  const banco = ler();

  for (const [pai, filha, coluna] of EM_USO) {
    if (pai !== tabela) continue;
    if ((banco[filha] || []).some((l) => l[coluna] === id)) {
      throw erro("violates foreign key constraint", "23503");
    }
  }

  banco[tabela] = (banco[tabela] || []).filter((l) => l.id !== id);
  for (const filha of FILHOS[tabela] || []) {
    banco[filha] = (banco[filha] || []).filter((l) => l.produto_id !== id);
  }
  gravar(banco);
}

function mesmoNome(a, b) {
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

/** Quanto já foi usado de cada limite — serve para a tela avisar antes do esbarrão. */
export function usoDoTeste() {
  const banco = ler();
  return Object.fromEntries(
    Object.entries(LIMITES).map(([t, teto]) => [t, { usado: (banco[t] || []).length, teto }])
  );
}

/** Havia algo digitado no teste? É o que decide se vale oferecer a migração. */
export function temDadosDeTeste() {
  const banco = ler(false);
  return Object.keys(LIMITES).some((t) => (banco[t] || []).some((l) => !l._semente));
}

export function limparTeste() {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {}
}

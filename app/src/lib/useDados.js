"use client";
import React from "react";

const TABELAS = [
  "impressoras", "filamentos", "marketplaces", "insumos", "maos_obra", "configuracoes",
  "bens_depreciacao", "produtos", "pecas", "custos_adicionais", "produto_trabalhos",
  "faixas_atacado", "concorrentes", "gastos", "vendas",
];

const VAZIO = Object.fromEntries(TABELAS.map((t) => [t, []]));

/**
 * Chamada à API de dados (/api/dados), que roda no Worker da Cloudflare e
 * fala com o D1. A sessão vai no cookie httpOnly `dc_sessao`; o servidor
 * filtra tudo pelo usuário dela, como o RLS fazia no Supabase.
 */
async function api(caminho, metodo = "GET", corpo) {
  const res = await fetch(`/api/dados${caminho}`, {
    method: metodo,
    headers: corpo ? { "content-type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });
  const dados = await res.json().catch(() => ({}));
  if (res.status === 401) {
    // Sessão vencida: volta para o login e depois para esta mesma tela.
    window.location.assign(`/entrar?proximo=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok) {
    const e = new Error(dados.message || "Não foi possível falar com o servidor.");
    e.code = dados.code;
    throw e;
  }
  return dados;
}

/**
 * Quantas linhas a conta tem em cada tabela, do jeito que a tela está vendo.
 *
 * O tutorial avança sozinho quando a pessoa cadastra o que o passo pede
 * (a primeira impressora, o primeiro produto…), e para isso ele precisa
 * saber a contagem sem ler o banco de novo a cada instante. Toda tela usa
 * o useDados, então é aqui que a contagem nasce.
 */
const contagens = {};
/** null enquanto os dados ainda não chegaram — "não sei" é diferente de zero. */
export function contarLinhas(tabela) {
  return contagens[tabela] ?? null;
}

/** Carrega o banco inteiro de uma vez. O volume aqui é pequeno (dezenas de linhas). */
export function useDados() {
  const [dados, setDados] = React.useState(VAZIO);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState(null);

  const carregar = React.useCallback(async () => {
    setCarregando(true);
    try {
      const tudo = await api("");
      setDados(Object.fromEntries(TABELAS.map((t) => [t, tudo[t] || []])));
      setErro(null);
    } catch (e) {
      setErro(e.message || "Não foi possível ler o banco.");
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => { carregar(); }, [carregar]);

  React.useEffect(() => {
    if (carregando) return;
    for (const t of TABELAS) contagens[t] = (dados[t] || []).length;
  }, [dados, carregando]);

  /** Insere ou substitui uma linha só, sem reler o banco inteiro. */
  const aplicar = React.useCallback((tabela, registro) => {
    if (!registro?.id) return;
    setDados((atual) => {
      const linhas = atual[tabela] || [];
      const existe = linhas.some((l) => l.id === registro.id);
      return {
        ...atual,
        [tabela]: existe
          ? linhas.map((l) => (l.id === registro.id ? { ...l, ...registro } : l))
          : [...linhas, registro],
      };
    });
  }, []);

  /** Tira uma linha da memória, sem reler o banco inteiro. */
  const remover = React.useCallback((tabela, id) => {
    setDados((atual) => ({ ...atual, [tabela]: (atual[tabela] || []).filter((l) => l.id !== id) }));
  }, []);

  return { ...dados, carregando, erro, recarregar: carregar, aplicar, remover };
}

/** Escreve uma linha e devolve o registro atualizado. */
export async function salvarLinha(tabela, id, campos) {
  return api(`/${tabela}/${encodeURIComponent(id)}`, "PATCH", campos);
}

export async function inserirLinha(tabela, campos) {
  return api(`/${tabela}`, "POST", campos);
}

export async function removerLinha(tabela, id) {
  await api(`/${tabela}/${encodeURIComponent(id)}`, "DELETE");
}

export function tratarMensagemErro(e, tabela) {
  if (!e) return "Ocorreu um erro inesperado.";
  const code = e.code;

  const msg = String(e.message || e);

  const isUnique = code === "23505" || msg.includes("unique constraint") || msg.includes("duplicate key");
  if (isUnique) {
    return "Já existe um registro cadastrado com este nome. Escolha um nome diferente.";
  }

  const isFK = code === "23503" || msg.includes("foreign key constraint") || msg.includes("violates foreign key");

  if (isFK) {
    switch (tabela) {
      case "impressoras":
        return "Esta impressora não pode ser removida pois está vinculada a uma ou mais peças de produtos.";
      case "filamentos":
        return "Este filamento não pode ser removido pois está vinculado a uma ou mais peças de produtos.";
      case "maos_obra":
        return "Este tipo de trabalho não pode ser removido pois está sendo usado no custo de algum produto.";
      case "insumos":
        return "Este insumo não pode ser removido pois está sendo usado em custos adicionais de algum produto.";
      case "marketplaces":
        return "Este canal de venda não pode ser removido pois está associado a um ou mais produtos.";
      case "produtos":
        return "Este produto não pode ser removido pois possui peças ou custos vinculados.";
      case "bens_depreciacao":
        return "Este bem não pode ser removido pois possui registros associados.";
      default:
        return "Não foi possível remover este registro pois ele está em uso por outros cadastros.";
    }
  }

  return e.message || "Não foi possível concluir a operação.";
}


"use client";
import React from "react";
import { supabase } from "./supabaseClient";

const TABELAS = [
  ["impressoras", "nome"],
  ["filamentos", "nome"],
  ["marketplaces", "nome"],
  ["insumos", "nome"],
  ["maos_obra", "nome"],
  ["configuracoes", "id"],
  ["bens_depreciacao", "bem"],
  ["produtos", "nome"],
  ["pecas", "numero"],
  ["custos_adicionais", "created_at"],
  ["produto_trabalhos", "created_at"],
  ["faixas_atacado", "qtd_min"],
  ["concorrentes", "created_at"],
];

const VAZIO = Object.fromEntries(TABELAS.map(([t]) => [t, []]));

/** Carrega o banco inteiro de uma vez. O volume aqui é pequeno (dezenas de linhas). */
export function useDados() {
  const [dados, setDados] = React.useState(VAZIO);
  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState(null);

  const carregar = React.useCallback(async () => {
    setCarregando(true);
    try {
      const res = await Promise.all(
        TABELAS.map(([t, ord]) => supabase.from(t).select("*").order(ord))
      );
      const falha = res.find((r) => r.error);
      if (falha) throw falha.error;
      setDados(Object.fromEntries(TABELAS.map(([t], i) => [t, res[i].data || []])));
      setErro(null);
    } catch (e) {
      setErro(e.message || "Não foi possível ler o banco.");
    } finally {
      setCarregando(false);
    }
  }, []);

  React.useEffect(() => { carregar(); }, [carregar]);

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
  const { data, error } = await supabase.from(tabela).update(campos).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function inserirLinha(tabela, campos) {
  const { data, error } = await supabase.from(tabela).insert(campos).select().single();
  if (error) throw error;
  return data;
}

export async function removerLinha(tabela, id) {
  const { error } = await supabase.from(tabela).delete().eq("id", id);
  if (error) throw error;
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


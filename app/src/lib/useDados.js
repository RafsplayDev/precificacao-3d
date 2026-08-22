"use client";
import React from "react";
import { supabase } from "./supabaseClient";

const TABELAS = [
  ["impressoras", "nome"],
  ["filamentos", "nome"],
  ["marketplaces", "nome"],
  ["bens_depreciacao", "bem"],
  ["produtos", "nome"],
  ["pecas", "numero"],
  ["custos_adicionais", "created_at"],
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

  return { ...dados, carregando, erro, recarregar: carregar };
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

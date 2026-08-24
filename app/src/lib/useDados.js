"use client";
import React from "react";
import { supabase } from "./supabaseClient";
import { ehTeste } from "./modo";
import { listarLocal, inserirLocal, atualizarLocal, removerLocal, temDadosDeTeste } from "./dadosLocais";
import { migrarTesteParaConta } from "./migrarTeste";

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
      if (ehTeste()) {
        // No teste o "banco" é o localStorage. A leitura é síncrona, mas a
        // função continua async para as telas não precisarem saber disso.
        setDados(Object.fromEntries(TABELAS.map(([t, ord]) => [t, listarLocal(t, ord)])));
        setErro(null);
        return;
      }

      // A licença acabou de ser liberada e o teste ficou para trás: o que
      // a pessoa digitou antes de pagar sobe agora, antes da primeira
      // leitura — senão ela veria a tela vazia e acharia que perdeu tudo.
      if (temDadosDeTeste()) {
        try {
          await migrarTesteParaConta();
        } catch {
          // Falhou? Os dados locais continuam guardados e a próxima carga
          // tenta de novo. Travar o app por causa disso seria pior.
        }
      }

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

  return { ...dados, carregando, erro, teste: ehTeste(), recarregar: carregar, aplicar, remover };
}

/**
 * As três escritas do app inteiro.
 *
 * Toda tela passa por aqui — é por isso que o modo teste coube num `if`:
 * trocar o destino da escrita neste ponto troca o destino de tudo, sem que
 * TabelaEditavel, produtos ou a calculadora precisem saber que existe um
 * modo teste. O formato do retorno é o mesmo dos dois lados.
 */

/** Escreve uma linha e devolve o registro atualizado. */
export async function salvarLinha(tabela, id, campos) {
  if (ehTeste()) return atualizarLocal(tabela, id, campos);
  const { data, error } = await supabase.from(tabela).update(campos).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function inserirLinha(tabela, campos) {
  if (ehTeste()) return inserirLocal(tabela, campos);
  const { data, error } = await supabase.from(tabela).insert(campos).select().single();
  if (error) throw error;
  return data;
}

export async function removerLinha(tabela, id) {
  if (ehTeste()) return removerLocal(tabela, id);
  const { error } = await supabase.from(tabela).delete().eq("id", id);
  if (error) throw error;
}

export function tratarMensagemErro(e, tabela) {
  if (!e) return "Ocorreu um erro inesperado.";
  const code = e.code;

  // O limite do teste não é uma falha do banco: a mensagem já vem pronta,
  // escrita para quem está decidindo se compra.
  if (code === "LIMITE_TESTE") return e.message;

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


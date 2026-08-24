"use client";
import { supabase } from "./supabaseClient";
import { listarLocal, limparTeste, temDadosDeTeste } from "./dadosLocais";

/**
 * Levar o teste para a conta.
 *
 * A promessa feita na oferta é curta e cara: "o que você já digitou vai
 * junto". Quem preencheu a impressora, o filamento e o produto inteiro
 * antes de pagar não pode chegar do outro lado numa tela em branco — seria
 * cobrar R$ 34,90 para recomeçar do zero.
 *
 * Três cuidados fazem isso funcionar:
 *
 *  • Ordem. Peça aponta para impressora e filamento; produto aponta para
 *    marketplace. Os pais sobem primeiro, sempre.
 *  • Tradução de id. O id local nasce no navegador e o Supabase pode
 *    recusá-lo (o trigger `semear_conta` já criou "Venda Direta" na conta,
 *    e o nome é unique). Cada tabela devolve um mapa id-local → id-real, e
 *    os filhos são reescritos com ele antes de subir.
 *  • Colunas calculadas. `custo_por_grama` e companhia são `generated
 *    always` no Postgres: mandá-las de volta é erro na hora do insert.
 *
 * A limpeza do localStorage só acontece se tudo subiu. Falhou no meio, os
 * dados de teste continuam lá e a próxima carga tenta de novo — perder o
 * trabalho da pessoa por causa de uma queda de rede seria o pior desfecho.
 */

/** Colunas `generated always`: o banco recalcula, e recusa se vierem no insert. */
const CALCULADAS = [
  "nivel_desgaste", "uso_estimado_anual_hrs", "hr_ano", "valor_adicionar_hr",
  "custo_por_grama", "custo_unitario", "custo_minuto",
  "vida_util_anos", "depreciacao_mensal",
];

/**
 * A ordem da subida. `pai` diz quais colunas apontam para outra tabela e
 * precisam do id traduzido; `nome` marca as tabelas em que uma linha de
 * mesmo nome já existente na conta é reaproveitada em vez de duplicada.
 */
const ETAPAS = [
  { tabela: "impressoras", nome: "nome" },
  { tabela: "filamentos", nome: "nome" },
  { tabela: "insumos", nome: "nome" },
  { tabela: "maos_obra", nome: "nome" },
  { tabela: "marketplaces", nome: "nome" },
  { tabela: "bens_depreciacao" },
  { tabela: "produtos", nome: "nome", pai: { marketplace_id: "marketplaces" } },
  { tabela: "pecas", pai: { produto_id: "produtos", impressora_id: "impressoras", filamento_id: "filamentos" } },
  { tabela: "custos_adicionais", pai: { produto_id: "produtos", insumo_id: "insumos" } },
  { tabela: "produto_trabalhos", pai: { produto_id: "produtos", mao_obra_id: "maos_obra" } },
  { tabela: "faixas_atacado", pai: { produto_id: "produtos" } },
  { tabela: "concorrentes", pai: { produto_id: "produtos" } },
];

export async function migrarTesteParaConta() {
  if (!temDadosDeTeste()) return { migrou: false };

  const mapas = {};

  for (const { tabela, nome, pai } of ETAPAS) {
    const locais = listarLocal(tabela);
    mapas[tabela] = {};
    if (locais.length === 0) continue;

    // Quem já está na conta (o trigger de boas-vindas semeou algumas linhas).
    const existentes = nome
      ? (await supabase.from(tabela).select(`id, ${nome}`)).data || []
      : [];

    for (const linha of locais) {
      const igual = nome && existentes.find((e) => chave(e[nome]) === chave(linha[nome]));
      if (igual) {
        mapas[tabela][linha.id] = igual.id;
        continue;
      }

      const campos = limpar(linha);
      for (const [coluna, alvo] of Object.entries(pai || {})) {
        if (campos[coluna]) campos[coluna] = mapas[alvo]?.[campos[coluna]] ?? null;
      }

      const { data, error } = await supabase.from(tabela).insert(campos).select("id").single();
      if (error) throw error;
      mapas[tabela][linha.id] = data.id;
    }
  }

  // Configurações não é lista: a conta já tem a linha dela, então a tarifa
  // e os markups digitados no teste substituem os padrões.
  const cfg = listarLocal("configuracoes")[0];
  if (cfg) {
    const { id, user_id, atualizado_em, _semente, ...campos } = cfg;
    await supabase.from("configuracoes").update(campos).not("user_id", "is", null);
  }

  limparTeste();
  return { migrou: true };
}

const chave = (v) => String(v ?? "").trim().toLowerCase();

/** Tira o que o banco preenche sozinho e o que ele recusa receber. */
function limpar(linha) {
  const campos = { ...linha };
  delete campos.id;
  delete campos.created_at;
  delete campos.user_id;
  delete campos._semente;
  for (const c of CALCULADAS) delete campos[c];
  return campos;
}

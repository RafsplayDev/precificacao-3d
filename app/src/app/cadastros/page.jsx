"use client";
import React from "react";
import { Card, Tabs, Badge } from "@/design-system";
import { useDados } from "@/lib/useDados";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { money } from "@/lib/format";
import { depreciacaoTotal } from "@/lib/calc";

const ABAS = [
  { id: "impressoras", label: "Impressoras" },
  { id: "filamentos", label: "Filamentos" },
  { id: "marketplaces", label: "Marketplaces" },
  { id: "bens", label: "Depreciação" },
];

const COLUNAS = {
  impressoras: [
    { key: "nome", label: "Impressora", tipo: "texto" },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "tempo_retorno_meses", label: "Retorno (meses)", tipo: "numero" },
    { key: "valor_maquina", label: "Valor (R$)", tipo: "numero" },
    { key: "hrs_dia", label: "Hrs/dia", tipo: "numero" },
    { key: "dias_mes", label: "Dias/mês", tipo: "numero" },
    { key: "potencia_kw", label: "Potência (kW)", tipo: "numero" },
    { key: "nivel_uso", label: "Nível de uso", tipo: "select",
      options: ["Basico", "Medio", "Profissional", "Intenso"] },
    { key: "percent_falhas", label: "Falhas (%)", tipo: "percent" },
    { key: "nivel_desgaste", label: "Desgaste", tipo: "calc", formato: "percent" },
    { key: "valor_adicionar_hr", label: "R$/hora", tipo: "calc", formato: "moeda" },
  ],
  filamentos: [
    { key: "nome", label: "Filamento", tipo: "texto" },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "descricao", label: "Descrição", tipo: "texto" },
    { key: "peso_carretel_kg", label: "Carretel (kg)", tipo: "numero" },
    { key: "comprimento_carretel_m", label: "Comprimento (m)", tipo: "numero" },
    { key: "custo_brl", label: "Custo (R$)", tipo: "numero" },
    { key: "custo_por_grama", label: "R$/grama", tipo: "calc", formato: "moeda" },
  ],
  marketplaces: [
    { key: "nome", label: "Operação", tipo: "texto" },
    { key: "preco_fixo", label: "Taxa fixa (R$)", tipo: "numero" },
    { key: "taxa_percent", label: "Comissão (%)", tipo: "percent" },
  ],
  bens: [
    { key: "bem", label: "Bem", tipo: "texto" },
    { key: "valor_aquisicao", label: "Aquisição (R$)", tipo: "numero" },
    { key: "vida_util_meses", label: "Vida útil (meses)", tipo: "numero" },
    { key: "taxa_anual", label: "Taxa anual (%)", tipo: "percent" },
    { key: "depreciacao_mensal", label: "Depreciação/mês", tipo: "calc", formato: "moeda" },
  ],
};

const NOVOS = {
  impressoras: () => ({
    nome: "Nova impressora", marca: "", tempo_retorno_meses: 10, valor_maquina: 0,
    hrs_dia: 20, dias_mes: 25, potencia_kw: 0.5, nivel_uso: "Medio", percent_falhas: 0.05,
  }),
  filamentos: () => ({
    nome: "Novo filamento", marca: "", descricao: "",
    peso_carretel_kg: 1, comprimento_carretel_m: 335, custo_brl: 0,
  }),
  marketplaces: () => ({ nome: "Novo canal", preco_fixo: 0, taxa_percent: 0 }),
  bens: () => ({ bem: "Novo bem", valor_aquisicao: 0, vida_util_meses: 12, taxa_anual: 0.1 }),
};

const TABELA_DB = { impressoras: "impressoras", filamentos: "filamentos", marketplaces: "marketplaces", bens: "bens_depreciacao" };

const TEXTOS = {
  impressoras: "Nível de uso define o desgaste aplicado na manutenção: básico 10%, médio 20%, profissional 30%, intenso 45%.",
  filamentos: "O custo do material sai daqui: custo do carretel dividido pelo peso, multiplicado pelos gramas da peça.",
  marketplaces: "O preço de venda vira (preço base + taxa fixa) ÷ (1 − comissão), então a taxa não come sua margem.",
  bens: "Depreciação fiscal de todos os bens do negócio. A soma mensal entra no custo de depreciação de cada peça.",
};

export default function Cadastros() {
  const d = useDados();
  const [aba, setAba] = React.useState("impressoras");

  const linhas = aba === "bens" ? d.bens_depreciacao : d[aba];
  const total = depreciacaoTotal(d.bens_depreciacao);

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          <span className="dc-eyebrow">CADASTROS</span>
          <h1 style={{ marginTop: 6 }}>O que a calculadora usa</h1>
          <p>Máquina, filamento, canal de venda e bens. Cada campo aqui muda o custo de todo produto.</p>
        </div>
      </div>

      <div style={{ marginBottom: "var(--space-6)" }}>
        <Tabs
          variant="underline"
          items={ABAS.map((a) => ({
            ...a,
            count: (a.id === "bens" ? d.bens_depreciacao : d[a.id] || []).length,
          }))}
          value={aba}
          onChange={setAba}
        />
      </div>

      <Card padding="var(--space-6)">
        <div className="ap-sectionhead">
          <h2>{ABAS.find((a) => a.id === aba).label}</h2>
          {aba === "bens" && <Badge tone="info" variant="soft">{money(total)} / MÊS</Badge>}
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)", maxWidth: "var(--max-prose)", marginTop: 0 }}>
          {TEXTOS[aba]}
        </p>

        {d.erro ? (
          <p style={{ color: "var(--status-danger)", fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)" }}>
            {d.erro}
          </p>
        ) : (
          <TabelaEditavel
            tabela={TABELA_DB[aba]}
            colunas={COLUNAS[aba]}
            linhas={linhas}
            novoRegistro={NOVOS[aba]}
            recarregar={d.recarregar}
          />
        )}
      </Card>
    </div>
  );
}

"use client";
import React from "react";
import { Card, Tabs, Badge } from "@/design-system";
import { useDados } from "@/lib/useDados";
import { useTutorial } from "@/components/Tutorial";
import { Explicacao } from "@/components/Explicacao";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { money } from "@/lib/format";
import { depreciacaoTotal } from "@/lib/calc";

const ABAS = [
  { id: "impressoras", label: "Impressoras" },
  { id: "filamentos", label: "Filamentos" },
  { id: "insumos", label: "Insumos" },
  { id: "maos_obra", label: "Mão de obra" },
  { id: "marketplaces", label: "Marketplaces" },
  { id: "bens", label: "Depreciação" },
  { id: "geral", label: "Geral" },
];

/**
 * Como o insumo é comprado. Só as medidas que aparecem de verdade numa
 * operação de impressão 3D — argola por unidade, tinta por litro, fita por metro.
 */
export const TIPOS_INSUMO = [
  { id: "Unidade", label: "Unidade", unidades: ["un"], rotuloQtd: "Quantas unidades vieram" },
  { id: "Volume", label: "Volume", unidades: ["ml", "L"], rotuloQtd: "Quanto vem na embalagem" },
  { id: "Peso", label: "Peso", unidades: ["g", "kg"], rotuloQtd: "Quanto vem na embalagem" },
  { id: "Comprimento", label: "Comprimento", unidades: ["cm", "m"], rotuloQtd: "Quanto vem no rolo" },
];

const tipoDe = (linha) => TIPOS_INSUMO.find((t) => t.id === linha?.tipo) || TIPOS_INSUMO[0];

const COLUNAS = {
  impressoras: [
    { key: "nome", label: "Impressora", tipo: "texto", estica: true },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "tempo_retorno_meses", label: "Retorno (meses)", tipo: "numero" },
    { key: "valor_maquina", label: "Valor (R$)", tipo: "moeda" },
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
    { key: "nome", label: "Filamento", tipo: "texto", estica: true },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "descricao", label: "Descrição", tipo: "texto" },
    { key: "peso_carretel_kg", label: "Carretel (kg)", tipo: "numero" },
    { key: "comprimento_carretel_m", label: "Comprimento (m)", tipo: "numero" },
    { key: "custo_brl", label: "Custo (R$)", tipo: "moeda" },
    { key: "custo_por_grama", label: "R$/grama", tipo: "calc", formato: "moeda" },
  ],
  insumos: [
    { key: "nome", label: "Insumo", tipo: "texto", estica: true },
    { key: "marca", label: "Marca", tipo: "texto" },
    { key: "tipo", label: "Medido por", tipo: "select",
      options: TIPOS_INSUMO.map((t) => ({ value: t.id, label: t.label })),
      // trocar a medida troca a unidade para a primeira daquele tipo
      aoMudar: (valor) => ({ unidade: (TIPOS_INSUMO.find((t) => t.id === valor) || TIPOS_INSUMO[0]).unidades[0] }) },
    { key: "unidade", label: "Unidade", tipo: "select",
      options: (linha) => tipoDe(linha).unidades },
    { key: "valor_pago", label: "Valor pago (R$)", tipo: "moeda" },
    { key: "qtd_pecas", label: "Qtd no pacote", tipo: "numero",
      rotulo: (linha) => `${tipoDe(linha).rotuloQtd}${linha?.unidade ? ` (${linha.unidade})` : ""}` },
    { key: "custo_unitario", label: "Custo por unidade", tipo: "calc", formato: "moeda" },
  ],
  maos_obra: [
    { key: "nome", label: "Tipo de trabalho", tipo: "texto", estica: true },
    { key: "categoria", label: "Categoria", tipo: "select",
      options: [
        { value: "Producao", label: "Produção" },
        { value: "Acabamento", label: "Acabamento" },
        { value: "Modelagem", label: "Modelagem" },
      ] },
    { key: "descricao", label: "Descrição", tipo: "texto" },
    { key: "custo_hora", label: "Custo/hora (R$)", tipo: "moeda" },
    { key: "custo_minuto", label: "Custo/minuto", tipo: "calc", formato: "moeda" },
  ],
  marketplaces: [
    { key: "nome", label: "Operação", tipo: "texto", estica: true },
    { key: "preco_fixo", label: "Taxa fixa (R$)", tipo: "moeda" },
    { key: "taxa_percent", label: "Comissão (%)", tipo: "percent" },
  ],
  geral: [],
  bens: [
    { key: "bem", label: "Bem", tipo: "texto", estica: true },
    { key: "valor_aquisicao", label: "Aquisição (R$)", tipo: "moeda" },
    { key: "vida_util_meses", label: "Vida útil (meses)", tipo: "numero" },
    { key: "taxa_anual", label: "Taxa anual (%)", tipo: "percent" },
    { key: "depreciacao_mensal", label: "Depreciação/mês", tipo: "calc", formato: "moeda" },
  ],
};

const NOVOS = {
  impressoras: (linhas = []) => {
    let nome = "Nova impressora";
    let count = 1;
    while (linhas.some((l) => l.nome === nome)) {
      count++;
      nome = `Nova impressora ${count}`;
    }
    return {
      nome, marca: "", tempo_retorno_meses: 10, valor_maquina: 0,
      hrs_dia: 20, dias_mes: 25, potencia_kw: 0.5, nivel_uso: "Medio", percent_falhas: 0.05,
    };
  },
  filamentos: (linhas = []) => {
    let nome = "Novo filamento";
    let count = 1;
    while (linhas.some((l) => l.nome === nome)) {
      count++;
      nome = `Novo filamento ${count}`;
    }
    return {
      nome, marca: "", descricao: "",
      peso_carretel_kg: 1, comprimento_carretel_m: 335, custo_brl: 0,
    };
  },
  insumos: (linhas = []) => {
    let nome = "Novo insumo";
    let count = 1;
    while (linhas.some((l) => l.nome === nome)) {
      count++;
      nome = `Novo insumo ${count}`;
    }
    return { nome, marca: "", descricao: "", tipo: "Unidade", unidade: "un", valor_pago: 0, qtd_pecas: 1 };
  },
  maos_obra: (linhas = []) => {
    let nome = "Novo trabalho";
    let count = 1;
    while (linhas.some((l) => l.nome === nome)) {
      count++;
      nome = `Novo trabalho ${count}`;
    }
    return { nome, categoria: "Producao", descricao: "", custo_hora: 0 };
  },
  marketplaces: (linhas = []) => {
    let nome = "Novo canal";
    let count = 1;
    while (linhas.some((l) => l.nome === nome)) {
      count++;
      nome = `Novo canal ${count}`;
    }
    return { nome, preco_fixo: 0, taxa_percent: 0 };
  },
  bens: (linhas = []) => {
    let bem = "Novo bem";
    let count = 1;
    while (linhas.some((l) => l.bem === bem)) {
      count++;
      bem = `Novo bem ${count}`;
    }
    return { bem, valor_aquisicao: 0, vida_util_meses: 12, taxa_anual: 0.1 };
  },
};

const TABELA_DB = { impressoras: "impressoras", filamentos: "filamentos", insumos: "insumos", maos_obra: "maos_obra", geral: "configuracoes", marketplaces: "marketplaces", bens: "bens_depreciacao" };

const ROTULOS = {
  impressoras: "impressora", filamentos: "filamento", insumos: "insumo",
  maos_obra: "trabalho", marketplaces: "canal", bens: "bem", geral: "",
};

/** A aba Geral guarda assuntos diferentes na mesma linha do banco. */
const SECOES_GERAL = [
  {
    id: "energia",
    titulo: "Energia",
    texto: "A tarifa é a mesma para tudo que você imprime — vem da sua conta de luz, não da peça. O custo de energia de cada peça é horas × potência da impressora × esta tarifa.",
    // Só a tarifa. O nome da concessionária não entra em conta nenhuma —
    // era um campo a preencher que não mudava um centavo do preço.
    colunas: [{ key: "tarifa_kwh", label: "Tarifa kWh (R$)", tipo: "moeda", estica: true }],
  },
  {
    id: "markup",
    titulo: "Markup e atacado",
    texto: "O multiplicador que a calculadora usa em todos os produtos e a partir de quantas peças um pedido conta como atacado.",
    colunas: [
      // as três esticam: dividem a largura do card em partes iguais
      { key: "markup_varejo_padrao", label: "Markup varejo", tipo: "numero", estica: true },
      { key: "markup_atacado_padrao", label: "Markup atacado", tipo: "numero", estica: true },
      { key: "qtd_atacado_padrao", label: "Atacado a partir de (und)", tipo: "numero", estica: true },
    ],
  },
];

const TEXTOS = {
  impressoras: "Nível de uso define o desgaste aplicado na manutenção: básico 10%, médio 20%, profissional 30%, intenso 45%.",
  filamentos: "O custo do material sai daqui: custo do carretel dividido pelo peso, multiplicado pelos gramas da peça.",
  insumos: "Argola, saquinho, ímã — mas também tinta em ml, fita em metros, resina em gramas. Diga quanto pagou e quanto veio no pacote, na unidade que fizer sentido; o custo por unidade sai da divisão e entra sozinho nos custos do produto.",
  maos_obra: "Produção, acabamento e modelagem podem valer valores diferentes por hora. Cada produto escolhe quais tipos usa e por quantos minutos.",
  marketplaces: "O preço de venda vira (preço base + taxa fixa) ÷ (1 − comissão), então a taxa não come sua margem.",
  geral: "Valores que valem para o negócio inteiro. A tarifa de energia entra no custo de cada peça (horas × potência × tarifa). Os markups valem para todos os produtos da calculadora.",
  bens: "Depreciação fiscal de todos os bens do negócio. A soma mensal entra no custo de depreciação de cada peça.",
};

/**
 * O formulário curto do tutorial.
 *
 * No roteiro, o cadastro completo era um paredão: onze campos para uma
 * pessoa que ainda não sabe se o app serve para ela. Aqui ficam só os
 * campos que ela precisa responder com um número dela — o resto continua
 * existindo, com os padrões que o cadastro já usava, e pode ser ajustado
 * depois na tabela.
 */
const FORM_TUTORIAL = {
  impressoras: ["nome", "valor_maquina"],
  filamentos: ["nome", "peso_carretel_kg", "custo_brl"],
};

export default function Cadastros() {
  const d = useDados();
  const [aba, setAba] = React.useState("impressoras");
  const { passo, ativo } = useTutorial();

  const curto = ativo && FORM_TUTORIAL[aba];
  const colunasCurtas = React.useMemo(
    () => (curto ? COLUNAS[aba].filter((c) => curto.includes(c.key)) : undefined),
    [curto, aba]
  );

  // O tutorial troca de aba por conta própria. Sem isso o texto falaria de
  // filamento enquanto a tela ainda mostra impressoras, e o destaque cairia
  // sobre a tabela errada.
  React.useEffect(() => {
    if (passo?.aba) setAba(passo.aba);
  }, [passo?.aba]);

  const linhas = aba === "bens" ? d.bens_depreciacao : aba === "geral" ? d.configuracoes : d[aba];
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

      <div style={{ marginBottom: "var(--space-6)" }} data-tutorial="cadastros-abas">
        <Tabs
          variant="underline"
          items={ABAS.map((a) => ({
            ...a,
            count: a.id === "geral"
              ? undefined
              : (a.id === "bens" ? d.bens_depreciacao : d[a.id] || []).length,
          }))}
          value={aba}
          onChange={setAba}
        />
      </div>

      {d.erro ? (
        <Card padding="var(--space-6)">
          <p style={{ color: "var(--status-danger)", fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)" }}>
            {d.erro}
          </p>
        </Card>
      ) : aba === "geral" ? (
        <div className="ap-grid ap-grid--2">
          {SECOES_GERAL.map((sec) => (
            <Card key={sec.id} padding="var(--space-6)" data-tutorial={`geral-${sec.id}`}>
              <div className="ap-sectionhead ap-sectionhead--tight">
                <h2>
                  {sec.titulo}
                  <Explicacao rotulo={`Como funciona: ${sec.titulo}`}>{sec.texto}</Explicacao>
                </h2>
              </div>
              <TabelaEditavel
                tabela="configuracoes"
                colunas={sec.colunas}
                linhas={d.configuracoes}
                semRemover
                recarregar={d.recarregar}
                aplicar={d.aplicar}
                remover={d.remover}
              />
            </Card>
          ))}
        </div>
      ) : (
        <Card padding="var(--space-6)" data-tutorial="cadastros-tabela">
          <div className="ap-sectionhead">
            <h2>
              {ABAS.find((a) => a.id === aba).label}
              <Explicacao rotulo={`Como funciona: ${ABAS.find((a) => a.id === aba).label}`}>
                {TEXTOS[aba]}
              </Explicacao>
            </h2>
            {aba === "bens" && <Badge tone="info" variant="soft">{money(total)} / MÊS</Badge>}
          </div>
          <TabelaEditavel
            tabela={TABELA_DB[aba]}
            colunas={COLUNAS[aba]}
            colunasFormulario={colunasCurtas}
            obrigatorios={curto || undefined}
            linhas={linhas}
            novoRegistro={NOVOS[aba]}
            rotulo={ROTULOS[aba]}
            recarregar={d.recarregar}
            aplicar={d.aplicar}
            remover={d.remover}
          />
        </Card>
      )}
    </div>
  );
}

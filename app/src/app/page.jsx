"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Card, Button, Select, Badge, Icon, IconButton, Tabs, Checkbox, Dialog, Input } from "@/design-system";
import { useDados, salvarLinha, inserirLinha, removerLinha } from "@/lib/useDados";
import { useToast } from "@/components/AppShell";
import { custosProduto, cenarioUnitario, cenarioDesconto, precoComMarketplace, LINHAS_CUSTO, valorAdicional, valorTrabalho } from "@/lib/calc";
import { money, moneyPrecise, pct, num, toNum, mascaraMoeda, moedaParaNumero, numeroParaMoeda } from "@/lib/format";

/** Os grupos da tabela de custos — o filtro em cima da tabela. */
const GRUPOS = [
  { id: "tudo", label: "Tudo" },
  { id: "material", label: "Material", cor: "var(--fil-magenta)" },
  { id: "maquina", label: "Máquina", cor: "var(--fil-cyan)" },
  { id: "trabalho", label: "Trabalho", cor: "var(--ink-300)" },
  { id: "insumos", label: "Insumos", cor: "var(--fil-mint)" },
];

const GRUPO_DA_LINHA = {
  custo_material: "material",
  custo_falhas: "material",
  custo_acabamento: "material",
  custo_energia: "maquina",
  custo_manutencao: "maquina",
  retorno_investimento: "maquina",
  custo_depreciacao: "maquina",
};

export default function Calculadora() {
  const d = useDados();
  const router = useRouter();
  const toast = useToast();
  const [produtoId, setProdutoId] = React.useState("");
  const [canal, setCanal] = React.useState("varejo");
  const [rascunho, setRascunho] = React.useState(null);
  const [grupo, setGrupo] = React.useState("tudo");
  const [desativados, setDesativados] = React.useState([]);
  const [modoFaixa, setModoFaixa] = React.useState("preco");
  const [pecaSel, setPecaSel] = React.useState(null);       // null = todas
  const [faixaSel, setFaixaSel] = React.useState(null);     // null = faixa geral
  const [faixaEdicao, setFaixaEdicao] = React.useState(null); // {novo:true} ou a faixa
  const [qtdVenda, setQtdVenda] = React.useState(10);       // simulação por unidades vendidas

  const alternar = (chave) =>
    setDesativados((atual) =>
      atual.includes(chave) ? atual.filter((k) => k !== chave) : [...atual, chave]
    );

  const produtos = d.produtos;
  React.useEffect(() => {
    if (!produtoId && produtos.length) setProdutoId(produtos[0].id);
  }, [produtos, produtoId]);

  const produtoSalvo = produtos.find((p) => p.id === produtoId) || null;
  const produto = rascunho && rascunho.id === produtoId ? rascunho : produtoSalvo;

  const patch = (campos) => setRascunho({ ...(produto || {}), ...campos });

  /** `silencioso` para ajustes de visualização, que não merecem aviso de salvo. */
  async function persistir(campos, silencioso = false) {
    if (!produto) return;
    try {
      const salvo = await salvarLinha("produtos", produto.id, campos);
      d.aplicar("produtos", salvo);
      setRascunho(null);
      if (!silencioso) toast({ title: "Alteração salva", message: produto.nome });
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para salvar", message: e.message });
    }
  }

  // Entrando em atacado com preço definido sem preço base, adota o sugerido.
  React.useEffect(() => {
    if (canal !== "atacado" || produto?.usar_preco !== "Final") return;
    if (toNum(produto.preco_final_atacado) > 0) return;
    const sugerido = custosProduto({
      produto, pecas: d.pecas.filter((p) => p.produto_id === produto.id),
      impressoras: d.impressoras, filamentos: d.filamentos,
      adicionais: d.custos_adicionais.filter((c) => c.produto_id === produto.id),
      insumos: d.insumos,
      trabalhos: d.produto_trabalhos.filter((t) => t.produto_id === produto.id),
      maosObra: d.maos_obra, bens: d.bens_depreciacao,
      tarifaKwh: d.configuracoes[0]?.tarifa_kwh ?? 0,
    }).custos_totais * toNum(produto.markup_atacado);
    if (sugerido > 0) persistir({ preco_final_atacado: sugerido }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, produto?.id, produto?.usar_preco]);

  /**
   * O que a faixa em edição pode receber: ela começa depois da anterior,
   * cobra menos que ela e nunca abaixo do custo.
   */
  function limitesDaFaixa(alvo) {
    const ordenadas = [...faixas].sort((a, b) => toNum(a.qtd_min) - toNum(b.qtd_min));
    const anteriores = alvo?.novo
      ? ordenadas
      : ordenadas.filter((f) => toNum(f.qtd_min) < toNum(alvo?.qtd_min));
    const anterior = anteriores[anteriores.length - 1] || null;

    const precoAnterior = anterior ? toNum(anterior.preco_final) : toNum(produto.preco_final_atacado);
    const qtdAnterior = anterior
      ? toNum(anterior.qtd_max) || toNum(anterior.qtd_min)
      : toNum(produto.qtd_atacado);
    const precoGeral = toNum(produto.preco_final_atacado);

    return {
      qtdMinima: qtdAnterior + 1,
      precoMaximo: precoAnterior,
      precoMinimo: unit.custo_unitario,
      descontoMinimo: precoGeral ? (1 - precoAnterior / precoGeral) * 100 : 0,
      descontoMaximo: precoGeral ? (1 - unit.custo_unitario / precoGeral) * 100 : 100,
    };
  }

  async function salvarFaixa(campos) {
    try {
      if (faixaEdicao?.geral) {
        await persistir(
          { qtd_atacado: campos.qtd_min, preco_final_atacado: campos.preco_final },
          true
        );
      } else if (faixaEdicao?.novo) {
        const criada = await inserirLinha("faixas_atacado", { produto_id: produto.id, ...campos });
        d.aplicar("faixas_atacado", criada);
      } else {
        const salva = await salvarLinha("faixas_atacado", faixaEdicao.id, campos);
        d.aplicar("faixas_atacado", salva);
      }
      setFaixaEdicao(null);
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível salvar a faixa", message: e.message });
    }
  }

  async function excluirFaixa(faixa) {
    try {
      await removerLinha("faixas_atacado", faixa.id);
      d.remover("faixas_atacado", faixa.id);
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível remover", message: e.message });
    }
  }

  if (d.erro) return <ErroBanco mensagem={d.erro} />;
  if (d.carregando) return <Carregando />;
  if (!produto) return <SemProduto />;

  const pecas = d.pecas.filter((p) => p.produto_id === produto.id);
  const adicionais = d.custos_adicionais.filter((c) => c.produto_id === produto.id);
  const trabalhos = d.produto_trabalhos.filter((t) => t.produto_id === produto.id);
  const marketplace = d.marketplaces.find((m) => m.id === produto.marketplace_id) || null;

  const c = custosProduto({
    produto,
    pecas,
    impressoras: d.impressoras,
    filamentos: d.filamentos,
    adicionais,
    insumos: d.insumos,
    trabalhos,
    maosObra: d.maos_obra,
    bens: d.bens_depreciacao,
    tarifaKwh: d.configuracoes[0]?.tarifa_kwh ?? 0,
  });

  // Uma linha por item de custo, com o grupo a que pertence — a tabela abaixo
  // filtra por grupo e liga/desliga cada linha do total.
  const itensBrutos = [
    ...LINHAS_CUSTO.map((l) => ({
      grupo: GRUPO_DA_LINHA[l.key], chave: l.key, label: l.label, cor: l.cor, valor: c[l.key],
    })),
    ...trabalhos.map((t) => {
      const mo = d.maos_obra.find((m) => m.id === t.mao_obra_id);
      return {
        grupo: "trabalho", chave: `t-${t.id}`, cor: "var(--ink-300)",
        label: `${mo?.nome || "Trabalho"} — ${qtd(t.minutos)} min`,
        valor: valorTrabalho(t, d.maos_obra),
      };
    }),
    ...adicionais.map((a) => {
      const ins = d.insumos.find((i) => i.id === a.insumo_id);
      return {
        grupo: "insumos", chave: `a-${a.id}`, cor: "var(--fil-mint)",
        label: ins
          ? `${ins.nome} × ${qtd(a.quantidade)} ${ins.unidade || ""}`.trim()
          : a.nome || "Custo avulso",
        valor: valorAdicional(a, d.insumos),
      };
    }),
  ];

  // Desmarcar uma linha tira o valor dela de tudo: custo, markup, preço e simulação.
  const itens = itensBrutos.map((i) => ({ ...i, ativo: !desativados.includes(i.chave) }));
  const ativo = (i) => (i.ativo ? Number(i.valor) || 0 : 0);
  const custosTotais = itens.reduce((acc, i) => acc + ativo(i), 0);
  const somaGrupo = (g) => itens.reduce((acc, i) => acc + (i.grupo === g ? ativo(i) : 0), 0);
  const desligados = itens.length - itens.filter((i) => i.ativo).length;

  // Uma peça escolhida mostra a fatia dela nos custos de produção; trabalho e
  // insumos são do produto inteiro, então saem da lista nesse caso.
  const detalhePeca = pecaSel ? c.detalhes.find((x) => x.peca.id === pecaSel) : null;
  const paraExibir = itens
    .filter((i) => (detalhePeca ? i.chave in detalhePeca : true))
    .map((i) => (detalhePeca ? { ...i, valor: detalhePeca[i.chave] } : i))
    .filter((i) => Math.abs(Number(i.valor) || 0) > 0.00005); // linha zerada não diz nada

  const visiveis = grupo === "tudo" ? paraExibir : paraExibir.filter((i) => i.grupo === grupo);
  const somaVisivel = visiveis.reduce((acc, i) => acc + ativo(i), 0);

  // O check do cabeçalho vale para o que está na tela — se houver filtro de
  // grupo, ele liga/desliga só aquele grupo.
  const todosAtivos = visiveis.length > 0 && visiveis.every((i) => i.ativo);
  const alternarTodos = () => {
    const chaves = visiveis.map((i) => i.chave);
    setDesativados((atual) =>
      todosAtivos
        ? [...new Set([...atual, ...chaves])]
        : atual.filter((k) => !chaves.includes(k))
    );
  };

  const sugeridoAtacado = custosTotais * toNum(produto.markup_atacado);
  const sugeridoVarejo = custosTotais * toNum(produto.markup_varejo);


  const faixas = d.faixas_atacado.filter((f) => f.produto_id === produto.id);

  // No atacado com preço definido, o detalhamento segue a faixa escolhida.
  const faixaAtiva = faixas.find((f) => f.id === faixaSel) || null;
  const base =
    canal === "atacado"
      ? produto.usar_preco === "Final"
        ? toNum(faixaAtiva ? faixaAtiva.preco_final : produto.preco_final_atacado)
        : sugeridoAtacado
      : produto.usar_preco === "Final" ? toNum(produto.preco_final_varejo) : sugeridoVarejo;

  const unit = cenarioUnitario({
    base,
    marketplace,
    custosTotais,
    impostos: toNum(produto.impostos_percent),
  });



  /** Preço e lucro por peça numa faixa: o markup dela substitui o do produto. */
  const precoDaFaixa = (faixa) => {
    const base = toNum(faixa.preco_final);
    const preco_unitario = precoComMarketplace(base, marketplace);
    const taxas = preco_unitario - base;
    const custo = custosTotais + taxas;
    const lucro_unitario = preco_unitario - custo - preco_unitario * toNum(produto.impostos_percent);
    return { preco_unitario, lucro_unitario, margem_pct: preco_unitario ? lucro_unitario / preco_unitario : 0 };
  };

  const cfg = d.configuracoes[0];
  const padraoMarkup = toNum(canal === "atacado" ? cfg?.markup_atacado_padrao : cfg?.markup_varejo_padrao);

  const prefixo = canal === "atacado" ? "atacado" : "varejo";
  // Mesmo cenário do unitário, multiplicado pelas unidades vendidas.
  const lote = cenarioDesconto({
    unitario: unit,
    quantidade: qtdVenda,
    desconto: 0,
    ajusteCusto: 0,
    impostos: toNum(produto.impostos_percent),
  });

  const totalPilha = custosTotais + Math.max(unit.margem, 0);

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          {/* O próprio título troca de produto — nada de seletor repetido ao lado. */}
          <SeletorProduto
            produtos={produtos}
            atual={produto}
            onTrocar={(id) => { setRascunho(null); setDesativados([]); setPecaSel(null); setProdutoId(id); }}
            onNovo={() => router.push("/produtos?novo=1")}
          />
          {produto.descricao && <p>{produto.descricao}</p>}
        </div>
      </div>

      {/* ---- Assinatura: a pilha de custo e os preços sugeridos, lado a lado ---- */}
      <div className="ap-hero">
      <Card padding="var(--space-5)">
        <div className="ap-figuras">
          <div className="ap-figure">
            <span className="dc-eyebrow">CUSTO TOTAL POR UNIDADE</span>
            <span className="ap-figure__val ap-figure__val--lg">{money(custosTotais)}</span>
          </div>
          <div className="ap-figure ap-figure--accent ap-figure--dir">
            <span className="dc-eyebrow">MARGEM NO {canal === "atacado" ? "ATACADO" : "VAREJO"}</span>
            <span className="ap-figure__val ap-figure__val--lg">{money(unit.margem)}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", color: "var(--text-muted)" }}>
              {pct(unit.margem_pct)} do preço
            </span>
          </div>
        </div>
        <div className="ap-stack" aria-hidden>
          {GRUPOS.filter((g) => g.id !== "tudo").map((g) => (
            <span key={g.id} style={{ flexGrow: Math.max(somaGrupo(g.id), 0) / (totalPilha || 1), background: g.cor }} />
          ))}
          <span style={{ flexGrow: Math.max(unit.margem, 0) / (totalPilha || 1), background: "var(--ink-950)" }} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
          {GRUPOS.filter((g) => g.id !== "tudo").map((g) => (
            <Legenda key={g.id} cor={g.cor} texto={g.label.toLowerCase()} />
          ))}
          <Legenda cor="var(--ink-950)" texto="margem" />
        </div>
      </Card>

      <Card padding="var(--space-5)">
        <div className="ap-sectionhead ap-sectionhead--tight"><h2>Preço sugerido</h2></div>
        <div className="ap-sugeridos">
          <CartaoSugerido
            canal="varejo"
            rotulo="VAREJO"
            valor={sugeridoVarejo}
            markup={produto.markup_varejo}
            padrao={toNum(cfg?.markup_varejo_padrao)}
            ativo={canal === "varejo"}
            onSelecionar={() => setCanal("varejo")}
            onMarkup={(v) => persistir({ markup_varejo: v })}
          />
          <CartaoSugerido
            canal="atacado"
            rotulo="ATACADO"
            valor={sugeridoAtacado}
            markup={produto.markup_atacado}
            padrao={toNum(cfg?.markup_atacado_padrao)}
            ativo={canal === "atacado"}
            onSelecionar={() => setCanal("atacado")}
            onMarkup={(v) => persistir({ markup_atacado: v })}
          />
        </div>
        <div className="ap-rows" style={{ marginTop: "var(--space-4)" }}>
          <Linha label="Depreciação fiscal mensal (todos os bens)" valor={money(c.depreciacao_total_mensal)} />
        </div>
      </Card>
      </div>

      <div className="ap-grid ap-grid--main">
        {/* ============ COLUNA ESQUERDA: CUSTOS ============ */}
        <div style={{ display: "grid", gap: "var(--space-6)", alignContent: "start" }}>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Custos de produção</h2>
              {pecas.length > 1 ? (
                <div style={{ minWidth: 190 }}>
                  <Select
                    value={pecaSel || ""}
                    onChange={(e) => setPecaSel(e.target.value || null)}
                    options={[
                      { value: "", label: `Todas as peças (${pecas.length})` },
                      ...pecas.map((p) => ({ value: p.id, label: p.nome })),
                    ]}
                  />
                </div>
              ) : desligados > 0 ? (
                <Badge tone="warning" variant="soft">{desligados} FORA DO CÁLCULO</Badge>
              ) : (
                <Badge tone="neutral" variant="soft">{pecas.length} {pecas.length === 1 ? "PEÇA" : "PEÇAS"}</Badge>
              )}
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Tabs
                items={GRUPOS.map((g) => ({
                  ...g,
                  count: g.id === "tudo" ? paraExibir.length : paraExibir.filter((i) => i.grupo === g.id).length,
                }))}
                value={grupo}
                onChange={setGrupo}
              />
            </div>

            {pecas.length === 0 && itens.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)" }}>
                Este produto ainda não tem peça cadastrada. <Link href="/produtos">Cadastrar peça</Link>
              </p>
            ) : (
              <div className="ap-tablewrap">
                <table className="ap-table ap-table--custos">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <Checkbox
                          checked={todosAtivos}
                          onChange={alternarTodos}
                          label={
                            <span className="dc-sr-only">
                              {todosAtivos ? "Tirar tudo do cálculo" : "Contar tudo"}
                            </span>
                          }
                        />
                      </th>
                      <th>Item</th>
                      <th>Grupo</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                      <th style={{ textAlign: "right" }}>% do custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--text-muted)", padding: "var(--space-5) var(--space-3)" }}>
                          Nada lançado neste grupo.{" "}
                          <Link href="/produtos">Cadastrar em Produtos</Link>
                        </td>
                      </tr>
                    )}
                    {visiveis.map((i) => (
                      <tr key={i.chave} className={i.ativo ? undefined : "ap-tr--off"}>
                        <td>
                          <Checkbox
                            checked={i.ativo}
                            onChange={() => alternar(i.chave)}
                            label={<span className="dc-sr-only">{`Contar ${i.label}`}</span>}
                          />
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span className="ap-row__dot" style={{ background: i.cor }} />
                            {i.label}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)" }}>
                          {GRUPOS.find((g) => g.id === i.grupo)?.label}
                        </td>
                        <td className="ap-td--num" style={{ textAlign: "right" }}>{moneyPrecise(i.valor)}</td>
                        <td className="ap-td--num" style={{ textAlign: "right", color: "var(--text-muted)" }}>
                          {i.ativo ? pct((Number(i.valor) || 0) / (custosTotais || 1)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ap-rows" style={{ marginTop: "var(--space-4)" }}>
              {(grupo !== "tudo" || detalhePeca) && (
                <div className="ap-row">
                  <span className="ap-row__label">
                    Subtotal — {detalhePeca ? detalhePeca.peca.nome : ""}
                    {detalhePeca && grupo !== "tudo" ? " · " : ""}
                    {grupo !== "tudo" ? GRUPOS.find((g) => g.id === grupo)?.label : ""}
                  </span>
                  <span className="ap-row__val">{moneyPrecise(somaVisivel)}</span>
                </div>
              )}
              {desligados > 0 && (
                <div className="ap-row">
                  <span className="ap-row__label" style={{ color: "var(--text-muted)" }}>
                    Fora do cálculo
                  </span>
                  <span className="ap-row__val" style={{ color: "var(--text-muted)" }}>
                    −{moneyPrecise(c.custos_totais - custosTotais)}
                  </span>
                </div>
              )}
              <div className="ap-row ap-row--total">
                <span className="ap-row__label">Custos totais</span>
                <span className="ap-row__val">{moneyPrecise(custosTotais)}</span>
              </div>
            </div>
          </Card>

        </div>

        {/* ============ COLUNA DIREITA: PREÇO ============ */}
        <div style={{ display: "grid", gap: "var(--space-6)", alignContent: "start" }}>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Preço de venda</h2>
              <Tabs
                items={[
                  { id: "Sugerido", label: "Sugerido" },
                  { id: "Final", label: "Preço definido" },
                ]}
                value={produto.usar_preco}
                onChange={(v) => persistir({ usar_preco: v }, true)}
              />
            </div>

            <div className="ap-precofields">
              {/* o preço definido só faz sentido quando é ele a base do cálculo */}
              {produto.usar_preco === "Final" && canal === "varejo" && (
                <div>
                  <CampoNumero
                    label="Preço desejado" prefixo="R$" moeda
                    value={canal === "atacado" ? produto.preco_final_atacado : produto.preco_final_varejo}
                    onChange={(v) => patch({ [`preco_final_${prefixo}`]: v })}
                    onCommit={(v) => persistir({ [`preco_final_${prefixo}`]: v })}
                  />
                </div>
              )}
              {canal === "atacado" && produto.usar_preco === "Final" && (
                <div className="dc-field">
                  <span className="dc-field__label">Faixa definida por</span>
                  <Tabs
                    items={[{ id: "preco", label: "Preço" }, { id: "desconto", label: "% desconto" }]}
                    value={modoFaixa}
                    onChange={setModoFaixa}
                  />
                </div>
              )}
              <div>
                <Select
                  label="Marketplace"
                  value={produto.marketplace_id || ""}
                  onChange={(e) => persistir({ marketplace_id: e.target.value || null })}
                  options={[
                    { value: "", label: "Venda direta" },
                    ...d.marketplaces.map((m) => ({ value: m.id, label: m.nome })),
                  ]}
                />
              </div>
            </div>

            {canal === "atacado" && produto.usar_preco === "Final" && (
              <div style={{ marginTop: "var(--space-5)", minWidth: 0 }}>
                {/* clicar numa faixa faz o detalhamento abaixo falar dela */}
                <div className="ap-rows">
                  <LinhaFaixa
                    rotulo={`a partir de ${qtd(produto.qtd_atacado)} und`}
                    ativa={!faixaAtiva}
                    onSelecionar={() => setFaixaSel(null)}
                    onEditar={() => setFaixaEdicao({ geral: true })}
                  />
                  {faixas.map((f) => (
                    <LinhaFaixa
                      key={f.id}
                      rotulo={`${qtd(f.qtd_min)}${toNum(f.qtd_max) > 0 ? ` a ${qtd(f.qtd_max)}` : "+"} und`}
                      ativa={faixaAtiva?.id === f.id}
                      onSelecionar={() => setFaixaSel(f.id)}
                      onEditar={() => setFaixaEdicao(f)}
                      onExcluir={() => { if (faixaSel === f.id) setFaixaSel(null); excluirFaixa(f); }}
                    />
                  ))}
                </div>

                <div style={{ marginTop: "var(--space-3)" }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Icon name="plus" size={16} />}
                    onClick={() => setFaixaEdicao({ novo: true })}
                  >
                    Adicionar faixa
                  </Button>
                </div>
              </div>
            )}

            <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border-hairline)" }}>
              <span className="dc-eyebrow">
                PREÇO {canal === "atacado" ? "ATACADO" : "VAREJO"}
                {marketplace ? ` · ${marketplace.nome.toUpperCase()}` : " · VENDA DIRETA"}
              </span>
              <div className="ap-figure" style={{ marginTop: 6 }}>
                <span className="ap-figure__val ap-figure__val--lg">{money(unit.preco_unitario)}</span>
              </div>
              <div className="ap-rows" style={{ marginTop: "var(--space-4)" }}>
                <Linha label="Preço base (custo × markup)" valor={moneyPrecise(base)} />
                <Linha label="Taxas e custos do marketplace" valor={moneyPrecise(unit.taxas_mkt)} />
                <Linha label="Custo unitário total" valor={moneyPrecise(unit.custo_unitario)} />
                <Linha label={`Impostos (${pct(produto.impostos_percent, 2)})`} valor={moneyPrecise(unit.imposto)} />
                <div className="ap-row ap-row--total">
                  <span className="ap-row__label">Lucro líquido</span>
                  <span className="ap-row__val" style={{ color: unit.lucro_liquido < 0 ? "var(--status-danger)" : "var(--text-strong)" }}>
                    {money(unit.lucro_liquido)} · {pct(unit.lucro_liquido_pct)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "var(--space-4)", maxWidth: 200 }}>
                <CampoNumero
                  label="Impostos" sufixo="%" value={toNum(produto.impostos_percent) * 100}
                  onChange={(v) => patch({ impostos_percent: v / 100 })}
                  onCommit={(v) => persistir({ impostos_percent: v / 100 })}
                />
              </div>
            </div>

            <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-5)", borderTop: "1px solid var(--border-hairline)" }}>
              <span className="dc-eyebrow">POR UNIDADES VENDIDAS</span>
              <p className="ap-hint" style={{ marginTop: 6 }}>
                O preço acima é de uma unidade. Diga quantas você vai vender e veja o total da venda.
              </p>
              <div style={{ marginTop: "var(--space-4)", maxWidth: 200 }}>
                <CampoNumero
                  label="Quantidade vendida" sufixo="und" value={qtdVenda}
                  onChange={(v) => setQtdVenda(Math.max(1, Math.round(v) || 1))}
                />
              </div>
              <div className="ap-figure" style={{ marginTop: "var(--space-4)" }}>
                <span className="ap-figure__val ap-figure__val--lg">{money(lote.vendas)}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", color: "var(--text-muted)" }}>
                  {qtd(qtdVenda)} × {moneyPrecise(unit.preco_unitario)}
                </span>
              </div>
              <div className="ap-rows" style={{ marginTop: "var(--space-4)" }}>
                <Linha label="Custos totais" valor={moneyPrecise(lote.custos)} />
                <Linha label={`Impostos (${pct(produto.impostos_percent, 2)})`} valor={moneyPrecise(unit.imposto * qtdVenda)} />
                <Linha label="Lucro por unidade" valor={moneyPrecise(unit.lucro_liquido)} />
                <div className="ap-row ap-row--total">
                  <span className="ap-row__label">Lucro líquido do lote</span>
                  <span className="ap-row__val" style={{ color: lote.lucro_liquido < 0 ? "var(--status-danger)" : "var(--text-strong)" }}>
                    {money(lote.lucro_liquido)} · {pct(lote.lucro_liquido_pct)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {faixaEdicao && (
        <DialogFaixa
          faixa={faixaEdicao}
          modo={modoFaixa}
          precoGeral={toNum(produto.preco_final_atacado)}
          qtdGeral={toNum(produto.qtd_atacado)}
          limites={limitesDaFaixa(faixaEdicao)}
          proximaQtd={Math.max(
            toNum(produto.qtd_atacado),
            faixas.reduce((max, f) => Math.max(max, toNum(f.qtd_max) || toNum(f.qtd_min)), 0)
          ) + 1}
          onSalvar={salvarFaixa}
          onFechar={() => setFaixaEdicao(null)}
        />
      )}
    </div>
  );
}

/**
 * Bloco de preço sugerido: clicar escolhe o canal, o lápis (que aparece no
 * hover) abre o markup para edição ali mesmo.
 */
function CartaoSugerido({ canal, rotulo, valor, markup, padrao, ativo, onSelecionar, onMarkup }) {
  const [editando, setEditando] = React.useState(false);

  return (
    <div
      className={`ap-sugerido ap-sugerido--${canal} ${ativo ? "ap-sugerido--on" : ""}`}
      role="button"
      tabIndex={editando ? -1 : 0}
      onClick={() => !editando && onSelecionar()}
      onKeyDown={(e) => {
        if (!editando && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelecionar(); }
      }}
      title={`Custo × ${num(markup)} · padrão do negócio ${num(padrao, 1)}×`}
    >
      <span className="ap-sugerido__topo">
        <span className="dc-eyebrow">{rotulo}</span>

        {editando ? (
          <>
          <span className="ap-sugerido__markup ap-sugerido__markup--fixo">×</span>
          <input
            className="ap-sugerido__input"
            autoFocus
            size={4}
            inputMode="decimal"
            defaultValue={String(toNum(markup))}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { setEditando(false); onMarkup(toNum(e.target.value)); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { e.currentTarget.value = String(toNum(markup)); e.currentTarget.blur(); }
            }}
          />
          </>
        ) : (
          <>
            <span className="ap-sugerido__markup">× {num(markup)}</span>
            <IconButton
              className="ap-sugerido__editar"
              variant="ghost"
              size="sm"
              label={`Editar markup de ${rotulo.toLowerCase()}`}
              onClick={(e) => { e.stopPropagation(); setEditando(true); }}
            >
              <Icon name="pencil" size={13} />
            </IconButton>
          </>
        )}
      </span>

      <span className="ap-figure__val">{money(valor)}</span>
      {/* fica invisível quando não é o canal escolhido, mas segura a altura */}
      <span className="ap-sugerido__estado" aria-hidden={!ativo}>
        {ativo && <><Icon name="check" size={12} strokeWidth={3} /> selecionado</>}
      </span>
    </div>
  );
}

/**
 * Cria ou edita uma faixa. O valor é digitado como preço ou como desconto
 * sobre o preço base; o banco guarda sempre o preço.
 */
function DialogFaixa({ faixa, modo, precoGeral, qtdGeral, proximaQtd, limites, onSalvar, onFechar }) {
  const novo = Boolean(faixa.novo);
  const geral = Boolean(faixa.geral);
  // a faixa geral é a referência do desconto, então nela o valor é sempre o preço
  const emDesconto = modo === "desconto" && !geral;
  const precoInicial = geral ? precoGeral : novo ? precoGeral : toNum(faixa.preco_final);

  const [de, setDe] = React.useState(String(geral ? qtdGeral : novo ? proximaQtd : toNum(faixa.qtd_min)));
  const [ate, setAte] = React.useState(String(novo || geral ? 0 : toNum(faixa.qtd_max)));
  const [preco, setPreco] = React.useState(numeroParaMoeda(precoInicial));
  const [desconto, setDesconto] = React.useState(
    String(precoGeral ? Math.round((1 - precoInicial / precoGeral) * 1000) / 10 : 0)
  );
  const [salvando, setSalvando] = React.useState(false);

  // Uma faixa só faz sentido se começa depois da anterior e cobra menos que ela.
  const erros = {};
  if (!geral) {
    if (toNum(de) < limites.qtdMinima) {
      erros.de = `A faixa anterior vai até ${qtd(limites.qtdMinima - 1)}; comece em ${qtd(limites.qtdMinima)} ou mais.`;
    }
    if (toNum(ate) !== 0 && toNum(ate) <= toNum(de)) {
      erros.ate = `Deixe 0 para "daqui para cima" ou use ao menos ${qtd(toNum(de) + 1)}.`;
    }
    if (emDesconto) {
      const dsc = toNum(desconto);
      if (dsc <= limites.descontoMinimo) {
        erros.valor = `A faixa anterior já dá ${num(limites.descontoMinimo, 1)}%; esta precisa descontar mais.`;
      } else if (dsc > limites.descontoMaximo) {
        erros.valor = `Acima de ${num(limites.descontoMaximo, 1)}% o preço fica abaixo do custo.`;
      }
    } else {
      const v = moedaParaNumero(preco);
      if (v >= limites.precoMaximo) {
        erros.valor = `Precisa ser menor que ${money(limites.precoMaximo)}, o preço da faixa anterior.`;
      } else if (v <= limites.precoMinimo) {
        erros.valor = `Abaixo de ${money(limites.precoMinimo)} você vende no prejuízo.`;
      }
    }
  }
  const invalido = Object.keys(erros).length > 0;

  async function confirmar() {
    if (invalido) return;
    setSalvando(true);
    await onSalvar({
      qtd_min: toNum(de),
      qtd_max: toNum(ate),
      preco_final: emDesconto ? precoGeral * (1 - toNum(desconto) / 100) : moedaParaNumero(preco),
    });
    setSalvando(false);
  }

  return (
    <Dialog
      open={true}
      title={geral ? "Editar faixa geral" : novo ? "Adicionar faixa" : "Editar faixa"}
      description={
        geral
          ? "A quantidade mínima que já conta como atacado e o preço base dela."
          : "A partir de quantas unidades esta faixa vale e quanto se cobra nela."
      }
      onClose={() => !salvando && onFechar()}
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={salvando} onClick={onFechar}>Cancelar</Button>
          <Button variant="accent" size="sm" disabled={salvando || invalido} onClick={confirmar}>
            {salvando ? "Salvando..." : novo ? "Adicionar" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="ap-form">
        <Input
          label={geral ? "A partir de (und)" : "De (und)"}
          autoFocus inputMode="decimal" value={de} onChange={(e) => setDe(e.target.value)}
          error={erros.de}
        />
        {!geral && (
          <Input
            label="Até (und)" inputMode="decimal" hint="0 = daqui para cima"
            value={ate} onChange={(e) => setAte(e.target.value)}
            error={erros.ate}
          />
        )}
        {emDesconto ? (
          <Input
            label="Desconto" suffix="%" inputMode="decimal"
            value={desconto} onChange={(e) => setDesconto(e.target.value)}
            error={erros.valor}
            hint={!erros.valor ? `entre ${num(limites.descontoMinimo, 1)}% e ${num(limites.descontoMaximo, 1)}%` : undefined}
          />
        ) : (
          <Input
            label={geral ? "Preço base do atacado" : "Preço desejado"} prefix="R$" inputMode="numeric"
            value={preco} onChange={(e) => setPreco(mascaraMoeda(e.target.value))}
            error={erros.valor}
            hint={!geral && !erros.valor ? `entre ${money(limites.precoMinimo)} e ${money(limites.precoMaximo)}` : undefined}
          />
        )}
      </div>
    </Dialog>
  );
}

/** Uma faixa na lista: clicar nela faz o detalhamento acima falar dessa faixa. */
function LinhaFaixa({ rotulo, ativa, onSelecionar, onEditar, onExcluir }) {
  return (
    <div className={`ap-row ap-faixa ${ativa ? "ap-faixa--on" : ""}`} onClick={onSelecionar}>
      <span className="ap-row__dot" style={{ background: ativa ? "var(--fil-cyan)" : "var(--border-default)" }} />
      <span className="ap-row__label">{rotulo}</span>
      {onEditar && (
        <IconButton
          variant="ghost" size="sm" label={`Editar faixa ${rotulo}`}
          onClick={(e) => { e.stopPropagation(); onEditar(); }}
        >
          <Icon name="pencil" size={14} />
        </IconButton>
      )}
      {onExcluir && (
        <IconButton
          variant="ghost" size="sm" label={`Remover faixa ${rotulo}`}
          onClick={(e) => { e.stopPropagation(); onExcluir(); }}
        >
          <Icon name="trash-2" size={14} />
        </IconButton>
      )}
    </div>
  );
}

/** Quantidade sem casas sobrando: 2 vira "2", 0,4 continua "0,4". */
function qtd(v) {
  const n = toNum(v);
  return num(n, Number.isInteger(n) ? 0 : 2);
}

/* ---------- pedaços de UI ---------- */

/** O título da página é o seletor: menu próprio, não o `select` do sistema. */
function SeletorProduto({ produtos, atual, onTrocar, onNovo }) {
  const [aberto, setAberto] = React.useState(false);
  const ref = React.useRef(null);
  const reduzido = useReducedMotion();

  React.useEffect(() => {
    if (!aberto) return;
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  // Mola das notificações do Motion: firme, com um respiro no fim.
  const mola = reduzido
    ? { duration: 0 }
    : { type: "spring", stiffness: 520, damping: 40, mass: 0.9 };

  // O menu começa como uma pilha (tudo empilhado atrás do botão) e se abre em leque.
  const itemVariants = {
    empilhado: (i) => ({
      opacity: 0,
      // Cada item nasce colado nos de cima, um pouquinho menor — a pilha do exemplo.
      y: reduzido ? 0 : -8 - i * 6,
      scale: reduzido ? 1 : 1 - Math.min(i, 4) * 0.04,
      filter: reduzido ? "none" : "blur(2px)",
    }),
    aberto: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { ...mola, delay: reduzido ? 0 : i * 0.035 },
    }),
    saindo: (i) => ({
      opacity: 0,
      y: reduzido ? 0 : -6 - i * 4,
      scale: reduzido ? 1 : 0.97,
      transition: reduzido ? { duration: 0 } : { duration: 0.14, ease: "easeIn" },
    }),
  };

  return (
    <div className="ap-picker" ref={ref}>
      <h1>
        <motion.button
          type="button"
          className="ap-picker__btn"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
          whileTap={reduzido ? undefined : { scale: 0.97 }}
          transition={mola}
        >
          <span>{atual.nome}</span>
          <span className="ap-picker__chev" data-aberto={aberto || undefined}>
            <Icon name="chevron-down" size={20} strokeWidth={2} />
          </span>
        </motion.button>
      </h1>

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="ap-picker__menu"
            role="listbox"
            aria-label="Produtos"
            initial={{ opacity: 0, y: reduzido ? 0 : -10, scale: reduzido ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: mola }}
            exit={{
              opacity: 0,
              y: reduzido ? 0 : -8,
              scale: reduzido ? 1 : 0.97,
              transition: reduzido ? { duration: 0 } : { duration: 0.16, ease: "easeIn" },
            }}
            style={{ transformOrigin: "top left" }}
          >
            {produtos.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                role="option"
                aria-selected={p.id === atual.id}
                className={`ap-picker__item ${p.id === atual.id ? "ap-picker__item--on" : ""}`}
                onClick={() => { onTrocar(p.id); setAberto(false); }}
                custom={i}
                variants={itemVariants}
                initial="empilhado"
                animate="aberto"
                exit="saindo"
                whileTap={reduzido ? undefined : { scale: 0.98 }}
              >
                <span>{p.nome}</span>
                {p.id === atual.id && <Icon name="check" size={16} strokeWidth={2.5} />}
              </motion.button>
            ))}
            <div className="ap-picker__sep" />
            <motion.button
              type="button"
              className="ap-picker__item ap-picker__item--novo"
              onClick={() => { setAberto(false); onNovo(); }}
              custom={produtos.length}
              variants={itemVariants}
              initial="empilhado"
              animate="aberto"
              exit="saindo"
              whileTap={reduzido ? undefined : { scale: 0.98 }}
            >
              <span>Adicionar produto</span>
              <Icon name="plus" size={16} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Legenda({ cor, texto }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span className="ap-row__dot" style={{ background: cor }} />
      {texto}
    </span>
  );
}

function Linha({ label, valor }) {
  return (
    <div className="ap-row">
      <span className="ap-row__label">{label}</span>
      <span className="ap-row__val">{valor}</span>
    </div>
  );
}

export function CampoNumero({ label, value, onChange, onCommit, prefixo, sufixo, hint, moeda = false }) {
  // Em campo de dinheiro os dígitos entram pelos centavos, como no caixa do banco.
  const exibir = React.useCallback(
    (v) => (moeda ? numeroParaMoeda(v) : String(v ?? "")),
    [moeda]
  );
  const ler = (t) => (moeda ? moedaParaNumero(t) : toNum(t));

  const [texto, setTexto] = React.useState(() => exibir(value));
  const [focado, setFocado] = React.useState(false);
  React.useEffect(() => { if (!focado) setTexto(exibir(value)); }, [value, focado, exibir]);

  return (
    <div className="dc-field">
      <label className="dc-field__label">{label}</label>
      <div className="dc-input dc-input--md">
        {prefixo && <span className="dc-input__affix">{prefixo}</span>}
        <input
          className="dc-input__el"
          inputMode={moeda ? "numeric" : "decimal"}
          value={texto}
          onFocus={() => setFocado(true)}
          onChange={(e) => {
            const t = moeda ? mascaraMoeda(e.target.value) : e.target.value;
            setTexto(t);
            onChange?.(ler(t));
          }}
          onBlur={(e) => { setFocado(false); onCommit?.(ler(e.target.value)); }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        {sufixo && <span className="dc-input__affix">{sufixo}</span>}
      </div>
      {hint && <span className="dc-field__hint">{hint}</span>}
    </div>
  );
}

function Carregando() {
  return (
    <div className="ap-wrap">
      <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
        <div className="ap-skel" style={{ height: 28, width: "60%" }} />
        <div className="ap-skel" style={{ width: "85%" }} />
        <div className="ap-skel" style={{ width: "40%" }} />
      </div>
    </div>
  );
}

function SemProduto() {
  return (
    <div className="ap-wrap">
      <div className="ap-empty">
        <h2 style={{ fontSize: "var(--text-h3)", fontWeight: "var(--weight-medium)" }}>Nenhum produto cadastrado</h2>
        <p>Cadastre um produto e pelo menos uma peça para a calculadora ter o que somar.</p>
        <Button href="/produtos" icon={<Icon name="plus" size={16} />}>Cadastrar produto</Button>
      </div>
    </div>
  );
}

function ErroBanco({ mensagem }) {
  return (
    <div className="ap-wrap">
      <Card padding="var(--space-8)" style={{ maxWidth: 640 }}>
        <span className="dc-eyebrow">SUPABASE</span>
        <h2 style={{ fontSize: "var(--text-h2)", fontWeight: "var(--weight-medium)", margin: "8px 0 12px" }}>
          O banco respondeu, mas as tabelas não estão lá
        </h2>
        <p style={{ color: "var(--text-muted)" }}>
          Abra o SQL Editor do seu projeto no Supabase e rode, nesta ordem,
          <code> supabase/migrations/0001_schema.sql</code> e
          <code> supabase/migrations/0002_seed.sql</code>. Depois recarregue esta página.
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", color: "var(--status-danger)", marginTop: 16 }}>
          {mensagem}
        </p>
      </Card>
    </div>
  );
}

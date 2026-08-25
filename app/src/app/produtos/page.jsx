"use client";
import React from "react";
import Link from "next/link";
import { Card, Button, Icon, IconButton, Badge, Tabs, Dialog, Input } from "@/design-system";
import { useDados, inserirLinha, salvarLinha, removerLinha, tratarMensagemErro } from "@/lib/useDados";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { Explicacao } from "@/components/Explicacao";
import { useToast } from "@/components/AppShell";
import { useTutorial } from "@/components/Tutorial";
import { custosProduto, valorAdicional, valorTrabalho } from "@/lib/calc";
import { money } from "@/lib/format";

const CATEGORIAS = { Producao: "Produção", Acabamento: "Acabamento", Modelagem: "Modelagem" };

/** O que o tutorial pergunta sobre a peça — e só. */
const CAMPOS_PECA_CURTOS = ["nome", "tempo_impressao_horas", "peso_gr"];

const ABAS = [
  { id: "pecas", label: "Peças" },
  { id: "insumos", label: "Insumos e custos" },
  { id: "trabalho", label: "Mão de obra" },
];

export default function Produtos() {
  const d = useDados();
  const toast = useToast();
  const [sel, setSel] = React.useState("");
  const [aba, setAba] = React.useState("pecas");
  const { passo, ativo } = useTutorial();

  // Mesmo acordo dos cadastros: o passo diz qual seção do produto ele está
  // explicando, e a tela abre essa seção.
  React.useEffect(() => {
    if (passo?.abaProduto) setAba(passo.abaProduto);
  }, [passo?.abaProduto]);
  const [nomeando, setNomeando] = React.useState(null); // "novo" | "renomear"
  const [nomeRascunho, setNomeRascunho] = React.useState("");
  const [sugestaoNome, setSugestaoNome] = React.useState("");
  const [descRascunho, setDescRascunho] = React.useState("");
  const [salvandoNome, setSalvandoNome] = React.useState(false);
  const [alvoExcluir, setAlvoExcluir] = React.useState(null);
  const [excluindoProd, setExcluindoProd] = React.useState(false);

  const produto = d.produtos.find((p) => p.id === sel) || null;
  const cfg = d.configuracoes[0];
  const tarifa = cfg?.tarifa_kwh ?? 0;

  /** Custos de um produto qualquer — serve tanto para a lista quanto para o detalhe. */
  const calcular = React.useCallback(
    (p) =>
      custosProduto({
        produto: p,
        pecas: d.pecas.filter((x) => x.produto_id === p.id),
        impressoras: d.impressoras,
        filamentos: d.filamentos,
        adicionais: d.custos_adicionais.filter((x) => x.produto_id === p.id),
        insumos: d.insumos,
        trabalhos: d.produto_trabalhos.filter((x) => x.produto_id === p.id),
        maosObra: d.maos_obra,
        bens: d.bens_depreciacao,
        tarifaKwh: tarifa,
        config: cfg,
      }),
    [d.pecas, d.impressoras, d.filamentos, d.custos_adicionais, d.insumos,
     d.produto_trabalhos, d.maos_obra, d.bens_depreciacao, tarifa, cfg]
  );

  const pecas = produto ? d.pecas.filter((p) => p.produto_id === produto.id) : [];
  const adicionais = produto ? d.custos_adicionais.filter((c) => c.produto_id === produto.id) : [];

  /** Campos de um insumo do produto — a tabela mostra todos menos o valor à mão. */
  const colunasInsumo = [
    { key: "insumo_id", label: "Insumo", tipo: "select", estica: true, vazio: "— avulso, valor manual —",
      options: d.insumos.map((i) => ({ value: i.id, label: i.nome })) },
    { key: "quantidade", label: "Qtd usada", tipo: "numero",
      // a quantidade é sempre na unidade do insumo escolhido
      rotulo: (linha) => {
        const u = d.insumos.find((i) => i.id === linha?.insumo_id)?.unidade;
        return u ? `Qtd usada (${u})` : "Qtd usada";
      } },
    { key: "unidade", label: "Unidade", tipo: "calc", formato: "texto",
      valor: (linha) => d.insumos.find((i) => i.id === linha.insumo_id)?.unidade || "—" },
    { key: "valor", label: "Valor manual (R$)", tipo: "moeda",
      // com insumo escolhido o valor vem do custo por unidade
      oculto: (linha) => Boolean(linha?.insumo_id) },
    { key: "total", label: "Total", tipo: "calc", formato: "moeda",
      valor: (linha) => valorAdicional(linha, d.insumos) },
  ];
  /**
   * Metros de filamento por grama, tirados do carretel cadastrado.
   *
   * O comprimento não entra em nenhum custo — quem paga a conta é o peso —,
   * mas é um campo que ninguém sabe responder de cabeça. No tutorial ele
   * some do formulário e é preenchido por esta média, coerente com o
   * carretel que a própria pessoa acabou de cadastrar.
   */
  const metrosPorGrama = React.useMemo(() => {
    const f = d.filamentos[0];
    const gramas = Number(f?.peso_carretel_kg) * 1000;
    const metros = Number(f?.comprimento_carretel_m);
    return gramas > 0 && metros > 0 ? metros / gramas : 0.335;
  }, [d.filamentos]);

  const trabalhos = produto ? d.produto_trabalhos.filter((t) => t.produto_id === produto.id) : [];
  const c = produto ? calcular(produto) : null;

  function abrirNovoProduto() {
    // o nome sugerido fica só no placeholder; o campo abre vazio
    setSugestaoNome(`Produto ${d.produtos.length + 1}`);
    setNomeRascunho("");
    setDescRascunho("");
    setNomeando("novo");
  }

  function abrirRenomear() {
    setSugestaoNome("");
    setNomeRascunho(produto?.nome || "");
    setDescRascunho(produto?.descricao || "");
    setNomeando("renomear");
  }

  /** O mesmo diálogo cria e renomeia — o nome é sempre a primeira coisa que você define. */
  async function confirmarNome() {
    const nome = nomeRascunho.trim() || sugestaoNome;
    if (!nome) return;
    setSalvandoNome(true);
    try {
      if (nomeando === "novo") {
        const cfg = d.configuracoes[0];
        const p = await inserirLinha("produtos", {
          nome,
          descricao: descRascunho.trim() || null,
          hrs_trabalhadas: 0,
          custo_hora: 0,
          // produto novo nasce com o markup do negócio; sem configuração, 1,5 e 2,0
          markup_atacado: Number(cfg?.markup_atacado_padrao) || 1.5,
          markup_varejo: Number(cfg?.markup_varejo_padrao) || 2,
          qtd_atacado: Number(cfg?.qtd_atacado_padrao) || 10,
        });
        d.aplicar("produtos", p);
        setSel(p.id);
        setAba("pecas");
        toast({ title: "Produto criado", message: nome });
      } else {
        const salvo = await salvarLinha("produtos", produto.id, { nome, descricao: descRascunho.trim() || null });
        d.aplicar("produtos", salvo);
        toast({ title: "Produto renomeado", message: nome });
      }
      setNomeando(null);
    } catch (e) {
      toast({
        tone: "danger",
        title: nomeando === "novo" ? "Não deu para criar" : "Não deu para salvar",
        message: tratarMensagemErro(e, "produtos"),
      });
    } finally {
      setSalvandoNome(false);
    }
  }

  // A calculadora manda para cá com ?novo=1 quando você pede um produto novo lá.
  React.useEffect(() => {
    if (d.carregando) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("novo")) return;
    window.history.replaceState({}, "", "/produtos");
    setNomeRascunho(`Produto ${d.produtos.length + 1}`);
    setDescRascunho("");
    setNomeando("novo");
  }, [d.carregando, d.produtos.length]);

  async function confirmarExcluirProduto() {
    if (!alvoExcluir) return;
    setExcluindoProd(true);
    try {
      await removerLinha("produtos", alvoExcluir.id);
      d.remover("produtos", alvoExcluir.id);
      if (alvoExcluir.id === sel) setSel("");
      toast({ title: "Produto removido", message: alvoExcluir.nome });
      setAlvoExcluir(null);
    } catch (e) {
      toast({ tone: "danger", title: "Não foi possível remover", message: tratarMensagemErro(e, "produtos") });
    } finally {
      setExcluindoProd(false);
    }
  }

  // ------------------------------------------------------------------ lista
  if (!produto) {
    return (
      <div className="ap-wrap">
        <div className="ap-pagehead">
          <div>
            <span className="dc-eyebrow">PRODUTOS</span>
            <h1 style={{ marginTop: 6 }}>Seus produtos</h1>
            <p>Cada produto tem as próprias peças e insumos. Abra um para cadastrar o que ele leva.</p>
          </div>
          <Button variant="accent" icon={<Icon name="plus" size={16} />} onClick={abrirNovoProduto} data-tutorial="produtos-novo">
            Novo produto
          </Button>
        </div>

        {d.erro && (
          <p style={{ color: "var(--status-danger)", fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)" }}>
            {d.erro}
          </p>
        )}

        {d.produtos.length === 0 ? (
          <div className="ap-empty">
            <h2 style={{ fontSize: "var(--text-h3)", fontWeight: "var(--weight-medium)" }}>
              {d.carregando ? "Carregando…" : "Nenhum produto ainda"}
            </h2>
            <p>Crie o primeiro para começar a cadastrar peças.</p>
            <Button onClick={abrirNovoProduto} icon={<Icon name="plus" size={16} />}>Novo produto</Button>
          </div>
        ) : (
          <div className="ap-cards">
            {d.produtos.map((p) => {
              const cc = calcular(p);
              const qPecas = d.pecas.filter((x) => x.produto_id === p.id).length;
              const qAdic = d.custos_adicionais.filter((x) => x.produto_id === p.id).length;
              return (
                <Card
                  key={p.id}
                  interactive
                  padding="var(--space-5)"
                  className="ap-prodcard"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ${p.nome}`}
                  onClick={() => { setSel(p.id); setAba("pecas"); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSel(p.id);
                      setAba("pecas");
                    }
                  }}
                >
                  <div className="ap-prodcard__head">
                    <h2>{p.nome}</h2>
                    <div className="ap-prodcard__acoes">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        label={`Excluir ${p.nome}`}
                        onClick={(e) => { e.stopPropagation(); setAlvoExcluir(p); }}
                      >
                        <Icon name="trash-2" size={16} />
                      </IconButton>
                      <Icon name="arrow-right" size={18} />
                    </div>
                  </div>
                  {p.descricao && <p className="ap-prodcard__desc">{p.descricao}</p>}
                  <div className="ap-prodcard__tags">
                    <Badge tone="neutral" variant="soft">{qPecas} {qPecas === 1 ? "PEÇA" : "PEÇAS"}</Badge>
                    <Badge tone="neutral" variant="soft">{qAdic} {qAdic === 1 ? "INSUMO" : "INSUMOS"}</Badge>
                  </div>
                  <div className="ap-prodcard__nums">
                    <Mini rotulo="CUSTO" valor={money(cc.custos_totais)} />
                    <Mini rotulo="ATACADO" valor={money(cc.sugerido_atacado)} />
                    <Mini rotulo="VAREJO" valor={money(cc.sugerido_varejo)} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {alvoExcluir && (
          <DialogExcluir
            produto={alvoExcluir}
            excluindo={excluindoProd}
            onClose={() => !excluindoProd && setAlvoExcluir(null)}
            onConfirmar={confirmarExcluirProduto}
          />
        )}

        {nomeando && (
          <DialogNome
            modo={nomeando}
            curto={ativo}
            valor={nomeRascunho}
            placeholder={sugestaoNome}
            onChange={setNomeRascunho}
            descricao={descRascunho}
            onChangeDescricao={setDescRascunho}
            salvando={salvandoNome}
            onClose={() => !salvandoNome && setNomeando(null)}
            onConfirmar={confirmarNome}
          />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- detalhe
  const colunasPecas = [
    { key: "numero", label: "Nº", tipo: "numero" },
    { key: "nome", label: "Nome da peça", tipo: "texto", estica: true },
    { key: "impressora_id", label: "Impressora", tipo: "select",
      options: d.impressoras.map((i) => ({ value: i.id, label: i.nome })) },
    { key: "filamento_id", label: "Filamento", tipo: "select",
      options: d.filamentos.map((f) => ({ value: f.id, label: f.nome })) },
    { key: "comprimento_m", label: "Compr. (m)", tipo: "numero" },
    { key: "tempo_impressao_horas", label: "Tempo (min)", tipo: "minutos" },
    { key: "peso_gr", label: "Peso (g)", tipo: "numero",
      // No formulário curto do tutorial o comprimento não aparece; ele vem
      // do peso, pela média do carretel cadastrado.
      aoMudar: (valor) => ({ comprimento_m: Math.round(Number(valor) * metrosPorGrama * 10) / 10 }) },
    { key: "unidades_por_impressao", label: "Un. por impressão", tipo: "numero" },
    { key: "percent_acabamento", label: "Acabamento (%)", tipo: "percent" },
  ];

  // O formulário curto do tutorial: nome, tempo e peso. Impressora e
  // filamento já vêm escolhidos (no teste existe um de cada), e o resto
  // fica nos padrões que a linha nova sempre trouxe.
  const colunasPecaCurtas = colunasPecas.filter((c) => CAMPOS_PECA_CURTOS.includes(c.key));

  return (
    <div className="ap-wrap">
      <button className="ap-back" onClick={() => setSel("")}>
        <Icon name="arrow-left" size={16} /> Todos os produtos
      </button>

      <div className="ap-prodhead">
        <div>
          <h1>
            {produto.nome}
            <IconButton variant="ghost" size="sm" label="Editar nome e descrição" onClick={abrirRenomear}>
              <Icon name="pencil" size={16} />
            </IconButton>
          </h1>
          {produto.descricao && <p>{produto.descricao}</p>}
          <div className="ap-prodhead__acoes">
            <Button href="/" variant="secondary" size="sm" icon={<Icon name="calculator" size={16} />}>
              Ver na calculadora
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAlvoExcluir(produto)} icon={<Icon name="trash-2" size={16} />}>
              Excluir
            </Button>
          </div>
        </div>

        <Card padding="var(--space-5)" inverse>
          <div className="ap-prodnums">
            <Resumo rotulo="PRODUÇÃO" valor={money(c.custos_producao)} />
            <Resumo rotulo="TRABALHO" valor={money(c.custos_hora)} />
            <Resumo rotulo="INSUMOS" valor={money(c.custos_adicionais)} />
            <Resumo rotulo="CUSTO TOTAL" valor={money(c.custos_totais)} />
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: "var(--space-6)" }}>
        <Tabs
          variant="underline"
          value={aba}
          onChange={setAba}
          items={ABAS.map((a) => ({
            ...a,
            count:
              a.id === "pecas" ? pecas.length
              : a.id === "insumos" ? adicionais.length
              : a.id === "trabalho" ? trabalhos.length
              : undefined,
          }))}
        />
      </div>

      {aba === "pecas" && (
        <Card padding="var(--space-6)" data-tutorial="produto-pecas">
          {/* O parágrafo virou "i", como nos cadastros: ele é útil na
              primeira visita e empurra a tabela para baixo em todas as
              outras — no celular, para fora da tela. */}
          <div className="ap-sectionhead ap-sectionhead--tight">
            <h2>
              Peças impressas
              <Explicacao rotulo="Como funciona: peças impressas">
                Uma linha por peça que sai da impressora. Material, energia, manutenção e falhas saem daqui.
                Se mais de uma unidade sai na mesma mesa, informe o tempo e o peso da impressão inteira
                e preencha <strong>Un. por impressão</strong> — os custos são divididos e viram custo por unidade.
                A tarifa de energia é a mesma para todas as peças e fica em{" "}
                <Link href="/cadastros">Cadastros › Geral</Link>.
              </Explicacao>
            </h2>
          </div>
          <TabelaEditavel
            tabela="pecas"
            rotulo="peça"
            colunas={colunasPecas}
            colunasFormulario={ativo ? colunasPecaCurtas : undefined}
            obrigatorios={ativo ? CAMPOS_PECA_CURTOS : undefined}
            linhas={pecas}
            recarregar={d.recarregar}
            aplicar={d.aplicar}
            remover={d.remover}
            vazio="Sem peça cadastrada — a calculadora vai somar zero de produção."
            novoRegistro={() => ({
              produto_id: produto.id,
              numero: pecas.length + 1,
              nome: "Nova peça",
              impressora_id: d.impressoras[0]?.id ?? null,
              filamento_id: d.filamentos[0]?.id ?? null,
              comprimento_m: 0,
              tempo_impressao_horas: 1,   // 60 min
              peso_gr: 0,
              unidades_por_impressao: 1,
              percent_acabamento: 0.05,
            })}
          />
        </Card>
      )}

      {aba === "insumos" && (
        <Card padding="var(--space-6)" data-tutorial="produto-insumos">
          <div className="ap-sectionhead">
            <h2>
              Insumos e custos adicionais
              <Explicacao rotulo="Como funciona: insumos e custos adicionais">
                Escolha um insumo cadastrado e diga quanto entra em cada produto, na unidade dele — 2 argolas,
                15 ml de tinta, 0,4 m de fita. O valor vem do custo por unidade.
                Sem insumo, digite o valor à mão. Novos insumos ficam em{" "}
                <Link href="/cadastros">Cadastros › Insumos</Link>.
              </Explicacao>
            </h2>
            <span className="ap-row__val">{money(c.custos_adicionais)}</span>
          </div>
          <TabelaEditavel
            tabela="custos_adicionais"
            rotulo="insumo"
            colunas={colunasInsumo.filter((c) => c.key !== "valor")}
            // O valor à mão só interessa ao insumo avulso: na tabela ele era uma
            // coluna de zeros. Fica no formulário, onde some sozinho quando um
            // insumo é escolhido.
            colunasFormulario={colunasInsumo}
            linhas={adicionais}
            recarregar={d.recarregar}
            aplicar={d.aplicar}
            remover={d.remover}
            vazio="Nenhum custo adicional."
            novoRegistro={() => ({
              produto_id: produto.id,
              insumo_id: d.insumos[0]?.id ?? null,
              valor: 0,
              quantidade: 1,
            })}
          />
        </Card>
      )}

      {aba === "trabalho" && (
        <Card padding="var(--space-6)" data-tutorial="produto-trabalho">
          <div className="ap-sectionhead">
            <h2>
              Mão de obra
              <Explicacao rotulo="Como funciona: mão de obra">
                Quantos minutos deste produto são de produção, acabamento e modelagem. O valor sai do custo/hora
                cadastrado em <Link href="/cadastros">Cadastros › Mão de obra</Link>.
                Se os minutos são de um lote inteiro — tirar e limpar a mesa que rendeu 10 peças, por exemplo —
                preencha <strong>Un. atendidas</strong> e o valor vira o de uma unidade.
              </Explicacao>
            </h2>
            <span className="ap-row__val">{money(c.custos_trabalho)}</span>
          </div>
          <TabelaEditavel
            tabela="produto_trabalhos"
            rotulo="trabalho"
            colunas={[
              { key: "mao_obra_id", label: "Tipo de trabalho", tipo: "select", estica: true,
                options: d.maos_obra.map((m) => ({ value: m.id, label: `${m.nome} · ${CATEGORIAS[m.categoria] || m.categoria}` })) },
              { key: "minutos", label: "Minutos", tipo: "numero" },
              { key: "unidades", label: "Un. atendidas", tipo: "numero" },
              { key: "custo_hora", label: "R$/hora", tipo: "calc", formato: "moeda",
                valor: (linha) => d.maos_obra.find((m) => m.id === linha.mao_obra_id)?.custo_hora ?? 0 },
              { key: "total", label: "Total", tipo: "calc", formato: "moeda",
                valor: (linha) => valorTrabalho(linha, d.maos_obra) },
            ]}
            linhas={trabalhos}
            recarregar={d.recarregar}
            aplicar={d.aplicar}
            remover={d.remover}
            vazio="Nenhum trabalho lançado para este produto."
            novoRegistro={() => ({
              produto_id: produto.id,
              mao_obra_id: d.maos_obra[0]?.id ?? null,
              minutos: 0,
              unidades: 1,
            })}
          />
        </Card>
      )}

      {nomeando && (
        <DialogNome
          modo={nomeando}
          valor={nomeRascunho}
          placeholder={sugestaoNome}
          onChange={setNomeRascunho}
          salvando={salvandoNome}
          onClose={() => !salvandoNome && setNomeando(null)}
          onConfirmar={confirmarNome}
        />
      )}

      {alvoExcluir && (
        <DialogExcluir
          produto={alvoExcluir}
          excluindo={excluindoProd}
          onClose={() => !excluindoProd && setAlvoExcluir(null)}
          onConfirmar={confirmarExcluirProduto}
        />
      )}
    </div>
  );
}

function Resumo({ rotulo, valor }) {
  return (
    <div className="ap-figure">
      <span className="dc-eyebrow" style={{ color: "var(--ink-300)" }}>{rotulo}</span>
      <span className="ap-figure__val" style={{ color: "#fff" }}>{valor}</span>
    </div>
  );
}

function Mini({ rotulo, valor }) {
  return (
    <div className="ap-mini">
      <span className="dc-eyebrow">{rotulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

/** Diálogo único de nome — usado tanto para criar quanto para renomear. */
/**
 * `curto` é o modo tutorial: só o nome, e o nome digitado de verdade.
 *
 * A descrição não entra em conta nenhuma e o roteiro está pedindo uma
 * coisa só. Aceitar o placeholder ("Produto 3") como resposta criaria um
 * produto sem nome — a pessoa chegaria à calculadora sem reconhecer o que
 * está precificando.
 */
function DialogNome({ modo, valor, onChange, descricao, onChangeDescricao, salvando, onClose, onConfirmar, placeholder, curto = false }) {
  const criar = modo === "novo";
  const podeSalvar = Boolean(valor.trim() || (placeholder && !curto));
  return (
    <Dialog
      open={true}
      title={criar ? "Novo produto" : "Editar produto"}
      description={criar ? "Como este produto se chama? Dá para mudar depois." : "O nome precisa ser único."}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={salvando} onClick={onClose}>Cancelar</Button>
          <Button
            variant="accent"
            size="sm"
            disabled={salvando || !podeSalvar}
            className={curto && podeSalvar && !salvando ? "is-pulsando" : ""}
            onClick={onConfirmar}
          >
            {salvando ? "Salvando..." : criar ? "Criar produto" : "Salvar"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        <Input
          label="Nome do produto"
          autoFocus
          placeholder={placeholder || undefined}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && podeSalvar && !salvando) onConfirmar(); }}
        />
        {!curto && (
          <Input
            label="Descrição"
            value={descricao}
            onChange={(e) => onChangeDescricao(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && podeSalvar && !salvando) onConfirmar(); }}
          />
        )}
      </div>
    </Dialog>
  );
}

/** Confirmação de exclusão — a mesma na lista e no detalhe. */
function DialogExcluir({ produto, excluindo, onClose, onConfirmar }) {
  return (
    <Dialog
      open={true}
      title="Confirmar exclusão do produto"
      description={`Tem certeza que deseja excluir o produto "${produto.nome}"? Esta ação removerá o produto, suas peças, insumos e mão de obra.`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={excluindo} onClick={onClose}>Cancelar</Button>
          <Button variant="accent" size="sm" disabled={excluindo} onClick={onConfirmar}>
            {excluindo ? "Excluindo..." : "Excluir produto"}
          </Button>
        </>
      }
    />
  );
}

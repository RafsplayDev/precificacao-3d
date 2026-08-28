"use client";
import React from "react";
import Link from "next/link";
import { Card, Button, Icon, Badge, Tabs } from "@/design-system";
import { useDados } from "@/lib/useDados";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { Explicacao } from "@/components/Explicacao";
import { custosProduto } from "@/lib/calc";
import { money, num, hojeISO } from "@/lib/format";

/**
 * Gestão — o que saiu, o que entrou, o que sobrou.
 *
 * O resto do app responde "por quanto vender". Esta tela responde "e no fim
 * do mês, sobrou?". Ela mostra dois números que parecem o mesmo e não são:
 *
 *   • LUCRO DAS VENDAS — receita menos o custo calculado da peça menos as
 *     taxas. Diz se o preço está certo.
 *   • CAIXA DO PERÍODO — receita menos os gastos que você lançou. Diz o que
 *     realmente sobrou.
 *
 * Somar os dois contaria o filamento duas vezes: uma no carretel comprado
 * (gasto) e outra rateada dentro da peça (custo). Por isso eles vivem lado
 * a lado e nunca no mesmo total.
 */

const CATEGORIAS = [
  { value: "Filamento", label: "Filamento" },
  { value: "Energia", label: "Energia" },
  { value: "Manutencao", label: "Manutenção" },
  { value: "Pecas", label: "Peças e upgrades" },
  { value: "Insumos", label: "Insumos" },
  { value: "Equipamento", label: "Equipamento" },
  { value: "Marketing", label: "Marketing e anúncios" },
  { value: "Taxas", label: "Taxas e impostos" },
  { value: "Outros", label: "Outros" },
];

const ROTULO_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.label]));

/** Os recortes de tempo da tela. */
const PERIODOS = [
  { id: "mes", label: "Este mês" },
  { id: "3m", label: "3 meses", meses: 3 },
  { id: "12m", label: "12 meses", meses: 12 },
  { id: "tudo", label: "Tudo" },
];

const ABAS = [
  { id: "vendas", label: "Vendas" },
  { id: "gastos", label: "Gastos" },
];

/** A data em que o período começa (inclusive). `null` é "desde sempre". */
function inicioDoPeriodo(id) {
  const hoje = new Date();
  if (id === "tudo") return null;
  if (id === "mes") return hojeISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const meses = PERIODOS.find((p) => p.id === id)?.meses || 12;
  return hojeISO(new Date(hoje.getFullYear(), hoje.getMonth() - meses + 1, 1));
}

export default function Gestao() {
  const d = useDados();
  const [periodo, setPeriodo] = React.useState("mes");
  const [aba, setAba] = React.useState("vendas");

  const desde = inicioDoPeriodo(periodo);
  // As duas colunas são `date`, então comparar texto já é comparar data:
  // "2026-03-09" < "2026-03-10" em ordem alfabética e no calendário.
  const noPeriodo = React.useCallback(
    (linha) => !desde || String(linha.data ?? "").slice(0, 10) >= desde,
    [desde]
  );

  const cfg = d.configuracoes[0];

  /**
   * Custo e preço sugerido de cada produto, prontos para o formulário de
   * venda preencher sozinho. É a mesma conta da tela de produtos — refazê-la
   * aqui faria um ajuste no motor de cálculo desencontrar o histórico de
   * vendas do catálogo.
   */
  const porProduto = React.useMemo(() => {
    const mapa = {};
    for (const p of d.produtos) {
      mapa[p.id] = custosProduto({
        produto: p,
        pecas: d.pecas.filter((x) => x.produto_id === p.id),
        impressoras: d.impressoras,
        filamentos: d.filamentos,
        adicionais: d.custos_adicionais.filter((x) => x.produto_id === p.id),
        insumos: d.insumos,
        trabalhos: d.produto_trabalhos.filter((x) => x.produto_id === p.id),
        maosObra: d.maos_obra,
        bens: d.bens_depreciacao,
        tarifaKwh: cfg?.tarifa_kwh ?? 0,
        config: cfg,
      });
    }
    return mapa;
  }, [d.produtos, d.pecas, d.impressoras, d.filamentos, d.custos_adicionais,
      d.insumos, d.produto_trabalhos, d.maos_obra, d.bens_depreciacao, cfg]);

  // As mais recentes em cima: o que interessa é a venda de ontem, não a do
  // ano passado. O `useDados` traz por data crescente, para a tabela subir.
  const ordenar = (linhas) =>
    [...linhas].sort((a, b) => String(b.data ?? "").localeCompare(String(a.data ?? "")));

  const vendas = React.useMemo(() => ordenar(d.vendas.filter(noPeriodo)), [d.vendas, noPeriodo]);
  const gastos = React.useMemo(() => ordenar(d.gastos.filter(noPeriodo)), [d.gastos, noPeriodo]);

  const soma = (linhas, f) => linhas.reduce((a, l) => a + f(l), 0);
  const n = (v) => Number(v) || 0;
  const receita = soma(vendas, (v) => n(v.quantidade) * n(v.preco_unitario));
  const custoVendido = soma(vendas, (v) => n(v.quantidade) * n(v.custo_unitario));
  const taxas = soma(vendas, (v) => n(v.taxas));
  const lucroVendas = receita - custoVendido - taxas;
  const totalGastos = soma(gastos, (g) => n(g.valor));
  const caixa = receita - totalGastos;
  const pecasVendidas = soma(vendas, (v) => n(v.quantidade));
  const margem = receita > 0 ? lucroVendas / receita : 0;

  const lucroDaVenda = (v) =>
    n(v.quantidade) * n(v.preco_unitario) - n(v.quantidade) * n(v.custo_unitario) - n(v.taxas);

  const colunasVendas = [
    { key: "data", label: "Data", tipo: "data" },
    {
      key: "produto_id", label: "Produto", tipo: "select", estica: true,
      vazio: "— venda avulsa —",
      options: d.produtos.map((p) => ({ value: p.id, label: p.nome })),
      /* Escolheu o produto, o custo e o preço sugerido entram sozinhos: são
         exatamente os números que a calculadora já sabe. Continuam editáveis
         porque a venda real quase nunca sai pelo preço de tabela. */
      aoMudar: (id) => {
        const c = porProduto[id];
        if (!c) return null;
        return {
          custo_unitario: Math.round(c.custos_totais * 100) / 100,
          preco_unitario: Math.round(c.sugerido_varejo * 100) / 100,
        };
      },
    },
    { key: "descricao", label: "Observação", tipo: "texto" },
    { key: "cliente", label: "Cliente", tipo: "texto" },
    { key: "quantidade", label: "Qtd", tipo: "numero" },
    { key: "preco_unitario", label: "Preço un. (R$)", tipo: "moeda" },
    { key: "custo_unitario", label: "Custo un. (R$)", tipo: "moeda" },
    { key: "taxas", label: "Taxas (R$)", tipo: "moeda" },
    { key: "lucro", label: "Lucro", tipo: "calc", formato: "moeda", valor: lucroDaVenda },
  ];

  const colunasGastos = [
    { key: "data", label: "Data", tipo: "data" },
    { key: "categoria", label: "Categoria", tipo: "select", options: CATEGORIAS },
    { key: "descricao", label: "Descrição", tipo: "texto", estica: true },
    { key: "valor", label: "Valor (R$)", tipo: "moeda" },
  ];

  /** Quanto cada produto deu de lucro no período — quem paga a conta e quem não. */
  const ranking = React.useMemo(() => {
    const mapa = new Map();
    for (const v of vendas) {
      const chave = v.produto_id || "__avulso";
      const nome = d.produtos.find((p) => p.id === v.produto_id)?.nome || "Vendas avulsas";
      const atual = mapa.get(chave) || { nome, qtd: 0, receita: 0, lucro: 0 };
      atual.qtd += n(v.quantidade);
      atual.receita += n(v.quantidade) * n(v.preco_unitario);
      atual.lucro += lucroDaVenda(v);
      mapa.set(chave, atual);
    }
    return [...mapa.entries()].sort((a, b) => b[1].lucro - a[1].lucro);
  }, [vendas, d.produtos]);

  /** Gastos agrupados por categoria — para onde o dinheiro está indo. */
  const porCategoria = React.useMemo(() => {
    const mapa = new Map();
    for (const g of gastos) {
      const k = g.categoria || "Outros";
      mapa.set(k, (mapa.get(k) || 0) + n(g.valor));
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastos]);

  const semNada = !d.carregando && d.vendas.length === 0 && d.gastos.length === 0;

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          <span className="dc-eyebrow">GESTÃO</span>
          <h1 style={{ marginTop: 6 }}>Gastos e vendas</h1>
          <p>
            Lance o que saiu do bolso e o que você vendeu. É aqui que o preço sugerido pela
            calculadora encontra o dinheiro que realmente entrou.
          </p>
        </div>
      </div>

      {d.erro && (
        <p style={{ color: "var(--status-danger)", fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)" }}>
          {d.erro}
        </p>
      )}

      <div className="ap-periodo" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={"ap-periodo__btn" + (periodo === p.id ? " is-on" : "")}
            aria-pressed={periodo === p.id}
            onClick={() => setPeriodo(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card padding="var(--space-5)" inverse>
        <div className="ap-gestaonums">
          <Numero
            rotulo="RECEITA"
            valor={money(receita)}
            nota={`${num(pecasVendidas, 0)} ${pecasVendidas === 1 ? "peça vendida" : "peças vendidas"}`}
          />
          <Numero
            rotulo="LUCRO DAS VENDAS"
            valor={money(lucroVendas)}
            nota={receita > 0 ? `${num(margem * 100, 1)}% de margem` : "sem vendas no período"}
            perda={lucroVendas < 0}
          />
          <Numero
            rotulo="GASTOS LANÇADOS"
            valor={money(totalGastos)}
            nota={`${gastos.length} ${gastos.length === 1 ? "lançamento" : "lançamentos"}`}
          />
          <Numero
            rotulo="CAIXA DO PERÍODO"
            valor={money(caixa)}
            nota="receita menos gastos"
            perda={caixa < 0}
          />
        </div>
      </Card>

      <p className="ap-hint" style={{ marginTop: "var(--space-3)" }}>
        Dois recortes da mesma operação: um olha o preço, o outro olha o mês.
        <Explicacao rotulo="Por que são dois números de lucro">
          <strong>Lucro das vendas</strong> desconta o custo calculado de cada peça — material,
          energia, desgaste, mão de obra — e responde se o <em>preço</em> está certo.{" "}
          <strong>Caixa do período</strong> desconta os gastos que você lançou e responde o que
          sobrou de fato no mês.
          <br />
          <br />
          Eles não se somam: o carretel que você comprou aparece uma vez como gasto e outra vez
          rateado dentro do custo das peças que ele imprimiu. Um total único cobraria o filamento
          duas vezes.
        </Explicacao>
      </p>

      <div style={{ margin: "var(--space-6) 0" }}>
        <Tabs
          variant="underline"
          value={aba}
          onChange={setAba}
          items={ABAS.map((a) => ({ ...a, count: a.id === "vendas" ? vendas.length : gastos.length }))}
        />
      </div>

      {aba === "vendas" && (
        <>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead ap-sectionhead--tight">
              <h2>
                Vendas
                <Explicacao rotulo="Como funciona: vendas">
                  Uma linha por venda. Escolhendo um produto do seu catálogo, o custo e o preço
                  sugerido entram preenchidos — e seguem editáveis, porque a venda real raramente
                  sai pelo preço de tabela.
                  <br />
                  <br />
                  O <strong>custo unitário</strong> é uma cópia, não um vínculo: ele guarda o que a
                  peça custava no dia da venda. Quando o filamento encarecer, o lucro de março
                  continua sendo o de março.
                  <br />
                  <br />
                  Em <strong>taxas</strong> vai o que o marketplace cobrou, o frete que você pagou e
                  o imposto daquela venda.
                </Explicacao>
              </h2>
            </div>
            <TabelaEditavel
              tabela="vendas"
              rotulo="venda"
              colunas={colunasVendas}
              linhas={vendas}
              vazio={
                d.carregando
                  ? "Carregando…"
                  : d.vendas.length
                  ? "Nenhuma venda neste período."
                  : "Nenhuma venda lançada ainda."
              }
              novoRegistro={() => ({
                data: hojeISO(),
                produto_id: null,
                descricao: null,
                cliente: null,
                quantidade: 1,
                preco_unitario: 0,
                custo_unitario: 0,
                taxas: 0,
              })}
              recarregar={d.recarregar}
              aplicar={d.aplicar}
              remover={d.remover}
            />
          </Card>

          {ranking.length > 0 && (
            <Card padding="var(--space-6)" style={{ marginTop: "var(--space-5)" }}>
              <div className="ap-sectionhead ap-sectionhead--tight">
                <h2>Lucro por produto</h2>
              </div>
              <div className="ap-rows">
                {ranking.map(([chave, r]) => (
                  <div key={chave} className="ap-row">
                    <span className="ap-row__label">
                      {r.nome}{" "}
                      <Badge tone="neutral" variant="soft">{num(r.qtd, 0)}</Badge>
                    </span>
                    <span className="ap-row__val ap-row__val--fraco">{money(r.receita)}</span>
                    <span className={"ap-row__val" + (r.lucro < 0 ? " ap-row__val--perda" : "")}>
                      {money(r.lucro)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {aba === "gastos" && (
        <>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead ap-sectionhead--tight">
              <h2>
                Gastos
                <Explicacao rotulo="Como funciona: gastos">
                  O dinheiro que saiu de verdade: o carretel comprado, a conta de luz, o bico
                  trocado, o anúncio patrocinado. A data é a do gasto, não a do lançamento — a conta
                  de luz de março lançada em abril continua caindo em março.
                  <br />
                  <br />
                  Estes valores alimentam o <strong>caixa do período</strong>. Eles não entram no
                  custo das peças: esse a calculadora monta a partir dos{" "}
                  <Link href="/cadastros">cadastros</Link>.
                </Explicacao>
              </h2>
            </div>
            <TabelaEditavel
              tabela="gastos"
              rotulo="gasto"
              colunas={colunasGastos}
              linhas={gastos}
              vazio={
                d.carregando
                  ? "Carregando…"
                  : d.gastos.length
                  ? "Nenhum gasto neste período."
                  : "Nenhum gasto lançado ainda."
              }
              novoRegistro={() => ({
                data: hojeISO(),
                categoria: "Filamento",
                descricao: null,
                valor: 0,
              })}
              recarregar={d.recarregar}
              aplicar={d.aplicar}
              remover={d.remover}
            />
          </Card>

          {porCategoria.length > 0 && (
            <Card padding="var(--space-6)" style={{ marginTop: "var(--space-5)" }}>
              <div className="ap-sectionhead ap-sectionhead--tight">
                <h2>Onde o dinheiro foi</h2>
              </div>
              <div className="ap-rows">
                {porCategoria.map(([cat, valor]) => (
                  <div key={cat} className="ap-row">
                    <span className="ap-row__label">{ROTULO_CATEGORIA[cat] || cat}</span>
                    <span className="ap-row__val ap-row__val--fraco">
                      {totalGastos > 0 ? `${num((valor / totalGastos) * 100, 0)}%` : "—"}
                    </span>
                    <span className="ap-row__val">{money(valor)}</span>
                  </div>
                ))}
                <div className="ap-row ap-row--total">
                  <span className="ap-row__label">Total</span>
                  <span className="ap-row__val ap-row__val--fraco" />
                  <span className="ap-row__val">{money(totalGastos)}</span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {semNada && (
        <div className="ap-empty" style={{ marginTop: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-h3)", fontWeight: "var(--weight-medium)" }}>
            Comece pelo que já aconteceu
          </h2>
          <p>
            Lance a última venda que você fez e o último carretel que comprou. Com duas linhas os
            números lá em cima já dizem alguma coisa.
          </p>
          <Button
            variant="secondary"
            icon={<Icon name="plus" size={16} />}
            onClick={() => setAba("vendas")}
          >
            Lançar uma venda
          </Button>
        </div>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, nota, perda }) {
  return (
    <div className="ap-figure">
      <span className="dc-eyebrow">{rotulo}</span>
      <span className={"ap-figure__val" + (perda ? " ap-figure__val--perda" : "")}>{valor}</span>
      {nota && <span className="ap-figure__nota">{nota}</span>}
    </div>
  );
}

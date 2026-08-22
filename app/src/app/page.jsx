"use client";
import React from "react";
import Link from "next/link";
import { Card, Button, Select, Badge, Icon, Tabs } from "@/design-system";
import { useDados, salvarLinha } from "@/lib/useDados";
import { useToast } from "@/components/AppShell";
import { custosProduto, cenarioUnitario, cenarioDesconto, LINHAS_CUSTO } from "@/lib/calc";
import { money, moneyPrecise, pct, num, toNum } from "@/lib/format";

export default function Calculadora() {
  const d = useDados();
  const toast = useToast();
  const [produtoId, setProdutoId] = React.useState("");
  const [canal, setCanal] = React.useState("varejo");
  const [rascunho, setRascunho] = React.useState(null);

  const produtos = d.produtos;
  React.useEffect(() => {
    if (!produtoId && produtos.length) setProdutoId(produtos[0].id);
  }, [produtos, produtoId]);

  const produtoSalvo = produtos.find((p) => p.id === produtoId) || null;
  const produto = rascunho && rascunho.id === produtoId ? rascunho : produtoSalvo;

  const patch = (campos) => setRascunho({ ...(produto || {}), ...campos });

  async function persistir(campos) {
    if (!produto) return;
    try {
      await salvarLinha("produtos", produto.id, campos);
      await d.recarregar();
      setRascunho(null);
      toast({ title: "Alteração salva", message: produto.nome });
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para salvar", message: e.message });
    }
  }

  if (d.erro) return <ErroBanco mensagem={d.erro} />;
  if (d.carregando) return <Carregando />;
  if (!produto) return <SemProduto />;

  const pecas = d.pecas.filter((p) => p.produto_id === produto.id);
  const adicionais = d.custos_adicionais.filter((c) => c.produto_id === produto.id);
  const marketplace = d.marketplaces.find((m) => m.id === produto.marketplace_id) || null;

  const c = custosProduto({
    produto,
    pecas,
    impressoras: d.impressoras,
    filamentos: d.filamentos,
    adicionais,
    bens: d.bens_depreciacao,
  });

  const base =
    canal === "atacado"
      ? produto.usar_preco === "Final" ? toNum(produto.preco_final_atacado) : c.sugerido_atacado
      : produto.usar_preco === "Final" ? toNum(produto.preco_final_varejo) : c.sugerido_varejo;

  const unit = cenarioUnitario({
    base,
    marketplace,
    custosTotais: c.custos_totais,
    impostos: toNum(produto.impostos_percent),
  });

  const volume = cenarioDesconto({
    unitario: unit,
    quantidade: canal === "atacado" ? produto.qtd_atacado : produto.qtd_varejo,
    desconto: canal === "atacado" ? produto.desconto_atacado : produto.desconto_varejo,
    ajusteCusto: canal === "atacado" ? produto.ajuste_custo_atacado : produto.ajuste_custo_varejo,
    impostos: toNum(produto.impostos_percent),
  });

  const prefixo = canal === "atacado" ? "atacado" : "varejo";
  const totalPilha = c.custos_totais + Math.max(unit.margem, 0);

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          <span className="dc-eyebrow">CALCULADORA · FDM</span>
          <h1 style={{ marginTop: 6 }}>Quanto custa e por quanto vender</h1>
          <p>
            Sete linhas de custo por peça, sua hora, o markup e a taxa do marketplace.
            Tudo lê e grava direto no Supabase.
          </p>
        </div>
        <div style={{ minWidth: 260 }}>
          <Select
            label="Produto"
            value={produto.id}
            onChange={(e) => { setRascunho(null); setProdutoId(e.target.value); }}
            options={produtos.map((p) => ({ value: p.id, label: p.nome }))}
          />
        </div>
      </div>

      {/* ---- Assinatura: a pilha de custo em espectro de filamento ---- */}
      <Card padding="var(--space-6)" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
          <div className="ap-figure">
            <span className="dc-eyebrow">CUSTO TOTAL POR UNIDADE</span>
            <span className="ap-figure__val ap-figure__val--lg">{money(c.custos_totais)}</span>
          </div>
          <div className="ap-figure ap-figure--accent" style={{ textAlign: "right", alignItems: "flex-end" }}>
            <span className="dc-eyebrow">MARGEM NO {canal === "atacado" ? "ATACADO" : "VAREJO"}</span>
            <span className="ap-figure__val ap-figure__val--lg">{money(unit.margem)}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", color: "var(--text-muted)" }}>
              {pct(unit.margem_pct)} do preço
            </span>
          </div>
        </div>
        <div className="ap-stack" aria-hidden>
          {LINHAS_CUSTO.map((l) => (
            <span key={l.key} style={{ flexGrow: Math.max(c[l.key], 0) / (totalPilha || 1), background: l.cor }} />
          ))}
          <span style={{ flexGrow: Math.max(c.custos_hora + c.custos_adicionais, 0) / (totalPilha || 1), background: "var(--ink-300)" }} />
          <span style={{ flexGrow: Math.max(unit.margem, 0) / (totalPilha || 1), background: "var(--ink-950)" }} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: "var(--text-caption)", color: "var(--text-muted)" }}>
          <Legenda cor="var(--fil-magenta)" texto="custos de produção" />
          <Legenda cor="var(--ink-300)" texto="sua hora + adicionais" />
          <Legenda cor="var(--ink-950)" texto="margem" />
        </div>
      </Card>

      <div className="ap-grid ap-grid--main">
        {/* ============ COLUNA ESQUERDA: CUSTOS ============ */}
        <div style={{ display: "grid", gap: "var(--space-6)", alignContent: "start" }}>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Custos de produção</h2>
              <Badge tone="neutral" variant="soft">{pecas.length} {pecas.length === 1 ? "PEÇA" : "PEÇAS"}</Badge>
            </div>

            {pecas.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)" }}>
                Este produto ainda não tem peça cadastrada. <Link href="/produtos">Cadastrar peça</Link>
              </p>
            ) : (
              <div className="ap-rows">
                {LINHAS_CUSTO.map((l) => (
                  <div className="ap-row" key={l.key}>
                    <span className="ap-row__dot" style={{ background: l.cor }} />
                    <span className="ap-row__label">{l.label}</span>
                    <span className="ap-row__val">{moneyPrecise(c[l.key])}</span>
                  </div>
                ))}
                <div className="ap-row ap-row--total">
                  <span className="ap-row__label">Custos produção</span>
                  <span className="ap-row__val">{moneyPrecise(c.custos_producao)}</span>
                </div>
              </div>
            )}
          </Card>

          <Card padding="var(--space-6)">
            <div className="ap-sectionhead"><h2>Sua hora e adicionais</h2></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <CampoNumero
                label="Horas trabalhadas" sufixo="hrs" value={produto.hrs_trabalhadas}
                onChange={(v) => patch({ hrs_trabalhadas: v })}
                onCommit={(v) => persistir({ hrs_trabalhadas: v })}
              />
              <CampoNumero
                label="Custo por hora" prefixo="R$" value={produto.custo_hora}
                onChange={(v) => patch({ custo_hora: v })}
                onCommit={(v) => persistir({ custo_hora: v })}
              />
            </div>
            <div className="ap-rows" style={{ marginTop: "var(--space-5)" }}>
              <div className="ap-row">
                <span className="ap-row__label">Custos da sua hora</span>
                <span className="ap-row__val">{moneyPrecise(c.custos_hora)}</span>
              </div>
              {adicionais.map((a) => (
                <div className="ap-row" key={a.id}>
                  <span className="ap-row__label">{a.nome}</span>
                  <span className="ap-row__val">{moneyPrecise(a.valor)}</span>
                </div>
              ))}
              <div className="ap-row">
                <span className="ap-row__label">
                  Custos adicionais {adicionais.length === 0 && <em style={{ color: "var(--text-faint)" }}>— nenhum</em>}
                </span>
                <span className="ap-row__val">{moneyPrecise(c.custos_adicionais)}</span>
              </div>
              <div className="ap-row ap-row--total">
                <span className="ap-row__label">Custos totais</span>
                <span className="ap-row__val">{moneyPrecise(c.custos_totais)}</span>
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
                items={[{ id: "varejo", label: "Varejo" }, { id: "atacado", label: "Atacado" }]}
                value={canal}
                onChange={setCanal}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <CampoNumero
                label={`Markup ${canal}`} sufixo="x"
                value={canal === "atacado" ? produto.markup_atacado : produto.markup_varejo}
                onChange={(v) => patch({ [`markup_${prefixo}`]: v })}
                onCommit={(v) => persistir({ [`markup_${prefixo}`]: v })}
              />
              <CampoNumero
                label="Preço final definido" prefixo="R$"
                value={canal === "atacado" ? produto.preco_final_atacado : produto.preco_final_varejo}
                onChange={(v) => patch({ [`preco_final_${prefixo}`]: v })}
                onCommit={(v) => persistir({ [`preco_final_${prefixo}`]: v })}
              />
              <Select
                label="Base de cálculo"
                value={produto.usar_preco}
                onChange={(e) => persistir({ usar_preco: e.target.value })}
                options={[
                  { value: "Sugerido", label: "Sugerido (custo × markup)" },
                  { value: "Final", label: "Final (preço que eu defini)" },
                ]}
              />
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
          </Card>

          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Simulação com desconto</h2>
              {volume.lucro_liquido < 0 ? (
                <Badge tone="danger" variant="soft">PREJUÍZO</Badge>
              ) : (
                <Badge tone="success" variant="soft">LUCRO</Badge>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
              <CampoNumero
                label="Quantidade" sufixo="und"
                value={canal === "atacado" ? produto.qtd_atacado : produto.qtd_varejo}
                onChange={(v) => patch({ [`qtd_${prefixo}`]: v })}
                onCommit={(v) => persistir({ [`qtd_${prefixo}`]: v })}
              />
              <CampoNumero
                label="Desconto" sufixo="%"
                value={toNum(canal === "atacado" ? produto.desconto_atacado : produto.desconto_varejo) * 100}
                onChange={(v) => patch({ [`desconto_${prefixo}`]: v / 100 })}
                onCommit={(v) => persistir({ [`desconto_${prefixo}`]: v / 100 })}
              />
              <CampoNumero
                label="Ajuste de custo" prefixo="R$"
                value={canal === "atacado" ? produto.ajuste_custo_atacado : produto.ajuste_custo_varejo}
                onChange={(v) => patch({ [`ajuste_custo_${prefixo}`]: v })}
                onCommit={(v) => persistir({ [`ajuste_custo_${prefixo}`]: v })}
              />
            </div>
            <div className="ap-rows" style={{ marginTop: "var(--space-5)" }}>
              <Linha label="Preço unitário com desconto" valor={money(volume.preco_unitario)} />
              <Linha label="Vendas" valor={money(volume.vendas)} />
              <Linha label="Custos" valor={money(volume.custos)} />
              <Linha label="Margem" valor={`${money(volume.margem)} · ${pct(volume.margem_pct)}`} />
              <Linha
                label="Diferença contra o preço cheio"
                valor={`${num(volume.dif_pts * 100)} pts · ${money(volume.dif_valor)}`}
              />
              <div className="ap-row ap-row--total">
                <span className="ap-row__label">Lucro líquido no lote</span>
                <span className="ap-row__val" style={{ color: volume.lucro_liquido < 0 ? "var(--status-danger)" : "var(--text-strong)" }}>
                  {money(volume.lucro_liquido)}
                </span>
              </div>
            </div>
          </Card>

          <Card padding="var(--space-6)">
            <div className="ap-sectionhead"><h2>Preço sugerido</h2></div>
            <div className="ap-rows">
              <Linha label={`Atacado — custo × ${num(produto.markup_atacado)}`} valor={money(c.sugerido_atacado)} />
              <Linha label={`Varejo — custo × ${num(produto.markup_varejo)}`} valor={money(c.sugerido_varejo)} />
              <Linha label="Depreciação fiscal mensal (todos os bens)" valor={money(c.depreciacao_total_mensal)} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- pedaços de UI ---------- */

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

export function CampoNumero({ label, value, onChange, onCommit, prefixo, sufixo, hint }) {
  const [texto, setTexto] = React.useState(String(value ?? ""));
  const [focado, setFocado] = React.useState(false);
  React.useEffect(() => { if (!focado) setTexto(String(value ?? "")); }, [value, focado]);

  return (
    <div className="dc-field">
      <label className="dc-field__label">{label}</label>
      <div className="dc-input dc-input--md">
        {prefixo && <span className="dc-input__affix">{prefixo}</span>}
        <input
          className="dc-input__el"
          inputMode="decimal"
          value={texto}
          onFocus={() => setFocado(true)}
          onChange={(e) => { setTexto(e.target.value); onChange?.(toNum(e.target.value)); }}
          onBlur={(e) => { setFocado(false); onCommit?.(toNum(e.target.value)); }}
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

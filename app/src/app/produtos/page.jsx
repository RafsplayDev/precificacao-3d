"use client";
import React from "react";
import Link from "next/link";
import { Card, Button, Icon, Badge, Select } from "@/design-system";
import { useDados, inserirLinha, removerLinha } from "@/lib/useDados";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { useToast } from "@/components/AppShell";
import { custosProduto } from "@/lib/calc";
import { money, moneyPrecise } from "@/lib/format";

export default function Produtos() {
  const d = useDados();
  const toast = useToast();
  const [sel, setSel] = React.useState("");

  React.useEffect(() => {
    if (!sel && d.produtos.length) setSel(d.produtos[0].id);
  }, [d.produtos, sel]);

  const produto = d.produtos.find((p) => p.id === sel) || null;
  const pecas = d.pecas.filter((p) => p.produto_id === sel);
  const adicionais = d.custos_adicionais.filter((c) => c.produto_id === sel);

  const c = produto
    ? custosProduto({
        produto, pecas, impressoras: d.impressoras, filamentos: d.filamentos,
        adicionais, bens: d.bens_depreciacao,
      })
    : null;

  async function novoProduto() {
    const nome = `Produto ${d.produtos.length + 1}`;
    try {
      const p = await inserirLinha("produtos", { nome, hrs_trabalhadas: 1, custo_hora: 0 });
      await d.recarregar();
      setSel(p.id);
      toast({ title: "Produto criado", message: nome });
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para criar", message: e.message });
    }
  }

  async function excluirProduto() {
    if (!produto) return;
    try {
      await removerLinha("produtos", produto.id);
      await d.recarregar();
      setSel("");
      toast({ title: "Produto removido", message: produto.nome });
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para remover", message: e.message });
    }
  }

  const colunasPecas = [
    { key: "numero", label: "Nº", tipo: "numero" },
    { key: "nome", label: "Nome da peça", tipo: "texto" },
    { key: "impressora_id", label: "Impressora", tipo: "select",
      options: d.impressoras.map((i) => ({ value: i.id, label: i.nome })) },
    { key: "filamento_id", label: "Filamento", tipo: "select",
      options: d.filamentos.map((f) => ({ value: f.id, label: f.nome })) },
    { key: "comprimento_m", label: "Compr. (m)", tipo: "numero" },
    { key: "tempo_impressao_horas", label: "Tempo (hrs)", tipo: "numero" },
    { key: "peso_gr", label: "Peso (g)", tipo: "numero" },
    { key: "tarifa_kwh", label: "Tarifa kWh", tipo: "numero" },
    { key: "percent_acabamento", label: "Acabamento (%)", tipo: "percent" },
  ];

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          <span className="dc-eyebrow">PRODUTOS</span>
          <h1 style={{ marginTop: 6 }}>Peças, tempo e material</h1>
          <p>Um produto é a soma das peças que você imprime para montá-lo. Cadastre cada peça uma vez.</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
          <div style={{ minWidth: 220 }}>
            <Select
              label="Produto"
              value={sel}
              onChange={(e) => setSel(e.target.value)}
              options={d.produtos.map((p) => ({ value: p.id, label: p.nome }))}
            />
          </div>
          <Button variant="accent" icon={<Icon name="plus" size={16} />} onClick={novoProduto}>
            Novo produto
          </Button>
        </div>
      </div>

      {!produto ? (
        <div className="ap-empty">
          <h2 style={{ fontSize: "var(--text-h3)", fontWeight: "var(--weight-medium)" }}>Nenhum produto ainda</h2>
          <p>Crie o primeiro para começar a cadastrar peças.</p>
          <Button onClick={novoProduto} icon={<Icon name="plus" size={16} />}>Novo produto</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "var(--space-6)" }}>
          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Identificação</h2>
              <Badge tone="neutral" variant="soft">{pecas.length} {pecas.length === 1 ? "PEÇA" : "PEÇAS"}</Badge>
            </div>
            <TabelaEditavel
              tabela="produtos"
              colunas={[
                { key: "nome", label: "Nome", tipo: "texto" },
                { key: "descricao", label: "Descrição", tipo: "texto" },
                { key: "hrs_trabalhadas", label: "Horas trabalhadas", tipo: "numero" },
                { key: "custo_hora", label: "Custo/hora (R$)", tipo: "numero" },
                { key: "markup_atacado", label: "Markup atacado", tipo: "numero" },
                { key: "markup_varejo", label: "Markup varejo", tipo: "numero" },
              ]}
              linhas={[produto]}
              recarregar={d.recarregar}
            />
            <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)" }}>
              <Button href="/" variant="secondary" size="sm" icon={<Icon name="calculator" size={16} />}>
                Ver na calculadora
              </Button>
              <Button variant="ghost" size="sm" onClick={excluirProduto} icon={<Icon name="trash-2" size={16} />}>
                Excluir produto
              </Button>
            </div>
          </Card>

          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Peças</h2>
              {c && <span className="ap-row__val">{moneyPrecise(c.custos_producao)} de produção</span>}
            </div>
            <TabelaEditavel
              tabela="pecas"
              colunas={colunasPecas}
              linhas={pecas}
              recarregar={d.recarregar}
              vazio="Sem peça cadastrada — a calculadora vai somar zero de produção."
              novoRegistro={() => ({
                produto_id: produto.id,
                numero: pecas.length + 1,
                nome: "Nova peça",
                impressora_id: d.impressoras[0]?.id ?? null,
                filamento_id: d.filamentos[0]?.id ?? null,
                comprimento_m: 0,
                tempo_impressao_horas: 1,
                peso_gr: 0,
                tarifa_kwh: 0.95,
                percent_acabamento: 0.05,
              })}
            />
          </Card>

          <Card padding="var(--space-6)">
            <div className="ap-sectionhead">
              <h2>Custos adicionais</h2>
              {c && <span className="ap-row__val">{moneyPrecise(c.custos_adicionais)}</span>}
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)", marginTop: 0, maxWidth: "var(--max-prose)" }}>
              Embalagem, insumos, frete, domínio, tinta — o que entra no custo unitário mas não sai da impressora.
            </p>
            <TabelaEditavel
              tabela="custos_adicionais"
              colunas={[
                { key: "nome", label: "Item", tipo: "texto" },
                { key: "valor", label: "Valor (R$)", tipo: "numero" },
              ]}
              linhas={adicionais}
              recarregar={d.recarregar}
              vazio="Nenhum custo adicional."
              novoRegistro={() => ({ produto_id: produto.id, nome: "Embalagem", valor: 0 })}
            />
          </Card>

          {c && (
            <Card padding="var(--space-6)" inverse>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <Resumo rotulo="CUSTO TOTAL" valor={money(c.custos_totais)} />
                <Resumo rotulo="SUGERIDO ATACADO" valor={money(c.sugerido_atacado)} />
                <Resumo rotulo="SUGERIDO VAREJO" valor={money(c.sugerido_varejo)} />
                <div style={{ marginLeft: "auto", alignSelf: "center" }}>
                  <Link href="/" style={{ color: "var(--fil-magenta)" }}>Abrir na calculadora</Link>
                </div>
              </div>
            </Card>
          )}
        </div>
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

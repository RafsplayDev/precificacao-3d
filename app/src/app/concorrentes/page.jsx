"use client";
import React from "react";
import { Card, Badge } from "@/design-system";
import { useDados } from "@/lib/useDados";
import { TabelaEditavel } from "@/components/TabelaEditavel";
import { custosProduto } from "@/lib/calc";
import { money, pct, toNum } from "@/lib/format";

export default function Concorrentes() {
  const d = useDados();

  return (
    <div className="ap-wrap">
      <div className="ap-pagehead">
        <div>
          <span className="dc-eyebrow">PRODUTOS × CONCORRENTES</span>
          <h1 style={{ marginTop: 6 }}>Onde seu preço cai no mercado</h1>
          <p>Seu preço de varejo comparado com o de quem vende a mesma coisa.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "var(--space-6)" }}>
        {d.produtos.map((produto) => {
          const pecas = d.pecas.filter((p) => p.produto_id === produto.id);
          const adicionais = d.custos_adicionais.filter((a) => a.produto_id === produto.id);
          const lista = d.concorrentes.filter((x) => x.produto_id === produto.id);

          const c = custosProduto({
            produto, pecas, impressoras: d.impressoras, filamentos: d.filamentos,
            adicionais, insumos: d.insumos,
            trabalhos: d.produto_trabalhos.filter((t) => t.produto_id === produto.id),
            maosObra: d.maos_obra,
            bens: d.bens_depreciacao,
            tarifaKwh: d.configuracoes[0]?.tarifa_kwh ?? 0,
          });
          const meuPreco =
            produto.usar_preco === "Final" ? toNum(produto.preco_final_varejo) : c.sugerido_varejo;

          const precos = lista.map((x) => toNum(x.preco)).filter((n) => n > 0);
          const media = precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : 0;
          const dif = media ? meuPreco / media - 1 : 0;

          return (
            <Card key={produto.id} padding="var(--space-6)">
              <div className="ap-sectionhead">
                <div>
                  <h2>{produto.nome}</h2>
                  {produto.descricao && (
                    <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm)" }}>
                      {produto.descricao}
                    </span>
                  )}
                </div>
                {media > 0 && (
                  <Badge tone={dif > 0.15 ? "warning" : dif < -0.15 ? "info" : "success"} variant="soft">
                    {dif > 0 ? "ACIMA" : "ABAIXO"} DA MÉDIA · {pct(Math.abs(dif), 0)}
                  </Badge>
                )}
              </div>

              <div className="ap-rows" style={{ marginBottom: "var(--space-5)" }}>
                <div className="ap-row">
                  <span className="ap-row__dot" style={{ background: "var(--fil-magenta)" }} />
                  <span className="ap-row__label">Seu preço de varejo</span>
                  <span className="ap-row__val">{money(meuPreco)}</span>
                </div>
                <div className="ap-row">
                  <span className="ap-row__dot" style={{ background: "var(--ink-300)" }} />
                  <span className="ap-row__label">Média dos concorrentes</span>
                  <span className="ap-row__val">{media ? money(media) : "—"}</span>
                </div>
                <div className="ap-row">
                  <span className="ap-row__dot" style={{ background: "var(--ink-150)" }} />
                  <span className="ap-row__label">Seu custo total</span>
                  <span className="ap-row__val">{money(c.custos_totais)}</span>
                </div>
              </div>

              <TabelaEditavel
                tabela="concorrentes"
              rotulo="concorrente"
                colunas={[
                  { key: "nome", label: "Concorrente", tipo: "texto" },
                  { key: "link", label: "Link ou descrição", tipo: "texto" },
                  { key: "preco", label: "Preço (R$)", tipo: "moeda" },
                ]}
                linhas={lista}
                recarregar={d.recarregar}
            aplicar={d.aplicar}
            remover={d.remover}
                vazio="Nenhum concorrente mapeado para este produto."
                novoRegistro={() => ({
                  produto_id: produto.id,
                  nome: `Concorrente ${lista.length + 1}`,
                  link: "",
                  preco: 0,
                })}
              />
            </Card>
          );
        })}

        {d.produtos.length === 0 && !d.carregando && (
          <div className="ap-empty">
            <p>Cadastre um produto primeiro.</p>
          </div>
        )}
      </div>
    </div>
  );
}

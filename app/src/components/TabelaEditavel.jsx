"use client";
import React from "react";
import { Button, IconButton, Icon } from "@/design-system";
import { salvarLinha, inserirLinha, removerLinha } from "@/lib/useDados";
import { useToast } from "@/components/AppShell";
import { toNum, moneyPrecise, num } from "@/lib/format";

/**
 * Tabela editável ligada direto a uma tabela do Supabase.
 * Cada célula grava no blur; colunas `calc` são só leitura (vêm do banco).
 *
 * colunas: { key, label, tipo: "texto"|"numero"|"percent"|"select"|"calc", options?, formato? }
 */
export function TabelaEditavel({ tabela, colunas, linhas, novoRegistro, recarregar, vazio }) {
  const toast = useToast();
  const [salvando, setSalvando] = React.useState(null);

  async function gravar(linha, coluna, valorBruto) {
    const valor =
      coluna.tipo === "numero" ? toNum(valorBruto)
      : coluna.tipo === "percent" ? toNum(valorBruto) / 100
      : valorBruto === "" ? null : valorBruto;

    const atual = linha[coluna.key];
    const igual = coluna.tipo === "texto" ? String(atual ?? "") === String(valor ?? "") : toNum(atual) === valor;
    if (igual) return;

    setSalvando(linha.id);
    try {
      await salvarLinha(tabela, linha.id, { [coluna.key]: valor });
      await recarregar();
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para salvar", message: e.message });
    } finally {
      setSalvando(null);
    }
  }

  async function adicionar() {
    try {
      await inserirLinha(tabela, novoRegistro());
      await recarregar();
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para criar", message: e.message });
    }
  }

  async function excluir(id) {
    try {
      await removerLinha(tabela, id);
      await recarregar();
      toast({ title: "Registro removido" });
    } catch (e) {
      toast({ tone: "danger", title: "Não deu para remover", message: e.message });
    }
  }

  return (
    <div>
      <div className="ap-tablewrap">
        <table className="ap-table">
          <thead>
            <tr>
              {colunas.map((col) => <th key={col.key}>{col.label}</th>)}
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={colunas.length + 1} style={{ color: "var(--text-muted)", padding: "var(--space-6) var(--space-3)" }}>
                  {vazio || "Nada cadastrado ainda."}
                </td>
              </tr>
            )}
            {linhas.map((linha) => (
              <tr key={linha.id} style={{ opacity: salvando === linha.id ? 0.5 : 1 }}>
                {colunas.map((col) => (
                  <td key={col.key} className={col.tipo === "calc" ? "ap-td--num" : undefined}>
                    <Celula linha={linha} coluna={col} onCommit={(v) => gravar(linha, col, v)} />
                  </td>
                ))}
                <td>
                  <IconButton
                    variant="ghost" size="sm" aria-label={`Remover ${linha.nome || linha.bem || "registro"}`}
                    onClick={() => excluir(linha.id)}
                  >
                    <Icon name="trash-2" size={16} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {novoRegistro && (
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button variant="secondary" size="sm" icon={<Icon name="plus" size={16} />} onClick={adicionar}>
            Adicionar linha
          </Button>
        </div>
      )}
    </div>
  );
}

function Celula({ linha, coluna, onCommit }) {
  const bruto = linha[coluna.key];

  if (coluna.tipo === "calc") {
    const v = toNum(bruto);
    return <span>{coluna.formato === "moeda" ? moneyPrecise(v) : coluna.formato === "percent" ? `${num(v * 100)}%` : num(v)}</span>;
  }

  if (coluna.tipo === "select") {
    return (
      <select className="ap-cell" defaultValue={bruto ?? ""} onChange={(e) => onCommit(e.target.value)}>
        {coluna.options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    );
  }

  const valorInicial =
    coluna.tipo === "percent" ? String(toNum(bruto) * 100)
    : coluna.tipo === "numero" ? String(toNum(bruto))
    : String(bruto ?? "");

  return (
    <input
      key={valorInicial}
      className={`ap-cell ${coluna.tipo === "texto" ? "" : "ap-cell--num"}`}
      defaultValue={valorInicial}
      inputMode={coluna.tipo === "texto" ? undefined : "decimal"}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

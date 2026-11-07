"use client";
import React from "react";
import { Card, Switch } from "@/design-system";
import { money, num } from "@/lib/format";
import { useToast } from "@/components/AppShell";

/**
 * Painel dos anúncios de afiliado.
 *
 * Quem cadastra é a tarefa automática (POST /api/anuncios); aqui você só
 * acompanha o desempenho e liga/desliga o que não quer na vitrine. Só para
 * contas listadas em ADMIN_EMAILS.
 */
export default function Admin() {
  const toast = useToast();
  const [lista, setLista] = React.useState(null);
  const [erro, setErro] = React.useState(null);

  const carregar = React.useCallback(async () => {
    const r = await fetch("/api/anuncios?todos=1", { cache: "no-store" });
    if (!r.ok) {
      setErro(r.status === 403 ? "Esta conta não é admin." : "Não foi possível carregar os anúncios.");
      return;
    }
    setLista((await r.json()).anuncios);
  }, []);

  React.useEffect(() => { carregar(); }, [carregar]);

  async function alternar(a) {
    const r = await fetch(`/api/anuncios/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ativo: !a.ativo }),
    });
    if (!r.ok) {
      toast({ tone: "danger", title: "Não foi possível salvar" });
      return;
    }
    const novo = await r.json();
    setLista((l) => l.map((x) => (x.id === a.id ? novo : x)));
  }

  if (erro) {
    return (
      <div className="ap-admin">
        <Card padding="var(--space-8)"><p>{erro}</p></Card>
      </div>
    );
  }

  const ativos = (lista || []).filter((a) => a.ativo);
  const impressoes = (lista || []).reduce((s, a) => s + a.impressoes, 0);
  const cliques = (lista || []).reduce((s, a) => s + a.cliques, 0);

  return (
    <div className="ap-admin">
      <h1>Anúncios de afiliado</h1>
      <p className="ap-admin__sub">
        {lista ? `${ativos.length} ativos de ${lista.length}` : "Carregando…"}
        {" · "}
        {impressoes.toLocaleString("pt-BR")} impressões · {cliques.toLocaleString("pt-BR")} cliques
        {impressoes ? ` · CTR ${num((cliques / impressoes) * 100, 2)}%` : ""}
      </p>

      <Card padding="var(--space-4)">
        <div className="ap-admin__rolar">
          <table className="ap-admin__tabela">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Produto</th>
                <th>Loja</th>
                <th>Categoria</th>
                <th className="num">Preço</th>
                <th className="num">Pontuação</th>
                <th className="num">Impressões</th>
                <th className="num">Cliques</th>
                <th className="num">CTR</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {(lista || []).map((a) => (
                <tr key={a.id} className={a.ativo ? undefined : "is-off"}>
                  <td><Switch checked={!!a.ativo} onChange={() => alternar(a)} /></td>
                  <td>
                    <a href={a.link_afiliado} target="_blank" rel="noopener noreferrer">{a.titulo}</a>
                  </td>
                  <td>{a.loja}</td>
                  <td>{a.categoria}</td>
                  <td className="num">{a.preco != null ? money(a.preco) : "—"}</td>
                  <td className="num">{num(a.pontuacao, 1)}</td>
                  <td className="num">{a.impressoes.toLocaleString("pt-BR")}</td>
                  <td className="num">{a.cliques.toLocaleString("pt-BR")}</td>
                  <td className="num">{a.impressoes ? `${num((a.cliques / a.impressoes) * 100, 1)}%` : "—"}</td>
                  <td>{String(a.atualizado_em).slice(0, 10)}</td>
                </tr>
              ))}
              {lista && lista.length === 0 && (
                <tr><td colSpan={10}>Nenhum anúncio ainda. A tarefa automática publica em POST /api/anuncios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

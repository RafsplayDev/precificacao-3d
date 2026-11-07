"use client";
import React from "react";
import { Button, Card, Switch } from "@/design-system";
import { money, num } from "@/lib/format";
import { useToast } from "@/components/AppShell";

/**
 * Painel dos anúncios de afiliado.
 *
 * Quem cadastra é a tarefa automática (POST /api/anuncios); aqui você
 * acompanha o desempenho, liga/desliga o que não quer na vitrine e cola o
 * link de afiliado dos produtos do Mercado Livre, que não tem API para
 * gerá-lo. Só para contas listadas em ADMIN_EMAILS.
 */
export default function Admin() {
  const toast = useToast();
  const [lista, setLista] = React.useState(null);
  const [validade, setValidade] = React.useState(30);
  const [erro, setErro] = React.useState(null);

  const carregar = React.useCallback(async () => {
    const r = await fetch("/api/anuncios?todos=1", { cache: "no-store" });
    if (!r.ok) {
      setErro(r.status === 403 ? "Esta conta não é admin." : "Não foi possível carregar os anúncios.");
      return;
    }
    const d = await r.json();
    setLista(d.anuncios);
    if (d.validade_horas) setValidade(d.validade_horas);
  }, []);

  React.useEffect(() => { carregar(); }, [carregar]);

  async function salvar(a, campos) {
    const r = await fetch(`/api/anuncios/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(campos),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast({ tone: "danger", title: "Não foi possível salvar", message: corpo.message });
      return false;
    }
    setLista((l) => l.map((x) => (x.id === a.id ? corpo : x)));
    return true;
  }
  const alternar = (a) => salvar(a, { ativo: !a.ativo });

  if (erro) {
    return (
      <div className="ap-admin">
        <Card padding="var(--space-8)"><p>{erro}</p></Card>
      </div>
    );
  }

  const ativos = (lista || []).filter((a) => a.ativo && a.link_afiliado);
  const pendentes = (lista || []).filter((a) => !a.link_afiliado);
  const impressoes = (lista || []).reduce((s, a) => s + a.impressoes, 0);
  const cliques = (lista || []).reduce((s, a) => s + a.cliques, 0);

  return (
    <div className="ap-admin">
      <h1>Anúncios de afiliado</h1>
      <p className="ap-admin__sub">
        <a href="/admin/vitrine">Ver a prévia dos estilos da vitrine →</a>
      </p>
      <p className="ap-admin__sub">
        {lista ? `${ativos.length} na vitrine de ${lista.length}` : "Carregando…"}
        {" · "}
        {impressoes.toLocaleString("pt-BR")} impressões · {cliques.toLocaleString("pt-BR")} cliques
        {impressoes ? ` · CTR ${num((cliques / impressoes) * 100, 2)}%` : ""}
      </p>

      {pendentes.length > 0 && (
        <Card padding="var(--space-5)" className="ap-admin__pendentes">
          <h2>Aguardando link de afiliado ({pendentes.length})</h2>
          <p>
            Sem o link, o produto não aparece na vitrine. <strong>Mercado Livre:</strong> abra o
            produto logado na sua conta de afiliado, gere o link pela barra de afiliados (ou pelo
            Gerador de links do painel) e cole aqui. <strong>Shopee:</strong> isso só acontece se
            a Open API não estiver configurada (SHOPEE_APP_ID/SHOPEE_APP_SECRET); com ela, o link
            é gerado sozinho.
          </p>
          {pendentes.map((a) => <Pendente key={a.id} anuncio={a} onSalvar={salvar} />)}
        </Card>
      )}

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
                <th>Cupom</th>
                <th>Medalha</th>
                <th>Verificado</th>
                <th className="num">Estoque</th>
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
                    <a href={a.link_afiliado || a.url_produto} target="_blank" rel="noopener noreferrer">{a.titulo}</a>
                    {!a.link_afiliado && <> · <em>sem link</em></>}
                  </td>
                  <td>{a.loja === "shopee" ? "Shopee" : "Mercado Livre"}</td>
                  <td>{a.categoria}</td>
                  <td className="num">{a.preco != null ? money(a.preco) : "—"}</td>
                  <td>{a.cupom_codigo || "—"}</td>
                  <td title={a.medalha?.motivo || ""}>
                    {a.medalha?.nivel
                      ? a.medalha.nivel[0].toUpperCase() + a.medalha.nivel.slice(1)
                      : a.medalha?.aquecendo
                        ? `aquecendo (${a.medalha.aquecendo.faltam} d)`
                        : "—"}
                  </td>
                  <VerificadoCelula a={a} validade={validade} />
                  <td className="num">{a.estoque ?? "—"}</td>
                  <td className="num">{num(a.pontuacao, 1)}</td>
                  <td className="num">{a.impressoes.toLocaleString("pt-BR")}</td>
                  <td className="num">{a.cliques.toLocaleString("pt-BR")}</td>
                  <td className="num">{a.impressoes ? `${num((a.cliques / a.impressoes) * 100, 1)}%` : "—"}</td>
                  <td>{String(a.atualizado_em).slice(0, 10)}</td>
                </tr>
              ))}
              {lista && lista.length === 0 && (
                <tr><td colSpan={14}>Nenhum anúncio ainda. A tarefa automática publica em POST /api/anuncios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** Uma linha de produto sem link: abrir no Mercado Livre, colar o link, salvar. */
function Pendente({ anuncio, onSalvar }) {
  const [link, setLink] = React.useState("");
  const [salvando, setSalvando] = React.useState(false);
  async function enviar() {
    setSalvando(true);
    const ok = await onSalvar(anuncio, { link_afiliado: link.trim() });
    setSalvando(false);
    if (ok) setLink("");
  }
  return (
    <div className="ap-admin__pendente">
      <span>
        <a href={anuncio.url_produto} target="_blank" rel="noopener noreferrer">{anuncio.titulo}</a>
        {" · "}{anuncio.loja === "shopee" ? "Shopee" : "Mercado Livre"}
        {anuncio.preco != null && <> · {money(anuncio.preco)}</>}
      </span>
      <input
        type="url"
        placeholder={anuncio.loja === "shopee" ? "https://s.shopee.com.br/..." : "https://meli.la/..."}
        value={link}
        onChange={(e) => setLink(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && link.trim()) enviar(); }}
        aria-label={`Link de afiliado de ${anuncio.titulo}`}
      />
      <Button size="sm" variant="accent" disabled={!link.trim() || salvando} onClick={enviar}>
        {salvando ? "Salvando…" : "Salvar link"}
      </Button>
    </div>
  );
}

/**
 * Quando a tarefa conferiu o produto pela última vez, e o que ela viu.
 * Em vermelho, o que passou da validade: está fora da vitrine até a
 * próxima verificação.
 */
function VerificadoCelula({ a, validade }) {
  if (!a.verificado_em) return <td>—</td>;
  const horas = (Date.now() - Date.parse(a.verificado_em)) / 3600e3;
  const texto = horas < 1 ? "agora há pouco" : horas < 48 ? `há ${Math.round(horas)} h` : `há ${Math.round(horas / 24)} dias`;
  return (
    <td title={a.ultima_observacao || ""} className={horas > validade ? "ap-admin__vencido" : undefined}>
      {texto}
      {a.ultima_observacao && <div className="ap-admin__obs">{a.ultima_observacao}</div>}
    </td>
  );
}

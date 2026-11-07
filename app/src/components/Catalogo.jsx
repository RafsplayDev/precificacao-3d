"use client";
import React from "react";
import { CartaoAnuncio, Medalha } from "@/components/Vitrine";

export const CATEGORIAS_ROTULO = {
  filamentos: "Filamentos",
  "bicos-hotend": "Bicos e hotend",
  "mesas-superficies": "Mesas",
  "secadores-armazenamento": "Secadores",
  ferramentas: "Ferramentas",
  acabamento: "Acabamento",
  "pecas-reposicao": "Peças",
  upgrades: "Upgrades",
  eletronica: "Eletrônica",
  impressoras: "Impressoras",
  resinas: "Resinas",
  outros: "Outros",
};

const LOJAS = [
  { valor: "", rotulo: "Todas as lojas" },
  { valor: "shopee", rotulo: "Shopee" },
  { valor: "mercado-livre", rotulo: "Mercado Livre" },
];

const ORDENS = [
  { valor: "destaque", rotulo: "Destaques" },
  { valor: "melhores", rotulo: "Melhores ofertas" },
  { valor: "desconto", rotulo: "Maior desconto" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "avaliacao", rotulo: "Mais bem avaliados" },
];

/**
 * O catálogo de achados: todos os produtos da vitrine, com filtros.
 *
 * Com `exemplo` (lista pronta), filtra e ordena na própria tela — é o que a
 * prévia do /admin usa. Sem ele, cada mudança de filtro pede à API.
 */
export function Catalogo({ exemplo }) {
  const [loja, setLoja] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [cupom, setCupom] = React.useState(false);
  const [medalha, setMedalha] = React.useState(false);
  const [ordem, setOrdem] = React.useState("destaque");
  const [itens, setItens] = React.useState(null);
  const [esgotados, setEsgotados] = React.useState([]);
  const [todasCategorias, setTodasCategorias] = React.useState([]);

  React.useEffect(() => {
    if (exemplo) {
      let l = exemplo.filter((a) =>
        (!loja || a.loja_codigo === loja) && (!categoria || a.categoria === categoria) && (!cupom || a.cupom)
        && (!medalha || a.medalha));
      const rank = (a) => ({ ouro: 3, prata: 2, bronze: 1 })[a.medalha?.nivel] || 0;
      if (ordem === "melhores") l = [...l].sort((a, b) => rank(b) - rank(a));
      const desc = (a) => (a.preco_original > a.preco ? 1 - a.preco / a.preco_original : 0);
      if (ordem === "desconto") l = [...l].sort((a, b) => desc(b) - desc(a));
      if (ordem === "menor-preco") l = [...l].sort((a, b) => a.preco - b.preco);
      if (ordem === "avaliacao") l = [...l].sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0));
      setItens(l.filter((a) => !a.esgotado_em));
      setEsgotados(l.filter((a) => a.esgotado_em));
      return;
    }
    let vivo = true;
    const q = new URLSearchParams({ limite: "60", ordem, esgotados: "1" });
    if (loja) q.set("loja", loja);
    if (categoria) q.set("categoria", categoria);
    if (cupom) q.set("cupom", "1");
    if (medalha) q.set("medalha", "1");
    fetch(`/api/anuncios?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anuncios: [] }))
      .then((d) => {
        if (!vivo) return;
        setItens(d.anuncios || []);
        setEsgotados(d.esgotados || []);
      })
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, [exemplo, loja, categoria, cupom, medalha, ordem]);

  // As categorias que aparecem nos chips são as que têm produto — sem
  // filtro de categoria aplicado, para o chip não sumir depois de clicado.
  React.useEffect(() => {
    if (!itens || categoria) return;
    setTodasCategorias((atual) => {
      const novas = new Set([...atual, ...itens.map((a) => a.categoria)]);
      return Object.keys(CATEGORIAS_ROTULO).filter((c) => novas.has(c));
    });
  }, [itens, categoria]);

  return (
    <div className="ap-catalogo">
      <header className="ap-catalogo__cabeca">
        <span className="dc-eyebrow">Achados 3D</span>
        <h1>O que vale a pena comprar para sua impressora</h1>
        <p>
          Filamentos, bicos, mesas e acessórios selecionados na Shopee e no Mercado Livre, com
          os cupons que encontramos. Os links são de afiliado: se você comprar por eles, o
          Precifica recebe uma comissão, sem custo extra para você. É isso que mantém o app grátis.
        </p>
      </header>

      <div className="ap-catalogo__filtros">
        <div className="ap-segmento" role="group" aria-label="Loja">
          {LOJAS.map((l) => (
            <button key={l.valor} type="button" aria-pressed={loja === l.valor}
              className={loja === l.valor ? "is-on" : ""} onClick={() => setLoja(l.valor)}>
              {l.rotulo}
            </button>
          ))}
        </div>
        <label className={"ap-chip ap-chip--cupom" + (cupom ? " is-on" : "")}>
          <input type="checkbox" checked={cupom} onChange={(e) => setCupom(e.target.checked)} />
          Só com cupom
        </label>
        <label className={"ap-chip ap-chip--medalha" + (medalha ? " is-on" : "")}>
          <input type="checkbox" checked={medalha} onChange={(e) => setMedalha(e.target.checked)} />
          <Medalha nivel="ouro" tamanho={12} /> Com medalha
        </label>
        <label className="ap-catalogo__ordem">
          <span>Ordenar</span>
          <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            {ORDENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </label>
      </div>

      {todasCategorias.length > 1 && (
        <div className="ap-catalogo__chips" role="group" aria-label="Categoria">
          <button type="button" className={"ap-chip" + (!categoria ? " is-on" : "")} onClick={() => setCategoria("")}>
            Tudo
          </button>
          {todasCategorias.map((c) => (
            <button key={c} type="button" className={"ap-chip" + (categoria === c ? " is-on" : "")}
              onClick={() => setCategoria(categoria === c ? "" : c)}>
              {CATEGORIAS_ROTULO[c]}
            </button>
          ))}
        </div>
      )}

      {itens === null ? (
        <p className="ap-catalogo__vazio">Carregando achados…</p>
      ) : itens.length === 0 ? (
        <p className="ap-catalogo__vazio">
          {loja || categoria || cupom || medalha
            ? "Nenhum achado com esses filtros agora. Tente tirar algum."
            : "Os achados estão sendo selecionados. Volte em breve."}
        </p>
      ) : (
        <>
          <p className="ap-catalogo__total">
            {itens.length} {itens.length === 1 ? "achado" : "achados"}
            <span className="ap-vitrine__selo"> · Patrocinado</span>
          </p>
          <ul className="ap-vitrine__lista ap-catalogo__grade">
            {itens.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
          </ul>
        </>
      )}

      {esgotados.length > 0 && !cupom && !medalha && (
        <section className="ap-catalogo__esgotados">
          <h2>Esgotaram nas últimas 24 horas</h2>
          <p>Oferta boa acaba rápido. Estes saíram da vitrine assim que o estoque acabou.</p>
          <ul className="ap-vitrine__lista ap-catalogo__grade">
            {esgotados.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

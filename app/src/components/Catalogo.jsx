"use client";
import React from "react";
import {
  CartaoAnuncio, CartaoDestaque, CartaoLinha, Cupom, Imagem, Medalha, fundoDe,
} from "@/components/Vitrine";

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

const RANK = { ouro: 3, prata: 2, bronze: 1 };
const rank = (a) => RANK[a.medalha?.nivel] || 0;
const descontoDe = (a) => (a.preco_original > a.preco ? 1 - a.preco / a.preco_original : 0);

/** Filtra e ordena na própria tela (a prévia com produtos de exemplo). */
function filtrarLocal(lista, { loja, categoria, cupom, medalha, ordem }) {
  let l = lista.filter((a) =>
    (!loja || a.loja_codigo === loja) && (!categoria || a.categoria === categoria) && (!cupom || a.cupom)
    && (!medalha || a.medalha));
  if (ordem === "melhores") l = [...l].sort((a, b) => rank(b) - rank(a));
  if (ordem === "desconto") l = [...l].sort((a, b) => descontoDe(b) - descontoDe(a));
  if (ordem === "menor-preco") l = [...l].sort((a, b) => a.preco - b.preco);
  if (ordem === "avaliacao") l = [...l].sort((a, b) => (b.avaliacao || 0) - (a.avaliacao || 0));
  return l;
}

/**
 * A loja de achados (/achados), montada como uma loja: o banner com a melhor
 * oferta, as categorias, as ofertas do dia, a faixa das medalhas, os cupons,
 * os filamentos e, no fim, todos os achados com filtros.
 *
 * As seções de cima saem da lista completa, buscada uma vez; a lista com
 * filtros, embaixo, pede à API a cada mudança. Com `exemplo` (lista pronta),
 * tudo é filtrado na própria tela — é o que a prévia do /admin usa.
 */
export function Catalogo({ exemplo }) {
  const [loja, setLoja] = React.useState("");
  const [categoria, setCategoria] = React.useState("");
  const [cupom, setCupom] = React.useState(false);
  const [medalha, setMedalha] = React.useState(false);
  const [ordem, setOrdem] = React.useState("destaque");
  const [todos, setTodos] = React.useState(exemplo ? exemplo.filter((a) => !a.esgotado_em) : null);
  const [itens, setItens] = React.useState(null);
  const [esgotados, setEsgotados] = React.useState([]);
  const listaRef = React.useRef(null);

  // A vitrine completa, sem filtro: alimenta as seções da loja.
  React.useEffect(() => {
    if (exemplo) return;
    let vivo = true;
    fetch("/api/anuncios?limite=60&ordem=destaque", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anuncios: [] }))
      .then((d) => vivo && setTodos(d.anuncios || []))
      .catch(() => vivo && setTodos([]));
    return () => {
      vivo = false;
    };
  }, [exemplo]);

  // A lista com filtros, no fim da página.
  React.useEffect(() => {
    const filtros = { loja, categoria, cupom, medalha, ordem };
    if (exemplo) {
      const l = filtrarLocal(exemplo, filtros);
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

  const secoes = React.useMemo(() => montarSecoes(todos || []), [todos]);

  function irParaCategoria(c) {
    setCategoria(c);
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filtrando = loja || categoria || cupom || medalha;

  return (
    <div className="ap-loja">
      <h1 className="dc-sr-only">Achados 3D: ofertas para impressão 3D</h1>

      {todos === null && <p className="ap-catalogo__vazio">Carregando achados…</p>}
      {todos !== null && todos.length === 0 && (
        <p className="ap-catalogo__vazio">Os achados estão sendo selecionados. Volte em breve.</p>
      )}

      {secoes.destaque && (
        <section className={"ap-loja__hero" + (secoes.atalhos.length ? "" : " ap-loja__hero--so")} aria-label="Destaque">
          <CartaoDestaque a={secoes.destaque} />
          {secoes.atalhos.length > 0 && (
            <div className="ap-loja__atalhos">
              {secoes.atalhos.map((t) => (
                <a key={t.href} href={t.href} className={`ap-loja__atalho ap-loja__atalho--${t.cor}`}>
                  <span className="ap-loja__atalho-tit">
                    {t.medalha && <Medalha nivel="ouro" tamanho={20} />}
                    {t.titulo}
                  </span>
                  <span>{t.texto}</span>
                  <span className="ap-loja__atalho-acao">{t.acao}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      {secoes.categorias.length > 1 && (
        <nav className="ap-loja__cats" aria-label="Categorias">
          {secoes.categorias.map(({ id, exemplo: ex }) => (
            <button key={id} type="button" className="ap-loja__cat" onClick={() => irParaCategoria(id)}>
              <span className="ap-loja__cat-img"><Imagem a={ex} fundo={fundoDe(ex)} /></span>
              {CATEGORIAS_ROTULO[id] || id}
            </button>
          ))}
        </nav>
      )}

      {secoes.doDia.length > 0 && (
        <section className="ap-loja__secao" aria-labelledby="t-dia">
          <div className="ap-loja__cabeca">
            <h2 id="t-dia">Ofertas do dia</h2>
            <span className="ap-vitrine__selo">Patrocinado</span>
          </div>
          <ul className="ap-vitrine__lista ap-loja__grade">
            {secoes.doDia.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
          </ul>
        </section>
      )}

      {secoes.medalhas.length > 0 && (
        <section id="medalhas" className="ap-loja__faixa ap-loja__faixa--ouro" aria-labelledby="t-med">
          <div className="ap-loja__cabeca">
            <Medalha nivel={secoes.medalhas[0].medalha.nivel} tamanho={30} />
            <div>
              <h2 id="t-med">{secoes.soOuro ? "Medalhas de ouro" : "Com medalha"}</h2>
              <p>Preço comparado com o nosso próprio histórico de 30 dias, não com o "de" da loja.</p>
            </div>
          </div>
          <ul className="ap-vitrine__lista ap-loja__trilho">
            {secoes.medalhas.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
          </ul>
        </section>
      )}

      {secoes.cupons.length > 0 && (
        <section id="cupons" className="ap-loja__faixa ap-loja__faixa--rosa" aria-labelledby="t-cup">
          <div className="ap-loja__cabeca"><h2 id="t-cup">Cupons</h2></div>
          <ul className="ap-loja__cupons">
            {secoes.cupons.map((a) => (
              <li key={a.id}>
                <a href={a.href} target="_blank" rel="sponsored nofollow noopener" className="ap-loja__cupom-de">
                  {a.loja} · {a.titulo}
                </a>
                <Cupom cupom={a.cupom} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {secoes.filamentos.length > 0 && (
        <section className="ap-loja__faixa ap-loja__faixa--lilas" aria-labelledby="t-fil">
          <div className="ap-loja__cabeca">
            <h2 id="t-fil">Filamentos</h2>
            <button type="button" className="ap-loja__ver" onClick={() => irParaCategoria("filamentos")}>
              Ver todos os filamentos
            </button>
          </div>
          <ul className="ap-vlinhas">
            {secoes.filamentos.map((a) => <li key={a.id}><CartaoLinha a={a} /></li>)}
          </ul>
        </section>
      )}

      {todos?.length > 0 && (
        <section ref={listaRef} className="ap-loja__secao ap-loja__todos" aria-labelledby="t-todos">
          <div className="ap-loja__cabeca"><h2 id="t-todos">Todos os achados</h2></div>
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

          {secoes.categorias.length > 1 && (
            <div className="ap-catalogo__chips" role="group" aria-label="Categoria">
              <button type="button" className={"ap-chip" + (!categoria ? " is-on" : "")} onClick={() => setCategoria("")}>
                Tudo
              </button>
              {secoes.categorias.map(({ id }) => (
                <button key={id} type="button" className={"ap-chip" + (categoria === id ? " is-on" : "")}
                  onClick={() => setCategoria(categoria === id ? "" : id)}>
                  {CATEGORIAS_ROTULO[id] || id}
                </button>
              ))}
            </div>
          )}

          {itens === null ? (
            <p className="ap-catalogo__vazio">Carregando achados…</p>
          ) : itens.length === 0 ? (
            <p className="ap-catalogo__vazio">
              {filtrando ? "Nenhum achado com esses filtros agora. Tente tirar algum." : "Nenhum achado agora."}
            </p>
          ) : (
            <>
              <p className="ap-catalogo__total">
                {itens.length} {itens.length === 1 ? "achado" : "achados"}
                <span className="ap-vitrine__selo"> · Patrocinado</span>
              </p>
              <ul className="ap-vitrine__lista ap-loja__grade">
                {itens.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
              </ul>
            </>
          )}

          {esgotados.length > 0 && !cupom && !medalha && (
            <section className="ap-catalogo__esgotados">
              <h2>Esgotaram nas últimas 24 horas</h2>
              <p>Oferta boa acaba rápido. Estes saíram da vitrine assim que o estoque acabou.</p>
              <ul className="ap-vitrine__lista ap-loja__grade">
                {esgotados.map((a) => <li key={a.id}><CartaoAnuncio a={a} /></li>)}
              </ul>
            </section>
          )}
        </section>
      )}

      <p className="ap-loja__nota">
        Os links são de afiliado: se você comprar por eles, o Precifica recebe uma comissão, sem custo
        extra para você. É isso que mantém o app grátis. Preço e estoque são conferidos várias vezes por
        dia; ofertas sem verificação recente saem da vitrine sozinhas.
      </p>
    </div>
  );
}

/** As seções da loja, a partir da lista completa (já na ordem de destaque). */
function montarSecoes(lista) {
  const comMedalha = [...lista].filter((a) => a.medalha).sort((a, b) => rank(b) - rank(a));
  const destaque = comMedalha[0] || lista[0] || null;
  const resto = lista.filter((a) => a !== destaque);

  const doDia = [...resto].sort((a, b) => descontoDe(b) - descontoDe(a)).slice(0, 10);
  const medalhas = comMedalha.filter((a) => a !== destaque).slice(0, 8);
  const soOuro = medalhas.length > 0 && medalhas.every((a) => a.medalha.nivel === "ouro");

  const vistos = new Set();
  const cupons = lista.filter((a) => {
    if (!a.cupom || vistos.has(a.cupom.codigo)) return false;
    vistos.add(a.cupom.codigo);
    return true;
  }).slice(0, 8);

  const filamentos = lista.filter((a) => a.categoria === "filamentos").slice(0, 6);

  const porCategoria = new Map();
  for (const a of lista) if (a.categoria && !porCategoria.has(a.categoria)) porCategoria.set(a.categoria, a);
  const categorias = Object.keys(CATEGORIAS_ROTULO)
    .filter((c) => porCategoria.has(c))
    .map((id) => ({ id, exemplo: porCategoria.get(id) }));

  const atalhos = [];
  const ouros = comMedalha.filter((a) => a.medalha.nivel === "ouro").length;
  if (medalhas.length) {
    atalhos.push({
      href: "#medalhas", cor: "amarelo", medalha: true,
      titulo: soOuro ? "Medalhas de ouro" : "Com medalha",
      texto: ouros ? `${ouros} ${ouros === 1 ? "oferta" : "ofertas"} no menor preço dos últimos 30 dias.` : "Os melhores preços do nosso histórico.",
      acao: "Ver ofertas",
    });
  }
  if (cupons.length) {
    atalhos.push({
      href: "#cupons", cor: "ciano", titulo: "Cupons",
      texto: `${cupons.length} ${cupons.length === 1 ? "cupom conferido" : "cupons conferidos"} na Shopee e no Mercado Livre.`,
      acao: "Ver cupons",
    });
  }

  return { destaque, atalhos, categorias, doDia, medalhas, soOuro, cupons, filamentos };
}

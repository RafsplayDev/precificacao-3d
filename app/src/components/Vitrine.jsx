"use client";
import React from "react";
import Link from "next/link";
import { money } from "@/lib/format";

/**
 * A vitrine de produtos com link de afiliado — a fonte de renda do app.
 *
 * Os produtos vêm de /api/anuncios, abastecida por uma tarefa automática.
 * O clique passa por /api/anuncios/:id/ir, que conta o clique e redireciona
 * para a loja; o rótulo "Patrocinado" e o rel="sponsored" deixam claro, para
 * a pessoa e para buscadores, que é publicidade.
 *
 * Três estilos (`variante`):
 *  • "grade"    — cartões com imagem grande, em colunas;
 *  • "lista"    — linhas compactas, imagem pequena à esquerda;
 *  • "destaque" — a melhor oferta em tamanho grande e as outras num carrossel.
 *
 * `itens` permite mostrar uma lista pronta (a prévia com produtos de
 * exemplo); sem ele, a vitrine busca na API. Sem anúncio nenhum, ela não
 * aparece: a calculadora nunca depende dela.
 */
export function Vitrine({
  limite = 4, categoria, loja, titulo = "Achados para impressão 3D", recarregarEm,
  variante = "grade", itens: fixos, verTodos = true,
}) {
  const [buscados, setBuscados] = React.useState(null);

  React.useEffect(() => {
    if (fixos) return;
    let vivo = true;
    const q = new URLSearchParams({ limite: String(limite) });
    if (categoria) q.set("categoria", categoria);
    if (loja) q.set("loja", loja);
    fetch(`/api/anuncios?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anuncios: [] }))
      .then((d) => vivo && setBuscados(d.anuncios || []))
      .catch(() => vivo && setBuscados([]));
    return () => {
      vivo = false;
    };
  }, [fixos, limite, categoria, loja, recarregarEm]);

  const itens = fixos || buscados;
  if (!itens || itens.length === 0) return null;

  return (
    <section className={`ap-vitrine ap-vitrine--${variante}`} aria-label="Produtos patrocinados">
      <div className="ap-vitrine__topo">
        <h2>{titulo}</h2>
        <span className="ap-vitrine__selo">Patrocinado</span>
        {verTodos && <Link href="/achados" className="ap-vitrine__todos">Ver todos os achados →</Link>}
      </div>
      {variante === "lista" && <ListaAnuncios itens={itens} />}
      {variante === "destaque" && <DestaqueAnuncios itens={itens} />}
      {variante === "grade" && <GradeAnuncios itens={itens} />}
    </section>
  );
}

export function GradeAnuncios({ itens }) {
  return (
    <ul className="ap-vitrine__lista">
      {itens.map((a) => (
        <li key={a.id}><CartaoAnuncio a={a} /></li>
      ))}
    </ul>
  );
}

function ListaAnuncios({ itens }) {
  return (
    <ul className="ap-vlinhas">
      {itens.map((a) => (
        <li key={a.id} className="ap-vlinha">
          <a className="ap-vlinha__link" href={a.href} target="_blank" rel="sponsored nofollow noopener">
            <Imagem a={a} />
            <span className="ap-vlinha__info">
              <Loja a={a} />
              <span className="ap-vcard__titulo">{a.titulo}</span>
              <Nota a={a} />
            </span>
            <span className="ap-vlinha__lado">
              <Preco a={a} />
              <span className="ap-vlinha__seta" aria-hidden="true">→</span>
            </span>
          </a>
          {a.cupom && <Cupom cupom={a.cupom} />}
        </li>
      ))}
    </ul>
  );
}

function DestaqueAnuncios({ itens }) {
  // A melhor oferta é a primeira: a API já devolve na ordem do sorteio ponderado.
  const [principal, ...resto] = itens;
  return (
    <div className="ap-vdestaque">
      <article className="ap-vdestaque__principal">
        <a className="ap-vdestaque__link" href={principal.href} target="_blank" rel="sponsored nofollow noopener">
          <Imagem a={principal} grande />
          <span className="ap-vdestaque__info">
            <span className="ap-vdestaque__chamada">Oferta em destaque</span>
            <Loja a={principal} />
            <span className="ap-vdestaque__titulo">{principal.titulo}</span>
            <Nota a={principal} />
            <Preco a={principal} grande />
            <span className="ap-vbotao">Ver {daLoja(principal)}</span>
          </span>
        </a>
        {principal.cupom && <Cupom cupom={principal.cupom} />}
      </article>
      {resto.length > 0 && (
        <ul className="ap-vdestaque__carrossel" aria-label="Mais ofertas">
          {resto.map((a) => (
            <li key={a.id}><CartaoAnuncio a={a} compacto /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** O cartão de um produto — usado na grade, no carrossel e no catálogo. */
export function CartaoAnuncio({ a, compacto = false }) {
  return (
    <article className={"ap-vcard" + (compacto ? " ap-vcard--compacto" : "")}>
      <a className="ap-vcard__link" href={a.href} target="_blank" rel="sponsored nofollow noopener">
        <Imagem a={a} />
        <span className="ap-vcard__corpo">
          <Loja a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <Nota a={a} />
          <Preco a={a} />
          {!compacto && <span className="ap-vbotao ap-vbotao--contorno">Ver {daLoja(a)}</span>}
        </span>
      </a>
      {a.cupom && <Cupom cupom={a.cupom} />}
    </article>
  );
}

/* ------------------------------------------------------------------ */

const daLoja = (a) => (a.loja_codigo === "shopee" ? "na Shopee" : "no Mercado Livre");

function desconto(a) {
  if (!(a.preco_original > a.preco) || !a.preco) return null;
  return Math.round((1 - a.preco / a.preco_original) * 100);
}

function Imagem({ a, grande = false }) {
  const [falhou, setFalhou] = React.useState(false);
  const pct = desconto(a);
  return (
    <span className={"ap-vimg" + (grande ? " ap-vimg--grande" : "")}>
      {a.imagem_url && !falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
      ) : (
        <span className="ap-vimg__vazio" aria-hidden="true">3D</span>
      )}
      {pct >= 5 && <span className="ap-vimg__desconto">-{pct}%</span>}
      {a.selo && !/^-?\d+%$/.test(a.selo) && <span className="ap-vimg__selo">{a.selo}</span>}
    </span>
  );
}

function Loja({ a }) {
  return <span className={`ap-vloja ap-vloja--${a.loja_codigo}`}>{a.loja}</span>;
}

function Nota({ a }) {
  if (a.avaliacao == null) return null;
  const n = a.num_avaliacoes;
  const qtd = n == null ? "" : n >= 1000
    ? ` (${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil)`
    : ` (${n})`;
  return (
    <span className="ap-vnota">
      <span aria-hidden="true">★</span> {Number(a.avaliacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{qtd}
    </span>
  );
}

function Preco({ a, grande = false }) {
  if (a.preco == null) return null;
  return (
    <span className={"ap-vpreco" + (grande ? " ap-vpreco--grande" : "")}>
      {a.preco_original > a.preco && <s>{money(a.preco_original)}</s>}
      <strong>{money(a.preco)}</strong>
    </span>
  );
}

/**
 * O cupom fica fora do link do anúncio: tocar nele copia o código, e não
 * leva para a loja. Quem usa o cupom cola no carrinho, depois de abrir a
 * oferta.
 */
export function Cupom({ cupom }) {
  const [copiado, setCopiado] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(cupom.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }
  return (
    <button type="button" className="ap-vcupom" onClick={copiar} aria-label={`Copiar cupom ${cupom.codigo}`}>
      <span className="ap-vcupom__ticket">
        <span className="ap-vcupom__rot">Cupom</span>
        <code>{cupom.codigo}</code>
      </span>
      <span className="ap-vcupom__desc">{cupom.descricao}</span>
      <span className="ap-vcupom__acao">{copiado ? "Copiado!" : "Copiar"}</span>
    </button>
  );
}

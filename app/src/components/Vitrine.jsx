"use client";
import React from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { Icon } from "@/design-system";

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
              <Chamada a={a} />
              <span className="ap-vcard__titulo">{a.titulo}</span>
              <span className="ap-vlinha__meta"><Loja a={a} /><Nota a={a} /></span>
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
            {principal.chamada || principal.medalha
              ? <Chamada a={principal} grande />
              : <span className="ap-vdestaque__chamada">Oferta em destaque</span>}
            <Loja a={principal} />
            <span className="ap-vdestaque__titulo">{principal.titulo}</span>
            <Nota a={principal} />
            <Preco a={principal} grande />
            <Motivo a={principal} />
            {principal.observacao && <Observacao texto={principal.observacao} />}
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
          <Chamada a={a} />
          <Loja a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <Nota a={a} />
          <Preco a={a} />
          <Motivo a={a} />
          {a.observacao && !compacto && <Observacao texto={a.observacao} />}
          {!compacto && <span className="ap-vbotao ap-vbotao--contorno">Ver {daLoja(a)}</span>}
        </span>
      </a>
      {!compacto && <Compartilhar a={a} />}
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
      {a.condicao_preco && <em className="ap-vpreco__cond">{a.condicao_preco}</em>}
    </span>
  );
}

/* ---- Medalha e chamada ---- */

export const MEDALHAS = {
  ouro: { nome: "Ouro", rotulo: "Menor preço", de: "#FFE08A", ate: "#D4A017", borda: "#A87C0A" },
  prata: { nome: "Prata", rotulo: "Ótimo preço", de: "#F2F4F7", ate: "#A9B0BA", borda: "#7D8591" },
  bronze: { nome: "Bronze", rotulo: "Bom preço", de: "#F6C49A", ate: "#B9703A", borda: "#8A4F24" },
};

/** A medalha desenhada: fita + moeda, nas cores do metal. */
export function Medalha({ nivel, tamanho = 18 }) {
  const m = MEDALHAS[nivel];
  if (!m) return null;
  const id = `med-${nivel}`;
  return (
    <svg className="ap-vmedalha" width={tamanho} height={tamanho * 1.25} viewBox="0 0 20 25" role="img" aria-label={`Medalha de ${m.nome.toLowerCase()}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.de} />
          <stop offset="1" stopColor={m.ate} />
        </linearGradient>
      </defs>
      <path d="M5 0h4l2 7H7z" fill="#FF2D6F" />
      <path d="M15 0h-4l-2 7h4z" fill="#C8164F" />
      <circle cx="10" cy="15.5" r="8" fill={`url(#${id})`} stroke={m.borda} strokeWidth="1.2" />
      <circle cx="10" cy="15.5" r="5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
    </svg>
  );
}

/**
 * A chamada da oferta, no estilo dos grupos de promoção: a medalha (quando
 * há) e uma frase curta e bem-humorada. Sem frase, a medalha diz o rótulo
 * dela ("Menor preço"); sem nenhum dos dois, nada aparece.
 */
function Chamada({ a, grande = false }) {
  const nivel = a.medalha?.nivel;
  const texto = a.chamada || (nivel ? MEDALHAS[nivel].rotulo : null);
  if (!texto) return null;
  return (
    <span className={"ap-vchamada" + (grande ? " ap-vchamada--grande" : "") + (nivel ? ` ap-vchamada--${nivel}` : "")}>
      {nivel && <Medalha nivel={nivel} tamanho={grande ? 22 : 18} />}
      <span>{texto}</span>
    </span>
  );
}

/** Por que a oferta ganhou a medalha — a transparência que faz confiar nela. */
function Motivo({ a }) {
  if (!a.medalha?.motivo) return null;
  return (
    <span className={`ap-vmotivo ap-vmotivo--${a.medalha.nivel}`}>
      <Icon name="trending-down" size={13} />
      <span>{a.medalha.motivo}</span>
    </span>
  );
}

/** A vantagem extra que não é cupom ("De 1 a 3 unidades com 20% OFF"). */
function Observacao({ texto }) {
  return (
    <span className="ap-vobs">
      <Icon name="package" size={13} />
      <span>{texto}</span>
    </span>
  );
}

/** O texto da oferta no formato dos grupos de WhatsApp. */
export function textoWhatsApp(a, origem) {
  // Sem emoji: só texto e a formatação do próprio WhatsApp (*negrito*, ~riscado~).
  const linhas = [];
  const nivel = a.medalha?.nivel;
  const med = nivel ? `[${MEDALHAS[nivel].nome.toUpperCase()}] ` : "";
  if (a.chamada || nivel) linhas.push(`*${med}${(a.chamada || MEDALHAS[nivel].rotulo).toUpperCase()}*`, "");
  linhas.push(`*${a.titulo}*`, "");
  const por = `*POR ${money(a.preco)}*${a.condicao_preco ? ` ${a.condicao_preco}` : ""}`;
  linhas.push(a.preco_original > a.preco ? `~DE ${money(a.preco_original)}~ | ${por}` : por);
  if (a.cupom) linhas.push(`CUPOM: *${a.cupom.codigo}*${a.cupom.descricao ? ` (${a.cupom.descricao})` : ""}`);
  if (a.observacao) linhas.push(a.observacao);
  if (a.medalha?.motivo) linhas.push(a.medalha.motivo);
  linhas.push("", `${origem}${a.href}`, "", `Calcule o preço das suas peças 3D grátis: ${origem}`);
  return linhas.join("\n");
}

/** Mandar a oferta para um contato ou grupo de WhatsApp. */
function Compartilhar({ a }) {
  function abrir() {
    const url = `https://wa.me/?text=${encodeURIComponent(textoWhatsApp(a, window.location.origin))}`;
    window.open(url, "_blank", "noopener");
  }
  return (
    <button type="button" className="ap-vcompartilhar" onClick={abrir} aria-label="Compartilhar no WhatsApp" title="Compartilhar no WhatsApp">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z" />
      </svg>
    </button>
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

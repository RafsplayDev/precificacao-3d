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
 * As peças seguem o canvas "Vitrine de Achados" no Claude Design:
 *  • CartaoAnuncio    — o card da loja (/achados), colorido e completo;
 *  • CartaoCalculadora — o card neutro e compacto do rodapé da calculadora;
 *  • CartaoLinha      — a linha compacta (filamentos, oferta do cadastro);
 *  • CartaoDestaque   — o banner grande do topo da loja.
 *
 * Estilos da `Vitrine` (`variante`):
 *  • "calculadora" — cards compactos em colunas (o rodapé das telas);
 *  • "loja" (ou "grade") — cards completos em colunas;
 *  • "lista"       — linhas compactas;
 *  • "destaque"    — o banner com a melhor oferta e as outras ao lado.
 *
 * `itens` permite mostrar uma lista pronta (a prévia com produtos de
 * exemplo); sem ele, a vitrine busca na API. Sem anúncio nenhum, ela não
 * aparece: a calculadora nunca depende dela.
 */
export function Vitrine({
  limite = 4, categoria, loja, titulo = "Achados para impressão 3D", recarregarEm,
  variante = "calculadora", itens: fixos, verTodos = true,
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
  const estilo = variante === "grade" ? "loja" : variante;

  return (
    <section className={`ap-vitrine ap-vitrine--${estilo}`} aria-label="Produtos patrocinados">
      <div className="ap-vitrine__topo">
        <h2>{titulo}</h2>
        <span className="ap-vitrine__selo">Patrocinado</span>
        {verTodos && <Link href="/achados" className="ap-vitrine__todos">Ver loja completa</Link>}
      </div>
      {estilo === "lista" && (
        <ul className="ap-vlinhas">
          {itens.map((a) => <li key={a.id}><CartaoLinha a={a} /></li>)}
        </ul>
      )}
      {estilo === "destaque" && <DestaqueAnuncios itens={itens} />}
      {estilo === "loja" && <GradeAnuncios itens={itens} />}
      {estilo === "calculadora" && (
        <ul className="ap-vitrine__lista ap-vitrine__lista--calc">
          {itens.map((a) => <li key={a.id}><CartaoCalculadora a={a} /></li>)}
        </ul>
      )}
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

function DestaqueAnuncios({ itens }) {
  // A melhor oferta é a primeira: a API já devolve na ordem do sorteio ponderado.
  const [principal, ...resto] = itens;
  return (
    <div className="ap-vdestaque">
      <CartaoDestaque a={principal} />
      {resto.length > 0 && (
        <ul className="ap-vtrilho" aria-label="Mais ofertas">
          {resto.map((a) => (
            <li key={a.id}><CartaoCalculadora a={a} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/** O card da loja: imagem sobre fundo colorido, preço (riscado, atual e com cupom), motivo e cupom. */
export function CartaoAnuncio({ a }) {
  if (a.esgotado_em) return <CartaoEsgotado a={a} />;
  const nivel = a.medalha?.nivel;
  return (
    <article className="ap-vcard">
      <a className="ap-vcard__link" href={a.href} target="_blank" rel="sponsored nofollow noopener">
        <span className="ap-vcard__midia">
          <Imagem a={a} fundo={fundoDe(a)} />
          <Desconto a={a} />
          {nivel && (
            <span className="ap-vselo">
              <Medalha nivel={nivel} tamanho={16} />
              <span className="ap-vselo__txt">{MEDALHAS[nivel].rotulo}</span>
            </span>
          )}
        </span>
        <span className="ap-vcard__corpo">
          <Loja a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <Nota a={a} />
          <Preco a={a} />
          <Motivo a={a} />
          <Estoque a={a} />
          {a.observacao && <Observacao texto={a.observacao} />}
        </span>
      </a>
      <Compartilhar a={a} />
      {/* O pé do card: cupom (quando há) e o botão, sempre no fundo, para os
          botões ficarem na mesma altura em toda a fileira. */}
      <div className="ap-vcard__pe">
        {a.cupom && <Cupom cupom={a.cupom} />}
        <a className="ap-vbotao" href={a.href} target="_blank" rel="sponsored nofollow noopener" tabIndex={-1}>
          {verNaLoja(a)}
        </a>
      </div>
    </article>
  );
}

/** O card neutro e compacto que aparece enquanto a pessoa usa a calculadora. */
export function CartaoCalculadora({ a }) {
  if (a.esgotado_em) return null;
  const nivel = a.medalha?.nivel;
  return (
    <article className="ap-vcalc">
      <a className="ap-vcalc__link" href={a.href} target="_blank" rel="sponsored nofollow noopener">
        <span className="ap-vcard__midia">
          <Imagem a={a} fundo="#F2F3F6" />
          <Desconto a={a} />
        </span>
        <span className="ap-vcalc__corpo">
          <RotuloMedalha a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <Preco a={a} compacto />
          <span className="ap-vcalc__pe">
            <Loja a={a} />
            <span className="ap-vcalc__ver">Ver oferta</span>
          </span>
        </span>
      </a>
      {a.cupom && <CupomFaixa cupom={a.cupom} />}
    </article>
  );
}

/** Um produto em linha compacta — a seção de filamentos e a oferta do cadastro. */
export function CartaoLinha({ a }) {
  return (
    <article className="ap-vlinha">
      <a className="ap-vlinha__link" href={a.href} target="_blank" rel="sponsored nofollow noopener">
        <span className="ap-vlinha__img"><Imagem a={a} fundo={fundoDe(a)} /></span>
        <span className="ap-vlinha__info">
          <RotuloMedalha a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <span className="ap-vlinha__meta"><Loja a={a} /><Nota a={a} /></span>
        </span>
        <span className="ap-vlinha__lado"><Preco a={a} empilhado /></span>
      </a>
      {a.cupom && <div className="ap-vlinha__cupom"><Cupom cupom={a.cupom} /></div>}
    </article>
  );
}

/** O banner grande do topo da loja: a melhor oferta, sobre a cor da marca. */
export function CartaoDestaque({ a }) {
  const nivel = a.medalha?.nivel;
  const pct = desconto(a);
  return (
    <article className="ap-vdest">
      <svg className="ap-vdest__aneis" aria-hidden="true" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" /><circle cx="100" cy="100" r="66" /><circle cx="100" cy="100" r="36" />
      </svg>
      <div className="ap-vdest__conteudo">
        <div className="ap-vdest__texto">
          <span className="ap-vdest__selo">
            {nivel && <Medalha nivel={nivel} tamanho={16} />}
            {a.medalha?.motivo || "Oferta em destaque"}
          </span>
          <a className="ap-vdest__titulo" href={a.href} target="_blank" rel="sponsored nofollow noopener">{a.titulo}</a>
          <span className="ap-vdest__preco">
            {a.preco_original > a.preco && <s>{money(a.preco_original)}</s>}
            <strong>{money(a.preco)}</strong>
            {a.condicao_preco && <span>{a.condicao_preco}</span>}
          </span>
          {a.preco_cupom != null && a.cupom && (
            <span className="ap-vdest__comcupom">{money(a.preco_cupom)} com o cupom {a.cupom.codigo}</span>
          )}
          <span className="ap-vdest__acoes">
            <a className="ap-vdest__botao" href={a.href} target="_blank" rel="sponsored nofollow noopener">{verNaLoja(a)}</a>
            {a.cupom && <CupomPilula cupom={a.cupom} />}
          </span>
        </div>
        <a className="ap-vdest__midia" href={a.href} target="_blank" rel="sponsored nofollow noopener" tabIndex={-1} aria-hidden="true">
          <Imagem a={a} fundo="rgba(255,255,255,.18)" />
          {pct >= 5 && <span className="ap-vdest__desconto">-{pct}%</span>}
        </a>
      </div>
    </article>
  );
}

/** Esgotou há pouco: em cinza, sem link e sem cupom. */
function CartaoEsgotado({ a }) {
  const horas = Math.max(1, Math.round((Date.now() - Date.parse(a.esgotado_em)) / 3600e3));
  return (
    <article className="ap-vcard ap-vcard--esgotado" aria-label={`${a.titulo}, esgotado`}>
      <div className="ap-vcard__link">
        <span className="ap-vcard__midia"><Imagem a={a} fundo="#F2F3F6" /></span>
        <span className="ap-vcard__corpo">
          <span className="ap-vesgotado">Esgotou há {horas} h</span>
          <Loja a={a} />
          <span className="ap-vcard__titulo">{a.titulo}</span>
          <Preco a={{ ...a, preco_original: null, condicao_preco: null, preco_cupom: null }} />
        </span>
      </div>
      <div className="ap-vcard__pe"><span className="ap-vbotao" aria-disabled="true">Esgotado</span></div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const verNaLoja = (a) => (a.loja_codigo === "shopee" ? "Ver na Shopee" : "Ver no Mercado Livre");

/** O fundo colorido atrás da foto, pela categoria do produto. */
export const FUNDOS = {
  filamentos: "#FFE7EE", "bicos-hotend": "#FFF6DB", "mesas-superficies": "#E2F5FD",
  "secadores-armazenamento": "#EEE9FF", ferramentas: "#E2F5FD", acabamento: "#DEF9F0",
  "pecas-reposicao": "#FFF6DB", upgrades: "#EEE9FF", eletronica: "#E2F5FD",
  impressoras: "#E2F5FD", resinas: "#DEF9F0", outros: "#F2F3F6",
};
export const fundoDe = (a) => FUNDOS[a.categoria] || "#F2F3F6";

function desconto(a) {
  if (!(a.preco_original > a.preco) || !a.preco) return null;
  return Math.round((1 - a.preco / a.preco_original) * 100);
}

/** A foto do anúncio numa placa branca, sobre um fundo colorido. */
export function Imagem({ a, fundo = "#F2F3F6" }) {
  const [falhou, setFalhou] = React.useState(false);
  return (
    <span className="ap-vimg" style={{ background: fundo }}>
      <span className="ap-vimg__placa">
        {a.imagem_url && !falhou ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />
        ) : (
          <span className="ap-vimg__vazio" aria-hidden="true">3D</span>
        )}
      </span>
    </span>
  );
}

function Desconto({ a }) {
  const pct = desconto(a);
  return pct >= 5 ? <span className="ap-vdesconto">-{pct}%</span> : null;
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
      <span aria-hidden="true">★</span>
      <span>{Number(a.avaliacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{qtd}</span>
    </span>
  );
}

function Preco({ a, compacto = false, empilhado = false }) {
  if (a.preco == null) return null;
  const cls = "ap-vpreco" + (compacto ? " ap-vpreco--compacto" : "") + (empilhado ? " ap-vpreco--empilhado" : "");
  return (
    <span className={cls}>
      {a.preco_original > a.preco && <s>{money(a.preco_original)}</s>}
      <span className="ap-vpreco__linha">
        <strong>{money(a.preco)}</strong>
        {a.condicao_preco && !compacto && <em className="ap-vpreco__cond">{a.condicao_preco}</em>}
      </span>
      {a.preco_cupom != null && a.cupom && (
        <span className="ap-vpreco__cupom">
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V5H3z" /><path d="M13 5v2M13 11v2M13 17v2" />
          </svg>
          {money(a.preco_cupom)} com cupom
        </span>
      )}
    </span>
  );
}

/* ---- Medalha ---- */

export const MEDALHAS = {
  ouro: { nome: "Ouro", rotulo: "Menor preço", cor: "#F2B705", fita: "#B88600" },
  prata: { nome: "Prata", rotulo: "Ótimo preço", cor: "#A9B1BC", fita: "#7D8591" },
  bronze: { nome: "Bronze", rotulo: "Bom preço", cor: "#C8814A", fita: "#8A4F24" },
};

const CHAMA = "M10.5 1.5c.6 4 6.5 6.3 6.5 12.5a7 7 0 0 1-14 0c0-3.4 1.7-5.4 3.6-7 .1 2.3 1.1 3.6 2.4 4.2-.3-3.6.2-6.8 1.5-9.7z";

/** A medalha: um círculo liso na cor do metal, com o foguinho e duas fitas. */
export function Medalha({ nivel, tamanho = 18 }) {
  const m = MEDALHAS[nivel];
  if (!m) return null;
  return (
    <svg className="ap-vmedalha" width={tamanho} height={Math.round(tamanho * 1.25)} viewBox="0 0 20 25"
      role="img" aria-label={`Medalha de ${m.nome.toLowerCase()}`}>
      <path d="M5.6 15.5L4.2 24l2.5-1.5 2 2 1-7z" fill={m.fita} />
      <path d="M14.4 15.5l1.4 8.5-2.5-1.5-2 2-1-7z" fill={m.fita} />
      <circle cx="10" cy="10.5" r="9" fill={m.cor} />
      <path d={CHAMA} fill="#fff" transform="translate(10 11) scale(.56) translate(-10 -12)" />
    </svg>
  );
}

/** A medalha e o rótulo dela ("Menor preço"), nos cards compactos. */
function RotuloMedalha({ a }) {
  const nivel = a.medalha?.nivel;
  if (!nivel) return null;
  return (
    <span className={`ap-vrotulo ap-vrotulo--${nivel}`}>
      <Medalha nivel={nivel} tamanho={14} />
      <span>{MEDALHAS[nivel].rotulo}</span>
    </span>
  );
}

/** Por que a oferta ganhou a medalha — a transparência que faz confiar nela. */
function Motivo({ a }) {
  if (!a.medalha?.motivo) return null;
  return <span className={`ap-vmotivo ap-vmotivo--${a.medalha.nivel}`}>{a.medalha.motivo}</span>;
}

/** Estoque baixo, conferido na última verificação da tarefa. */
function Estoque({ a }) {
  if (!a.estoque_baixo) return null;
  return (
    <span className="ap-vestoque">
      {a.estoque_baixo === 1 ? "Última unidade" : `Últimas ${a.estoque_baixo} unidades`}
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
  if (a.cupom && a.preco_cupom != null) linhas.push(`*COM O CUPOM: ${money(a.preco_cupom)}*`);
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

/* ---- Cupom ----
   O cupom fica fora do link do anúncio: tocar nele copia o código, e não
   leva para a loja. Quem usa o cupom cola no carrinho, depois de abrir a
   oferta. Três formatos: o ticket, a faixa do card da calculadora e a
   pílula do banner. */

function useCopiar(codigo) {
  const [copiado, setCopiado] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }
  return [copiado, copiar];
}

export function Cupom({ cupom }) {
  const [copiado, copiar] = useCopiar(cupom.codigo);
  return (
    <button type="button" className="ap-vcupom" onClick={copiar} aria-label={`Copiar cupom ${cupom.codigo}`}>
      <span className="ap-vcupom__toco">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9a3 3 0 0 0 0 6v4h18v-4a3 3 0 0 0 0-6V5H3z" /><path d="M13 5v2M13 11v2M13 17v2" />
        </svg>
        <span>Cupom</span>
      </span>
      <span className="ap-vcupom__info">
        <code>{cupom.codigo}</code>
        {cupom.descricao && <span>{cupom.descricao}</span>}
      </span>
      <span className="ap-vcupom__acao" aria-live="polite">{copiado ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

function CupomFaixa({ cupom }) {
  const [copiado, copiar] = useCopiar(cupom.codigo);
  return (
    <button type="button" className="ap-vcupom-faixa" onClick={copiar} aria-label={`Copiar cupom ${cupom.codigo}`}>
      <span className="ap-vcupom-faixa__rot">Cupom</span>
      <code>{cupom.codigo}</code>
      <span className="ap-vcupom-faixa__acao" aria-live="polite">{copiado ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

function CupomPilula({ cupom }) {
  const [copiado, copiar] = useCopiar(cupom.codigo);
  return (
    <button type="button" className="ap-vdest__cupom" onClick={copiar} aria-label={`Copiar cupom ${cupom.codigo}`}>
      {copiado ? "Cupom copiado" : `Cupom ${cupom.codigo}`}
    </button>
  );
}

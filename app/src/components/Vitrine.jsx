"use client";
import React from "react";
import { money } from "@/lib/format";

/**
 * A vitrine de produtos com link de afiliado — a fonte de renda do app.
 *
 * Os produtos vêm de /api/anuncios, abastecida por uma tarefa automática.
 * O clique passa por /api/anuncios/:id/ir, que conta o clique e redireciona
 * para a loja; o rótulo "Patrocinado" e o rel="sponsored" deixam claro, para
 * a pessoa e para buscadores, que é publicidade.
 *
 * Sem anúncio cadastrado (ou com a API fora), a vitrine simplesmente não
 * aparece: a calculadora nunca depende dela.
 */
export function Vitrine({ limite = 4, categoria, titulo = "Achados para impressão 3D", recarregarEm }) {
  const [itens, setItens] = React.useState(null);
  const [semImagem, setSemImagem] = React.useState({});

  React.useEffect(() => {
    let vivo = true;
    const q = new URLSearchParams({ limite: String(limite) });
    if (categoria) q.set("categoria", categoria);
    fetch(`/api/anuncios?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { anuncios: [] }))
      .then((d) => vivo && setItens(d.anuncios || []))
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, [limite, categoria, recarregarEm]);

  if (!itens || itens.length === 0) return null;

  return (
    <section className="ap-vitrine" aria-label="Produtos patrocinados">
      <div className="ap-vitrine__topo">
        <h2>{titulo}</h2>
        <span className="ap-vitrine__selo">Patrocinado</span>
      </div>
      <ul className="ap-vitrine__lista">
        {itens.map((a) => (
          <li key={a.id} className="ap-vitrine__cartao">
            <a
              className="ap-vitrine__item"
              href={a.href}
              target="_blank"
              rel="sponsored nofollow noopener"
            >
              <span className="ap-vitrine__img">
                {a.imagem_url && !semImagem[a.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer"
                    onError={() => setSemImagem((v) => ({ ...v, [a.id]: true }))}
                  />
                ) : (
                  <span aria-hidden="true">3D</span>
                )}
                {a.selo && <span className="ap-vitrine__etiqueta">{a.selo}</span>}
              </span>
              <span className="ap-vitrine__corpo">
                <span className={`ap-vitrine__loja ap-vitrine__loja--${a.loja_codigo}`}>{a.loja}</span>
                <span className="ap-vitrine__titulo">{a.titulo}</span>
                {a.avaliacao != null && (
                  <span className="ap-vitrine__nota">
                    ★ {Number(a.avaliacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                    {a.num_avaliacoes ? ` (${a.num_avaliacoes.toLocaleString("pt-BR")})` : ""}
                  </span>
                )}
                {a.preco != null && (
                  <span className="ap-vitrine__preco">
                    {a.preco_original > a.preco && <s>{money(a.preco_original)}</s>}
                    <strong>{money(a.preco)}</strong>
                  </span>
                )}
                <span className="ap-vitrine__cta">Ver oferta</span>
              </span>
            </a>
            {a.cupom && <Cupom cupom={a.cupom} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * O cupom fica fora do link do anúncio: tocar nele copia o código, e não
 * leva para a loja. Quem usa o cupom cola no carrinho, depois de abrir a
 * oferta.
 */
function Cupom({ cupom }) {
  const [copiado, setCopiado] = React.useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(cupom.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }
  return (
    <button type="button" className="ap-vitrine__cupom" onClick={copiar} aria-label={`Copiar cupom ${cupom.codigo}`}>
      <span className="ap-vitrine__cupom-rot">{copiado ? "Copiado!" : "Cupom"}</span>
      <code>{cupom.codigo}</code>
      {cupom.descricao && <span className="ap-vitrine__cupom-desc">{cupom.descricao}</span>}
    </button>
  );
}

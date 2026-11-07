"use client";
import React from "react";
import { CartaoLinha } from "@/components/Vitrine";

/**
 * "Achamos uma oferta para este filamento" — dentro do formulário de
 * cadastro. Conforme a pessoa digita nome, marca e descrição, procura um
 * achado do mesmo material (e de preferência da mesma marca e cor). Não
 * achou nada que combine? Não mostra nada.
 */
export function OfertaFilamento({ linha }) {
  const texto = [linha?.nome, linha?.marca, linha?.descricao].filter(Boolean).join(" ").trim();
  const [oferta, setOferta] = React.useState(null);

  React.useEffect(() => {
    if (texto.length < 3) { setOferta(null); return; }
    let vivo = true;
    const t = setTimeout(() => {
      fetch(`/api/anuncios/relacionados?texto=${encodeURIComponent(texto)}&limite=1`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { anuncios: [] }))
        .then((d) => vivo && setOferta(d.anuncios?.[0] || null))
        .catch(() => {});
    }, 600);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [texto]);

  if (!oferta) return null;
  return (
    <div className="ap-oferta-fil" aria-live="polite">
      <div className="ap-oferta-fil__topo">
        <strong>{oferta.combina === "exato" ? "Achamos uma oferta deste filamento" : "Achamos uma oferta parecida"}</strong>
        <span className="ap-vitrine__selo">Patrocinado</span>
      </div>
      <CartaoLinha a={oferta} />
    </div>
  );
}

"use client";
import React from "react";
import { Input } from "@/design-system";

/**
 * Campo de texto com sugestões (impressoras, materiais, marcas…).
 *
 * As sugestões vêm de /api/sugestoes — a base pronta mais o que as pessoas
 * cadastram — e são filtradas enquanto a pessoa digita. Escolher uma
 * preenche este campo e, pelo `preencher` da coluna, os campos ligados a
 * ele (escolher "Bambu Lab A1" já traz a marca e a potência).
 *
 * Teclado: ↑/↓ andam, Enter escolhe, Esc fecha. Digitar algo que não está
 * na lista continua valendo: a sugestão ajuda, não obriga.
 */
const cache = {};
export function useSugestoes(tipo) {
  const [dados, setDados] = React.useState(cache[tipo] || null);
  React.useEffect(() => {
    if (!tipo || cache[tipo]) return;
    let vivo = true;
    fetch(`/api/sugestoes?tipo=${tipo}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        cache[tipo] = d;
        if (vivo) setDados(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [tipo]);
  return dados;
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CampoSugestivo({ label, valor, onChange, onEscolher, opcoes = [], autoFocus, placeholder, onEnter, detalhe }) {
  const [aberto, setAberto] = React.useState(false);
  const [foco, setFoco] = React.useState(-1);
  const ref = React.useRef(null);

  const filtradas = React.useMemo(() => {
    const q = norm(valor).trim();
    const lista = q ? opcoes.filter((o) => norm(o.valor).includes(q) && norm(o.valor) !== q) : opcoes;
    return lista.slice(0, 7);
  }, [opcoes, valor]);

  React.useEffect(() => setFoco(-1), [valor]);

  function escolher(o) {
    onChange(o.valor);
    onEscolher?.(o);
    setAberto(false);
  }

  const mostrar = aberto && filtradas.length > 0;

  return (
    <div
      className="ap-sugestivo"
      ref={ref}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget)) setAberto(false); }}
    >
      <Input
        label={label}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={valor ?? ""}
        autoComplete="off"
        role="combobox"
        aria-expanded={mostrar}
        aria-autocomplete="list"
        onFocus={() => setAberto(true)}
        onChange={(e) => { onChange(e.target.value); setAberto(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && filtradas.length) { e.preventDefault(); setAberto(true); setFoco((f) => Math.min(f + 1, filtradas.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setFoco((f) => Math.max(f - 1, -1)); }
          else if (e.key === "Escape") setAberto(false);
          else if (e.key === "Enter") {
            if (mostrar && foco >= 0) { e.preventDefault(); escolher(filtradas[foco]); }
            else onEnter?.();
          }
        }}
      />
      {mostrar && (
        <ul className="ap-sugestivo__lista" role="listbox">
          {filtradas.map((o, i) => (
            <li key={o.valor} role="option" aria-selected={i === foco}>
              <button
                type="button"
                tabIndex={-1}
                className={i === foco ? "is-foco" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
              >
                <span>{o.valor}</span>
                <small>
                  {detalhe ? detalhe(o) : null}
                  {o.contas >= 3 ? `${detalhe && detalhe(o) ? " · " : ""}popular` : ""}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

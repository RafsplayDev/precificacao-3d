"use client";
import React from "react";
import { createPortal } from "react-dom";
import { Icon } from "../core/Icon.jsx";

/**
 * Seletor com lista própria — o `<select>` nativo desenha a lista com a cara do
 * sistema operacional, que não obedece a nenhum token do design system.
 *
 * Segue o padrão listbox da WAI-ARIA: o gatilho é um `combobox` e a lista é um
 * `listbox` de `option`s. Teclado: setas andam, Home/End vão às pontas, letras
 * pulam para a opção que começa com elas, Enter escolhe, Esc fecha e devolve o
 * foco ao gatilho.
 *
 * A lista mora num portal no `body` e é posicionada em coordenadas de tela: em
 * tabelas com rolagem horizontal ou dentro de cartões animados, um menu preso
 * ao fluxo seria recortado.
 *
 * @startingPoint section="Forms" subtitle="Select with a styled listbox" viewport="420x260"
 */
export function Combobox({
  value, onChange, options = [], placeholder = "Selecionar",
  id, className = "", variant = "field", disabled = false, ariaLabel,
}) {
  const opcoes = React.useMemo(
    () => options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [options]
  );
  const rid = React.useId();
  const idLista = `cb-${rid}`;
  const refGatilho = React.useRef(null);
  const refLista = React.useRef(null);
  const busca = React.useRef({ texto: "", em: 0 });

  const [aberto, setAberto] = React.useState(false);
  const [caixa, setCaixa] = React.useState(null);
  const indiceAtual = opcoes.findIndex((o) => String(o.value ?? "") === String(value ?? ""));
  const [foco, setFoco] = React.useState(0);
  const atual = indiceAtual >= 0 ? opcoes[indiceAtual] : null;

  const medir = React.useCallback(() => {
    const el = refGatilho.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCaixa({ x: r.left, y: r.bottom, largura: r.width, topo: r.top });
  }, []);

  const abrir = () => {
    if (disabled) return;
    medir();
    setFoco(indiceAtual >= 0 ? indiceAtual : 0);
    setAberto(true);
  };

  const fechar = React.useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) refGatilho.current?.focus();
  }, []);

  const escolher = (i) => {
    const o = opcoes[i];
    if (!o) return fechar();
    if (String(o.value ?? "") !== String(value ?? "")) onChange?.(o.value);
    fechar();
  };

  // Enquanto aberto: acompanha rolagem e redimensionamento, e fecha ao clicar fora.
  React.useEffect(() => {
    if (!aberto) return;
    const fora = (e) => {
      if (refGatilho.current?.contains(e.target)) return;
      if (refLista.current?.contains(e.target)) return;
      fechar(false);
    };
    window.addEventListener("mousedown", fora, true);
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("mousedown", fora, true);
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [aberto, medir, fechar]);

  // O foco vai para a lista, para o leitor de tela anunciar a opção corrente.
  React.useEffect(() => {
    if (aberto) refLista.current?.focus();
  }, [aberto]);

  // Mantém a opção em foco à vista quando se anda com as setas.
  React.useEffect(() => {
    if (!aberto) return;
    refLista.current?.querySelector(`[data-i="${foco}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, foco]);

  /** Letras digitadas em sequência pulam para a opção que começa com elas. */
  const porLetra = (letra) => {
    const agora = Date.now();
    busca.current.texto = agora - busca.current.em > 700 ? letra : busca.current.texto + letra;
    busca.current.em = agora;
    const alvo = busca.current.texto.toLowerCase();
    const i = opcoes.findIndex((o) => String(o.label).toLowerCase().startsWith(alvo));
    if (i >= 0) setFoco(i);
  };

  const teclaNoGatilho = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      abrir();
    }
  };

  const teclaNaLista = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFoco((i) => Math.min(i + 1, opcoes.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFoco((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setFoco(0); }
    else if (e.key === "End") { e.preventDefault(); setFoco(opcoes.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escolher(foco); }
    else if (e.key === "Escape") { e.preventDefault(); fechar(); }
    else if (e.key === "Tab") { fechar(false); }
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) porLetra(e.key);
  };

  const rotulo = atual ? atual.label : placeholder;

  return (
    <span className={["dc-combo", `dc-combo--${variant}`, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        id={id}
        ref={refGatilho}
        className={`dc-combo__gatilho ${aberto ? "dc-combo__gatilho--on" : ""}`}
        role="combobox"
        aria-expanded={aberto}
        aria-haspopup="listbox"
        aria-controls={aberto ? idLista : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={teclaNoGatilho}
      >
        <span className={`dc-combo__valor ${atual ? "" : "dc-combo__valor--vazio"}`}>{rotulo}</span>
        <span className="dc-combo__chev" aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
      </button>

      {aberto && caixa && typeof document !== "undefined" && createPortal(
        <ul
          id={idLista}
          ref={refLista}
          role="listbox"
          tabIndex={-1}
          className="dc-combo__lista"
          aria-activedescendant={`${idLista}-${foco}`}
          onKeyDown={teclaNaLista}
          style={posicao(caixa)}
        >
          {opcoes.map((o, i) => (
            <li
              key={String(o.value ?? i)}
              id={`${idLista}-${i}`}
              data-i={i}
              role="option"
              aria-selected={i === indiceAtual}
              className={[
                "dc-combo__opcao",
                i === foco ? "dc-combo__opcao--foco" : "",
                i === indiceAtual ? "dc-combo__opcao--on" : "",
              ].filter(Boolean).join(" ")}
              onMouseEnter={() => setFoco(i)}
              onClick={() => escolher(i)}
            >
              <span className="dc-combo__rot">{o.label}</span>
              {i === indiceAtual && (
                <span className="dc-combo__check" aria-hidden="true"><Icon name="check" size={15} /></span>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </span>
  );
}

/** Abre para baixo; se não couber, sobe — sempre dentro da largura da tela. */
function posicao({ x, y, largura, topo }) {
  const alturaMax = 260;
  const folga = 6;
  const cabeAbaixo = typeof window === "undefined" || window.innerHeight - y > 180;
  const largMax = typeof window === "undefined" ? largura : Math.min(largura, window.innerWidth - 16);
  const esq = typeof window === "undefined" ? x : Math.max(8, Math.min(x, window.innerWidth - largMax - 8));
  return cabeAbaixo
    ? { top: y + folga, left: esq, width: largMax, maxHeight: alturaMax }
    : { bottom: window.innerHeight - topo + folga, left: esq, width: largMax, maxHeight: Math.min(alturaMax, topo - 16) };
}

"use client";
import React from "react";
import { IconButton } from "../core/IconButton.jsx";
import { Icon } from "../core/Icon.jsx";

/**
 * Área realmente visível da janela. No celular o teclado não encolhe a página:
 * ele cobre um pedaço dela. Quem sabe o tamanho do que sobrou é a visualViewport
 * — sem ela o diálogo se centraliza na tela inteira e metade fica atrás do teclado.
 */
export function useAreaVisivel() {
  const [area, setArea] = React.useState(null);

  React.useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const ler = () => setArea({ top: vv.offsetTop, height: vv.height });
    ler();
    vv.addEventListener("resize", ler);
    vv.addEventListener("scroll", ler);
    return () => {
      vv.removeEventListener("resize", ler);
      vv.removeEventListener("scroll", ler);
    };
  }, []);

  return area;
}

/**
 * @startingPoint section="Feedback" subtitle="Dialog, toast and tooltip" viewport="700x340"
 */
export function Dialog({ open = true, title, description, footer, onClose, width, children }) {
  const area = useAreaVisivel();
  if (!open) return null;

  // O scrim cobre só o que está à vista: o diálogo se centraliza aí, acima do teclado.
  const estilo = area ? { top: area.top, height: area.height, bottom: "auto" } : undefined;

  return React.createElement("div", {
    className: "dc-dialog__scrim", role: "presentation", style: estilo,
    onClick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); },
  }, React.createElement("div", { className: "dc-dialog", role: "dialog", "aria-modal": true, style: width ? { maxWidth: width } : undefined }, [
    React.createElement("div", { key: "h", className: "dc-dialog__head" }, [
      React.createElement("div", { key: "t" }, [
        React.createElement("div", { key: "tt", className: "dc-dialog__title" }, title),
        description ? React.createElement("div", { key: "d", className: "dc-dialog__desc" }, description) : null,
      ]),
      onClose ? React.createElement(IconButton, { key: "x", label: "Fechar", size: "sm", onClick: onClose },
        React.createElement(Icon, { name: "x", size: 16 })) : null,
    ]),
    children ? React.createElement("div", { key: "c", className: "dc-dialog__body" }, children) : null,
    footer ? React.createElement("div", { key: "f", className: "dc-dialog__foot" }, footer) : null,
  ]));
}

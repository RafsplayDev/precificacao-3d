"use client";
import React from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * @startingPoint section="Navigation" subtitle="Pill and underline tab bars" viewport="700x150"
 */
export function Tabs({ items = [], value, onChange, variant = "pill", className = "" }) {
  // Um id por fila de abas: sem isso o realce saltaria de uma fila para outra.
  const grupo = React.useId();
  const reduzido = useReducedMotion();

  return React.createElement("div", {
    role: "tablist",
    className: ["dc-tabs", "dc-tabs--" + variant, className].filter(Boolean).join(" "),
  }, items.map((it) => {
    const id = typeof it === "string" ? it : it.id;
    const label = typeof it === "string" ? it : it.label;
    const count = typeof it === "string" ? undefined : it.count;
    const on = id === value;
    return React.createElement("button", {
      key: id, role: "tab", "aria-selected": on,
      className: ["dc-tab", on ? "dc-tab--on" : ""].filter(Boolean).join(" "),
      onClick: () => onChange && onChange(id),
    }, [
      // O realce é um só, que desliza para a aba escolhida — assim o toque já
      // mostra a aba selecionada, em vez de parecer que ficou no hover.
      on && variant === "pill"
        ? React.createElement(motion.span, {
            key: "p",
            layoutId: "tab-" + grupo,
            // Só a troca de aba move o realce: sem isso qualquer re-render que
            // desloque a fila (um número que muda de largura, por exemplo)
            // fazia a pílula deslizar sozinha.
            layoutDependency: value,
            className: "dc-tab__pilula",
            "aria-hidden": true,
            transition: reduzido
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
          })
        : null,
      React.createElement("span", { key: "l", className: "dc-tab__rot" }, label),
      count !== undefined ? React.createElement("span", { key: "c", className: "dc-tab__count" }, count) : null,
    ]);
  }));
}

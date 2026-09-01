import React from "react";

// `sideOffset` de 10px e a mola de abertura vêm do tooltip do Animate UI
// (spring stiffness 300 / damping 35): o balão nasce um pouco menor e
// deslocado na direção do gatilho, e passa um fio do tamanho final antes
// de assentar. Ver `--ease-mola` em components.css.
const POS = {
  top: { bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
  left: { right: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" },
  right: { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" },
};

export function Tooltip({ content, side = "top", className = "", children }) {
  const [on, setOn] = React.useState(false);
  return React.createElement("span", {
    className: ["dc-tooltip", on ? "dc-tooltip--on" : "", className].filter(Boolean).join(" "),
    onMouseEnter: () => setOn(true), onMouseLeave: () => setOn(false),
    onFocus: () => setOn(true), onBlur: () => setOn(false),
  }, [
    children,
    // Duas camadas: a de fora posiciona (o transform do POS é dela), a de
    // dentro anima. Uma só brigaria consigo mesma pelo `transform`.
    React.createElement("span", { key: "b", className: "dc-tooltip__ancora", style: POS[side] },
      React.createElement("span", { className: "dc-tooltip__bubble", role: "tooltip", "data-lado": side }, content)),
  ]);
}

import React from "react";

const POS = {
  top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
  left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
};

export function Tooltip({ content, side = "top", className = "", children }) {
  const [on, setOn] = React.useState(false);
  return React.createElement("span", {
    className: ["dc-tooltip", on ? "dc-tooltip--on" : "", className].filter(Boolean).join(" "),
    onMouseEnter: () => setOn(true), onMouseLeave: () => setOn(false),
    onFocus: () => setOn(true), onBlur: () => setOn(false),
  }, [
    children,
    React.createElement("span", { key: "b", className: "dc-tooltip__bubble", role: "tooltip", style: POS[side] }, content),
  ]);
}

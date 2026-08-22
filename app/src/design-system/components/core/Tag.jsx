import React from "react";
import { Icon } from "./Icon.jsx";

export function Tag({ color, selected = false, onClick, onRemove, className = "", children, ...rest }) {
  const clickable = Boolean(onClick);
  return React.createElement("span", {
    className: ["dc-tag", clickable ? "dc-tag--clickable" : "", selected ? "dc-tag--selected" : "", className].filter(Boolean).join(" "),
    onClick, role: clickable ? "button" : undefined, tabIndex: clickable ? 0 : undefined, ...rest,
  }, [
    color ? React.createElement("span", { key: "d", className: "dc-tag__dot", style: { background: color } }) : null,
    React.createElement("span", { key: "t" }, children),
    onRemove ? React.createElement("button", {
      key: "x", className: "dc-tag__x", "aria-label": "Remover",
      onClick: (e) => { e.stopPropagation(); onRemove(e); },
    }, React.createElement(Icon, { name: "x", size: 13 })) : null,
  ]);
}

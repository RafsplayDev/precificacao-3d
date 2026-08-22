import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ label, hint, error, options = [], id, className = "", ...rest }) {
  const rid = id || React.useMemo(() => "se-" + Math.random().toString(36).slice(2, 7), []);
  return React.createElement("div", { className: ["dc-field", className].filter(Boolean).join(" ") }, [
    label ? React.createElement("label", { key: "l", className: "dc-field__label", htmlFor: rid }, label) : null,
    React.createElement("span", { key: "w", className: "dc-select__wrap" }, [
      React.createElement("select", { key: "s", id: rid, className: "dc-select", ...rest },
        options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o : o.label;
          return React.createElement("option", { key: val, value: val }, lab);
        })),
      React.createElement("span", { key: "c", className: "dc-select__chev" }, React.createElement(Icon, { name: "chevron-down", size: 16 })),
    ]),
    error ? React.createElement("span", { key: "e", className: "dc-field__error" }, error)
      : hint ? React.createElement("span", { key: "h", className: "dc-field__hint" }, hint) : null,
  ]);
}

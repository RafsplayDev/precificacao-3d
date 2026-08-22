import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Checkbox({ label, description, checked = false, onChange, disabled = false, className = "" }) {
  return React.createElement("label", {
    className: ["dc-check", checked ? "dc-check--on" : "", className].filter(Boolean).join(" "),
    style: disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined,
  }, [
    React.createElement("input", {
      key: "i", type: "checkbox", checked, disabled,
      onChange: (e) => onChange && onChange(e.target.checked, e),
      style: { position: "absolute", opacity: 0, width: 0, height: 0 },
    }),
    React.createElement("span", { key: "b", className: "dc-check__box" },
      checked ? React.createElement(Icon, { name: "check", size: 12, strokeWidth: 3 }) : null),
    React.createElement("span", { key: "t" }, [
      React.createElement("span", { key: "l" }, label),
      description ? React.createElement("span", { key: "d", className: "dc-check__desc" }, description) : null,
    ]),
  ]);
}

import React from "react";

export function Radio({ label, description, checked = false, onChange, name, value, disabled = false, className = "" }) {
  return React.createElement("label", {
    className: ["dc-check", checked ? "dc-check--on" : "", className].filter(Boolean).join(" "),
    style: disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined,
  }, [
    React.createElement("input", {
      key: "i", type: "radio", name, value, checked, disabled,
      onChange: (e) => onChange && onChange(value, e),
      style: { position: "absolute", opacity: 0, width: 0, height: 0 },
    }),
    React.createElement("span", { key: "b", className: "dc-check__box dc-check__box--radio" },
      checked ? React.createElement("span", { className: "dc-check__dot" }) : null),
    React.createElement("span", { key: "t" }, [
      React.createElement("span", { key: "l" }, label),
      description ? React.createElement("span", { key: "d", className: "dc-check__desc" }, description) : null,
    ]),
  ]);
}

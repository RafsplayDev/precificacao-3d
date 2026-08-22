import React from "react";

export function Switch({ label, checked = false, onChange, disabled = false, className = "" }) {
  return React.createElement("label", {
    className: ["dc-switch", checked ? "dc-switch--on" : "", className].filter(Boolean).join(" "),
    style: disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined,
  }, [
    React.createElement("input", {
      key: "i", type: "checkbox", role: "switch", checked, disabled,
      onChange: (e) => onChange && onChange(e.target.checked, e),
      style: { position: "absolute", opacity: 0, width: 0, height: 0 },
    }),
    React.createElement("span", { key: "t", className: "dc-switch__track" },
      React.createElement("span", { className: "dc-switch__knob" })),
    label ? React.createElement("span", { key: "l" }, label) : null,
  ]);
}

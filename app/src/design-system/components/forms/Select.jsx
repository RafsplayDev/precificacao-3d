import React from "react";
import { Combobox } from "./Combobox.jsx";

/**
 * Campo de escolha. Por fora continua o mesmo do `<select>` que ele substituiu
 * — `options`, `value` e um `onChange` que recebe algo com `target.value` — mas
 * por dentro é o Combobox, para a lista aberta ter a cara do design system.
 */
export function Select({ label, hint, error, options = [], id, className = "", value, onChange, disabled, placeholder, ...rest }) {
  const rid = React.useId();
  const idCampo = id || `se-${rid}`;
  return React.createElement("div", { className: ["dc-field", className].filter(Boolean).join(" ") }, [
    label ? React.createElement("label", { key: "l", className: "dc-field__label", htmlFor: idCampo }, label) : null,
    React.createElement(Combobox, {
      key: "c",
      id: idCampo,
      options,
      value,
      disabled,
      placeholder,
      ariaLabel: label ? undefined : rest["aria-label"],
      // os call sites nasceram com um <select>: seguem recebendo o evento
      onChange: (v) => onChange && onChange({ target: { value: v } }),
    }),
    error ? React.createElement("span", { key: "e", className: "dc-field__error" }, error)
      : hint ? React.createElement("span", { key: "h", className: "dc-field__hint" }, hint) : null,
  ]);
}

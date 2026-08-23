"use client";
import React from "react";

/**
 * @startingPoint section="Forms" subtitle="Inputs, select, checkbox, radio and switch" viewport="700x300"
 */
export function Input({
  label, hint, error, size = "md", prefix, suffix, id, className = "", ...rest
}) {
  const gerado = React.useMemo(() => "in-" + Math.random().toString(36).slice(2, 7), []);
  const rid = id || gerado;

  // Campo de senha ganha o olho de revelar. Digitar uma senha às cegas, sem
  // poder conferir, é a causa mais boba de "e-mail ou senha incorretos" — e
  // quem está criando a conta ainda não tem o hábito de digitar aquela senha.
  const ehSenha = rest.type === "password";
  const [revelada, setRevelada] = React.useState(false);
  const tipo = ehSenha && revelada ? "text" : rest.type;

  const olho = ehSenha
    ? React.createElement(
        "button",
        {
          key: "olho",
          type: "button",
          className: "dc-input__olho",
          onClick: () => setRevelada((v) => !v),
          "aria-label": revelada ? "Ocultar senha" : "Mostrar senha",
          title: revelada ? "Ocultar senha" : "Mostrar senha",
        },
        revelada ? "🙈" : "👁"
      )
    : null;

  return React.createElement("div", { className: ["dc-field", className].filter(Boolean).join(" ") }, [
    label ? React.createElement("label", { key: "l", className: "dc-field__label", htmlFor: rid }, label) : null,
    React.createElement("div", {
      key: "i", className: ["dc-input", "dc-input--" + size, error ? "dc-input--error" : ""].filter(Boolean).join(" "),
    }, [
      prefix ? React.createElement("span", { key: "p", className: "dc-input__affix" }, prefix) : null,
      React.createElement("input", { key: "e", id: rid, className: "dc-input__el", ...rest, type: tipo }),
      olho,
      suffix ? React.createElement("span", { key: "s", className: "dc-input__affix" }, suffix) : null,
    ]),
    error ? React.createElement("span", { key: "e2", className: "dc-field__error" }, error)
      : hint ? React.createElement("span", { key: "h", className: "dc-field__hint" }, hint) : null,
  ]);
}

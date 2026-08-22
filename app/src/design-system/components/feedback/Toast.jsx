import React from "react";
import { IconButton } from "../core/IconButton.jsx";
import { Icon } from "../core/Icon.jsx";

const BAR = {
  success: "var(--fil-mint)", info: "var(--fil-cyan)",
  warning: "var(--fil-yellow)", danger: "var(--fil-magenta)",
};

export function Toast({ tone = "success", title, message, action, onClose, className = "" }) {
  return React.createElement("div", { className: ["dc-toast", className].filter(Boolean).join(" "), role: "status" }, [
    React.createElement("span", { key: "b", className: "dc-toast__bar", style: { background: BAR[tone] || BAR.success } }),
    React.createElement("div", { key: "c", style: { flex: 1 } }, [
      React.createElement("div", { key: "t", className: "dc-toast__title" }, title),
      message ? React.createElement("div", { key: "m", className: "dc-toast__msg" }, message) : null,
    ]),
    action || null,
    onClose ? React.createElement(IconButton, {
      key: "x", label: "Fechar", size: "sm", onClick: onClose, style: { color: "var(--ink-200)" },
    }, React.createElement(Icon, { name: "x", size: 14 })) : null,
  ]);
}

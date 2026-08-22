import React from "react";
import { IconButton } from "../core/IconButton.jsx";
import { Icon } from "../core/Icon.jsx";

/**
 * @startingPoint section="Feedback" subtitle="Dialog, toast and tooltip" viewport="700x340"
 */
export function Dialog({ open = true, title, description, footer, onClose, width, children }) {
  if (!open) return null;
  return React.createElement("div", {
    className: "dc-dialog__scrim", role: "presentation",
    onClick: (e) => { if (e.target === e.currentTarget && onClose) onClose(); },
  }, React.createElement("div", { className: "dc-dialog", role: "dialog", "aria-modal": true, style: width ? { maxWidth: width } : undefined }, [
    React.createElement("div", { key: "h", className: "dc-dialog__head" }, [
      React.createElement("div", { key: "t" }, [
        React.createElement("div", { key: "tt", className: "dc-dialog__title" }, title),
        description ? React.createElement("div", { key: "d", className: "dc-dialog__desc" }, description) : null,
      ]),
      onClose ? React.createElement(IconButton, { key: "x", label: "Fechar", size: "sm", onClick: onClose },
        React.createElement(Icon, { name: "x", size: 16 })) : null,
    ]),
    children ? React.createElement("div", { key: "c", style: { marginTop: "var(--space-5)" } }, children) : null,
    footer ? React.createElement("div", { key: "f", className: "dc-dialog__foot" }, footer) : null,
  ]));
}

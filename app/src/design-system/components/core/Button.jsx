import React from "react";

/**
 * @startingPoint section="Core" subtitle="Buttons, icon buttons, badges and tags" viewport="700x220"
 */
export function Button({
  variant = "primary", size = "md", icon, iconRight, block = false,
  disabled = false, href, type = "button", className = "", children, ...rest
}) {
  const cls = ["dc-btn", "dc-btn--" + variant, "dc-btn--" + size, block ? "dc-btn--block" : "", className]
    .filter(Boolean).join(" ");
  const inner = [
    icon ? React.createElement("span", { key: "l", style: { display: "inline-flex" } }, icon) : null,
    children ? React.createElement("span", { key: "t" }, children) : null,
    iconRight ? React.createElement("span", { key: "r", style: { display: "inline-flex" } }, iconRight) : null,
  ];
  if (href) return React.createElement("a", { className: cls, href, "aria-disabled": disabled || undefined, ...rest }, inner);
  return React.createElement("button", { className: cls, type, disabled, ...rest }, inner);
}

import React from "react";

export function Card({
  elevation = "flat", interactive = false, inverse = false, padding = "var(--space-5)",
  as = "div", className = "", style, children, ...rest
}) {
  return React.createElement(as, {
    className: [
      "dc-card",
      elevation === "raised" ? "dc-card--raised" : "",
      interactive ? "dc-card--interactive" : "",
      inverse ? "dc-card--inverse" : "",
      className,
    ].filter(Boolean).join(" "),
    style: { padding, ...style }, ...rest,
  }, children);
}

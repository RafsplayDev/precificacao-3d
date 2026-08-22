import React from "react";
import { Card } from "../core/Card.jsx";
import { Button } from "../core/Button.jsx";
import { Badge } from "../core/Badge.jsx";
import { Icon } from "../core/Icon.jsx";

export function PlanCard({
  name, price, period = "/mês", blurb, features = [], featured = false,
  ctaLabel = "Assinar", onCta, note, className = "",
}) {
  return React.createElement(Card, {
    inverse: featured, elevation: featured ? "raised" : "flat", padding: 0, className,
  }, React.createElement("div", { className: "dc-plan" }, [
    React.createElement("div", { key: "h", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" } }, [
      React.createElement("span", { key: "n", className: "dc-eyebrow", style: featured ? { color: "var(--ink-200)" } : undefined }, name),
      featured ? React.createElement(Badge, { key: "b", tone: "accent", variant: "solid" }, "Popular") : null,
    ]),
    React.createElement("div", { key: "p", style: { display: "flex", alignItems: "baseline", gap: 6 } }, [
      React.createElement("span", { key: "v", className: "dc-plan__price", style: featured ? { color: "#fff" } : undefined }, price),
      React.createElement("span", { key: "pe", style: { fontFamily: "var(--font-mono)", fontSize: "var(--text-body-sm)", color: featured ? "var(--ink-300)" : "var(--text-muted)" } }, period),
    ]),
    blurb ? React.createElement("p", { key: "bl", style: { margin: 0, fontSize: "var(--text-body-sm)", color: featured ? "var(--ink-200)" : "var(--text-muted)" } }, blurb) : null,
    React.createElement("div", { key: "f", style: { display: "flex", flexDirection: "column", gap: "var(--space-2)" } },
      features.map((ft, i) => React.createElement("span", { key: i, className: "dc-plan__feat", style: featured ? { color: "var(--ink-150)" } : undefined }, [
        React.createElement(Icon, { key: "i", name: "check", size: 15, color: featured ? "var(--fil-mint)" : "var(--status-success)" }),
        React.createElement("span", { key: "t" }, ft),
      ]))),
    React.createElement(Button, {
      key: "cta", block: true, variant: featured ? "accent" : "secondary", onClick: onCta,
    }, ctaLabel),
    note ? React.createElement("span", { key: "no", style: { fontSize: "var(--text-caption)", color: featured ? "var(--ink-300)" : "var(--text-faint)", textAlign: "center" } }, note) : null,
  ]));
}

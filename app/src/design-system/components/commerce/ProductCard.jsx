import React from "react";
import { Card } from "../core/Card.jsx";
import { Badge } from "../core/Badge.jsx";
import { Button } from "../core/Button.jsx";
import { Icon } from "../core/Icon.jsx";
import { FilamentSwatches } from "./FilamentSwatches.jsx";

export function ProductCard({
  name, price, note, image, badge, badgeTone = "accent", colors, color, onColorChange,
  ctaLabel = "Personalizar", onCta, className = "",
}) {
  return React.createElement(Card, { interactive: true, padding: "var(--space-3)", className }, [
    React.createElement("div", { key: "m", className: "dc-prodcard__media dc-bedgrid" }, [
      image
        ? React.createElement("img", { key: "i", src: image, alt: name, className: "dc-prodcard__img" })
        : React.createElement("span", { key: "ph", style: { fontSize: "var(--text-caption)", color: "var(--text-faint)", fontFamily: "var(--font-mono)" } }, "foto do produto"),
      badge ? React.createElement("span", { key: "b", style: { position: "absolute", top: 10, left: 10 } },
        React.createElement(Badge, { tone: badgeTone, variant: "solid" }, badge)) : null,
    ]),
    React.createElement("div", { key: "b2", style: { padding: "var(--space-4) var(--space-2) var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-3)" } }, [
      React.createElement("div", { key: "r", style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-3)" } }, [
        React.createElement("span", { key: "n", className: "dc-prodcard__name" }, name),
        React.createElement("span", { key: "p", className: "dc-prodcard__price" }, price),
      ]),
      note ? React.createElement("span", { key: "no", style: { fontSize: "var(--text-body-sm)", color: "var(--text-muted)" } }, note) : null,
      colors ? React.createElement(FilamentSwatches, { key: "c", colors, value: color, onChange: onColorChange, size: 22 }) : null,
      React.createElement(Button, {
        key: "cta", variant: "primary", block: true, onClick: onCta,
        iconRight: React.createElement(Icon, { name: "arrow-right", size: 16 }),
      }, ctaLabel),
    ]),
  ]);
}

import React from "react";

/** Canonical Drop Color filament palette — the shop's default colour set. */
export const FILAMENTS = [
  { name: "Magenta", hex: "#FF2D6F" },
  { name: "Coral", hex: "#FF5A3C" },
  { name: "Âmbar", hex: "#FFCA1A" },
  { name: "Menta", hex: "#0FD9A0" },
  { name: "Ciano", hex: "#16C0F0" },
  { name: "Violeta", hex: "#7B5BFF" },
  { name: "Grafite", hex: "#1C1E23" },
  { name: "Osso", hex: "#EFEAE1" },
];

/**
 * @startingPoint section="Commerce" subtitle="Product, model and plan cards" viewport="700x360"
 */
export function FilamentSwatches({ colors = FILAMENTS, value, onChange, size = 26, showName = false, className = "" }) {
  const current = colors.find((c) => c.name === value);
  return React.createElement("div", { className, style: { display: "flex", flexDirection: "column", gap: "var(--space-2)" } }, [
    React.createElement("div", { key: "s", style: { display: "flex", gap: "var(--space-2)", flexWrap: "wrap" } },
      colors.map((c) => React.createElement("button", {
        key: c.name, type: "button", title: c.name, "aria-label": c.name,
        className: ["dc-swatch", value === c.name ? "dc-swatch--on" : ""].filter(Boolean).join(" "),
        style: { background: c.hex, width: size, height: size },
        onClick: () => onChange && onChange(c.name, c),
      }))),
    showName ? React.createElement("span", { key: "n", style: { fontSize: "var(--text-caption)", color: "var(--text-muted)" } },
      current ? current.name : "Escolha uma cor") : null,
  ]);
}

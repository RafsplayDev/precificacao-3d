import React from "react";
import { Card } from "../core/Card.jsx";
import { Badge } from "../core/Badge.jsx";
import { Icon } from "../core/Icon.jsx";

export function ModelCard({
  name, image, tier, difficulty, formats = [], downloads, locked = false, onOpen, className = "",
}) {
  return React.createElement(Card, { interactive: true, padding: 0, onClick: onOpen, className }, [
    React.createElement("div", {
      key: "m", className: "dc-bedgrid",
      style: {
        position: "relative", aspectRatio: "1/1", borderTopLeftRadius: "var(--radius-card)",
        borderTopRightRadius: "var(--radius-card)", overflow: "hidden", backgroundColor: "var(--surface-sunken)",
        display: "flex", alignItems: "center", justifyContent: "center",
      },
    }, [
      image ? React.createElement("img", { key: "i", src: image, alt: name, className: "dc-prodcard__img" })
        : React.createElement("span", { key: "p", style: { fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--text-faint)" } }, "render do modelo"),
      tier ? React.createElement("span", { key: "t", style: { position: "absolute", top: 10, left: 10 } },
        React.createElement(Badge, { tone: tier === "Free" ? "neutral" : "accent", variant: "solid" }, tier)) : null,
      locked ? React.createElement("span", {
        key: "l",
        style: { position: "absolute", inset: 0, background: "rgba(8,9,11,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" },
      }, React.createElement(Icon, { name: "lock", size: 22 })) : null,
    ]),
    React.createElement("div", { key: "b", style: { padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 6 } }, [
      React.createElement("span", { key: "n", style: { fontFamily: "var(--font-display)", fontSize: "var(--text-body-lg)", color: "var(--text-strong)", letterSpacing: "-.01em" } }, name),
      React.createElement("span", {
        key: "m2", style: { fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--text-muted)", display: "flex", gap: 8, flexWrap: "wrap" },
      }, [
        difficulty ? React.createElement("span", { key: "d" }, difficulty) : null,
        formats.length ? React.createElement("span", { key: "f" }, formats.join(" · ")) : null,
        downloads !== undefined ? React.createElement("span", { key: "dl" }, downloads + " downloads") : null,
      ]),
    ]),
  ]);
}

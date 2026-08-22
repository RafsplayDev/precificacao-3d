import React from "react";

/**
 * @startingPoint section="Navigation" subtitle="Pill and underline tab bars" viewport="700x150"
 */
export function Tabs({ items = [], value, onChange, variant = "pill", className = "" }) {
  return React.createElement("div", {
    role: "tablist",
    className: ["dc-tabs", "dc-tabs--" + variant, className].filter(Boolean).join(" "),
  }, items.map((it) => {
    const id = typeof it === "string" ? it : it.id;
    const label = typeof it === "string" ? it : it.label;
    const count = typeof it === "string" ? undefined : it.count;
    const on = id === value;
    return React.createElement("button", {
      key: id, role: "tab", "aria-selected": on,
      className: ["dc-tab", on ? "dc-tab--on" : ""].filter(Boolean).join(" "),
      onClick: () => onChange && onChange(id),
    }, [
      React.createElement("span", { key: "l" }, label),
      count !== undefined ? React.createElement("span", { key: "c", className: "dc-tab__count" }, count) : null,
    ]);
  }));
}

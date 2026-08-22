import React from "react";

const pascal = (n) => String(n).replace(/(^|-)([a-z0-9])/g, (m, a, b) => b.toUpperCase());

/** Lucide ships icons either as a flat [ [tag,attrs], … ] list or as a full
 *  ['svg', attrs, children] tuple depending on build — normalize both. */
function normalize(raw) {
  if (!raw) return null;
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw.default) ? raw.default : null;
  if (!arr) return null;
  if (typeof arr[0] === "string" && arr[0].toLowerCase() === "svg") {
    const kids = arr[2];
    return Array.isArray(kids) ? kids.filter((n) => Array.isArray(n)) : [];
  }
  return arr.filter((n) => Array.isArray(n));
}

function iconNode(name) {
  const L = typeof window !== "undefined" ? window.lucide : null;
  if (!L) return null;
  const key = pascal(name);
  const raw = (L.icons && (L.icons[key] || L.icons[name])) || L[key] || L[name];
  return normalize(raw);
}

/** Thin wrapper around the Lucide icon set (loaded from CDN as `window.lucide`). */
export function Icon({ name, size = 18, strokeWidth = 1.75, color = "currentColor", style, ...rest }) {
  const [mounted, setMounted] = React.useState(false);
  const [, tick] = React.useState(0);

  React.useEffect(() => {
    setMounted(true);
    if (iconNode(name)) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (iconNode(name) || n > 25) { clearInterval(t); tick((v) => v + 1); }
    }, 120);
    return () => clearInterval(t);
  }, [name]);

  const node = mounted ? iconNode(name) : null;
  const svgProps = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": true, style: { flex: "none", display: "block", ...style }, ...rest,
  };
  if (!node || !node.length) return React.createElement("svg", svgProps);
  return React.createElement(
    "svg", svgProps,
    node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))
  );
}


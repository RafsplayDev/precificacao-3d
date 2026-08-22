import React from "react";

const TONES = {
  neutral: { solid: ["var(--ink-950)", "#fff"], soft: ["var(--ink-50)", "var(--text-body)"] },
  accent: { solid: ["var(--fil-magenta)", "#fff"], soft: ["var(--fil-magenta-soft)", "#B3113F"] },
  success: { solid: ["var(--status-success)", "#fff"], soft: ["var(--status-success-soft)", "#07734F"] },
  warning: { solid: ["var(--fil-yellow)", "var(--ink-950)"], soft: ["var(--status-warning-soft)", "#8A5F00"] },
  danger: { solid: ["var(--status-danger)", "#fff"], soft: ["var(--status-danger-soft)", "#A81639"] },
  info: { solid: ["var(--status-info)", "#fff"], soft: ["var(--status-info-soft)", "#0A6A8F"] },
};

export function Badge({ tone = "neutral", variant = "soft", pill = false, className = "", children, ...rest }) {
  const pair = (TONES[tone] || TONES.neutral)[variant === "outline" ? "soft" : variant];
  const style = variant === "outline"
    ? { background: "transparent", color: "var(--text-body)", borderColor: "var(--border-default)" }
    : { background: pair[0], color: pair[1] };
  return React.createElement("span", {
    className: ["dc-badge", pill ? "dc-badge--pill" : "", className].filter(Boolean).join(" "),
    style, ...rest,
  }, children);
}

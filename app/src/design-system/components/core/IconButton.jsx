import React from "react";

export function IconButton({ variant = "ghost", size = "md", label, className = "", children, ...rest }) {
  return React.createElement("button", {
    type: "button", "aria-label": label,
    className: ["dc-iconbtn", "dc-iconbtn--" + variant, "dc-iconbtn--" + size, className].filter(Boolean).join(" "),
    ...rest,
  }, children);
}

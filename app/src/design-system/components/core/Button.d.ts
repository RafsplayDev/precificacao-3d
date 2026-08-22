import * as React from "react";

/**
 * Primary action control.
 * @startingPoint section="Core" subtitle="Buttons, icon buttons, badges and tags" viewport="700x220"
 */
export interface ButtonProps {
  /** primary = ink fill (default CTA), accent = magenta fill (single hero action per view), secondary = hairline outline, ghost = bare, inverse = white on dark. */
  variant?: "primary" | "accent" | "secondary" | "ghost" | "inverse";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  block?: boolean;
  disabled?: boolean;
  /** Renders an <a> instead of a <button>. */
  href?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;

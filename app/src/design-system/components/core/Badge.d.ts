import * as React from "react";

export interface BadgeProps {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  variant?: "solid" | "soft" | "outline";
  /** Fully rounded instead of the default 4px corner. */
  pill?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export declare function Badge(props: BadgeProps): JSX.Element;

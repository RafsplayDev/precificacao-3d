import * as React from "react";

export interface IconButtonProps {
  variant?: "ghost" | "outline" | "solid";
  size?: "sm" | "md" | "lg";
  /** Accessible name — required, the button has no text. */
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;

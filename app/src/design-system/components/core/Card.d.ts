import * as React from "react";

export interface CardProps {
  elevation?: "flat" | "raised";
  /** Adds pointer + lift-on-hover behaviour. */
  interactive?: boolean;
  /** Ink surface for dark sections. */
  inverse?: boolean;
  /** CSS padding value; pass 0 for full-bleed media cards. */
  padding?: string | number;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export declare function Card(props: CardProps): JSX.Element;

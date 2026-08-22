import * as React from "react";

export interface PlanCardProps {
  name: string;
  /** Formatted price, e.g. "R$ 39". */
  price: string;
  /** Default "/mês". */
  period?: string;
  blurb?: string;
  features?: string[];
  /** Ink surface + magenta CTA — use on at most one plan. */
  featured?: boolean;
  ctaLabel?: string;
  onCta?: () => void;
  /** Fine print under the CTA. */
  note?: string;
  className?: string;
}

export declare function PlanCard(props: PlanCardProps): JSX.Element;

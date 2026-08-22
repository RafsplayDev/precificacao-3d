import * as React from "react";

export interface TabItem { id: string; label: string; count?: number }

/**
 * Horizontal view switcher.
 * @startingPoint section="Navigation" subtitle="Pill and underline tab bars" viewport="700x150"
 */
export interface TabsProps {
  items: Array<string | TabItem>;
  value?: string;
  onChange?: (id: string) => void;
  /** pill = filter chips on light surfaces; underline = section nav inside a page. */
  variant?: "pill" | "underline";
  className?: string;
}

export declare function Tabs(props: TabsProps): JSX.Element;

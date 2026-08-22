import * as React from "react";

/**
 * Single-line text field with label, hint and error slots.
 * @startingPoint section="Forms" subtitle="Inputs, select, checkbox, radio and switch" viewport="700x300"
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  /** Replaces the hint and turns the border red. */
  error?: string;
  size?: "sm" | "md" | "lg";
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export declare function Input(props: InputProps): JSX.Element;

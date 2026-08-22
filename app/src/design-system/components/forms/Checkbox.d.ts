import * as React from "react";

export interface CheckboxProps {
  label?: React.ReactNode;
  /** Secondary line under the label. */
  description?: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

export declare function Checkbox(props: CheckboxProps): JSX.Element;

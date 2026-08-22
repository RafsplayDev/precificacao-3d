import * as React from "react";

export interface RadioProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  checked?: boolean;
  onChange?: (value: string | undefined, e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

export declare function Radio(props: RadioProps): JSX.Element;

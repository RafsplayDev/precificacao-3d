import * as React from "react";

export interface ToastProps {
  /** Sets the left accent bar colour only — the toast itself is always ink. */
  tone?: "success" | "info" | "warning" | "danger";
  title?: React.ReactNode;
  message?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export declare function Toast(props: ToastProps): JSX.Element;

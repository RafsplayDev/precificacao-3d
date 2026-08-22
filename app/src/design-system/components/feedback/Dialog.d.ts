import * as React from "react";

/**
 * Centred modal over a blurred ink scrim.
 * @startingPoint section="Feedback" subtitle="Dialog, toast and tooltip" viewport="700x340"
 */
export interface DialogProps {
  open?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons, right-aligned. */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** Overrides the 460px max width. */
  width?: number | string;
  children?: React.ReactNode;
}

export declare function Dialog(props: DialogProps): JSX.Element | null;

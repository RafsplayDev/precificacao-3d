import * as React from "react";

export interface TagProps {
  /** Any CSS colour — renders a filament dot before the label. */
  color?: string;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  /** Renders a remove affordance. */
  onRemove?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export declare function Tag(props: TagProps): JSX.Element;

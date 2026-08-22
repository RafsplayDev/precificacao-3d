import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Lucide icon name, kebab or Pascal case: "shopping-bag", "ArrowRight". */
  name: string;
  /** Pixel size, square. Default 18. */
  size?: number;
  /** Stroke width. Brand default is 1.75. */
  strokeWidth?: number;
  /** Stroke colour. Default "currentColor". */
  color?: string;
}

export declare function Icon(props: IconProps): JSX.Element;

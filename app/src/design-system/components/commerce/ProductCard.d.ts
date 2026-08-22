import * as React from "react";
import { Filament } from "./FilamentSwatches";

export interface ProductCardProps {
  name: string;
  /** Pre-formatted, e.g. "R$ 89". */
  price: string;
  /** One short line: material, size or lead time. */
  note?: string;
  image?: string;
  badge?: string;
  badgeTone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  /** Showing swatches turns the card into a mini configurator. */
  colors?: Filament[];
  color?: string;
  onColorChange?: (name: string, filament: Filament) => void;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export declare function ProductCard(props: ProductCardProps): JSX.Element;

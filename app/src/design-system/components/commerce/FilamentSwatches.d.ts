import * as React from "react";

export interface Filament { name: string; hex: string }

export declare const FILAMENTS: Filament[];

/**
 * Filament colour picker — the brand's signature control.
 * @startingPoint section="Commerce" subtitle="Product, model and plan cards" viewport="700x360"
 */
export interface FilamentSwatchesProps {
  /** Defaults to the canonical FILAMENTS palette. */
  colors?: Filament[];
  /** Selected filament name. */
  value?: string;
  onChange?: (name: string, filament: Filament) => void;
  /** Swatch diameter in px. Default 26. */
  size?: number;
  /** Shows the selected colour's name under the row. */
  showName?: boolean;
  className?: string;
}

export declare function FilamentSwatches(props: FilamentSwatchesProps): JSX.Element;

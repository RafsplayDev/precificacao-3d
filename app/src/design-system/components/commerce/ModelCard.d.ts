import * as React from "react";

export interface ModelCardProps {
  name: string;
  image?: string;
  /** Plan gate label, e.g. "Free", "Clube", "Maker". */
  tier?: string;
  /** "Fácil" | "Médio" | "Avançado" — free text, rendered in mono. */
  difficulty?: string;
  /** File formats included, e.g. ["STL","3MF"]. */
  formats?: string[];
  downloads?: number;
  /** Dims the render and shows a lock for out-of-plan models. */
  locked?: boolean;
  onOpen?: () => void;
  className?: string;
}

export declare function ModelCard(props: ModelCardProps): JSX.Element;

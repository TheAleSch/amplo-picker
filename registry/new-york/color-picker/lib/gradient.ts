import type { OklchColor } from "./types";

export type GradientType = "linear" | "radial" | "conic";

export type GradientInterp =
  | "oklch"
  | "oklab"
  | "srgb"
  | "hsl"
  | "hsl-longer";

export interface GradientStop {
  color: OklchColor;
  /** 0..1 along the gradient axis. */
  position: number;
  /** Optional CSS midpoint hint, 0..1. */
  hint?: number;
}

export interface LinearGradient {
  type: "linear";
  /** Degrees, 0..360. */
  angle: number;
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface RadialGradient {
  type: "radial";
  shape: "circle" | "ellipse";
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  size: "closest-side" | "farthest-corner";
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface ConicGradient {
  type: "conic";
  /** Degrees. */
  startAngle: number;
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  stops: GradientStop[];
  interp: GradientInterp;
}

export type Gradient = LinearGradient | RadialGradient | ConicGradient;

export type ColorFill = { kind: "color"; color: OklchColor };
export type GradientFill = { kind: "gradient"; gradient: Gradient };
export type Fill = ColorFill | GradientFill;

export const DEFAULT_LINEAR: LinearGradient = {
  type: "linear",
  angle: 90,
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

export const DEFAULT_RADIAL: RadialGradient = {
  type: "radial",
  shape: "circle",
  center: { x: 0.5, y: 0.5 },
  size: "farthest-corner",
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

export const DEFAULT_CONIC: ConicGradient = {
  type: "conic",
  startAngle: 0,
  center: { x: 0.5, y: 0.5 },
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

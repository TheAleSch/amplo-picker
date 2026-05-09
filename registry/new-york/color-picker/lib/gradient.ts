import type { OklchColor } from "./types";
import { formatColor } from "./color";

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

function trim(n: number, digits = 4): string {
  return Number(n.toFixed(digits)).toString();
}

const formatStopColor = (c: OklchColor): string => formatColor(c, "oklch");

function formatStops(stops: GradientStop[]): string {
  const parts: string[] = [];
  stops.forEach((s, i) => {
    // A hint on stop i is the midpoint *between* stop i-1 and stop i —
    // emit it before this stop's color declaration.
    if (s.hint !== undefined && i > 0) {
      parts.push(`${trim(s.hint * 100)}%`);
    }
    parts.push(`${formatStopColor(s.color)} ${trim(s.position * 100)}%`);
  });
  return parts.join(", ");
}

function formatInterp(interp: GradientInterp): string {
  if (interp === "hsl-longer") return "hsl longer hue";
  return interp;
}

export function formatGradient(g: Gradient): string {
  const interp = `in ${formatInterp(g.interp)}`;
  if (g.type === "linear") {
    return `linear-gradient(${interp} ${trim(g.angle)}deg, ${formatStops(g.stops)})`;
  }
  if (g.type === "radial") {
    const shape = `${g.shape} ${g.size}`;
    const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
    return `radial-gradient(${shape} ${center} ${interp}, ${formatStops(g.stops)})`;
  }
  // conic
  const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
  return `conic-gradient(from ${trim(g.startAngle)}deg ${center} ${interp}, ${formatStops(g.stops)})`;
}

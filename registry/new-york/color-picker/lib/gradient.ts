import type { OklchColor } from "./types";
import { formatColor, parseColor } from "./color";

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

// ---------------------------------------------------------------------------
// parseGradient — inverse of formatGradient
// ---------------------------------------------------------------------------

const FN_RE = /^(linear|radial|conic)-gradient\((.*)\)$/is;

/** Split on commas that are not nested inside parentheses. */
function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Extract `in <space>[ longer hue]` from anywhere within a string.
 * Returns the parsed interp and the string with the `in …` clause removed.
 */
function extractInterp(s: string): { interp: GradientInterp; rest: string } {
  const m = s.match(/\bin\s+(hsl)\s+longer\s+hue\b/i);
  if (m) {
    return { interp: "hsl-longer", rest: s.replace(m[0], "").trim() };
  }
  const m2 = s.match(/\bin\s+([a-z0-9-]+)\b/i);
  if (!m2) return { interp: "oklch", rest: s };
  const space = m2[1].toLowerCase();
  let interp: GradientInterp = "oklch";
  if (space === "oklch") interp = "oklch";
  else if (space === "oklab") interp = "oklab";
  else if (space === "srgb") interp = "srgb";
  else if (space === "hsl") interp = "hsl";
  return { interp, rest: s.replace(m2[0], "").trim() };
}

function parseStops(parts: string[]): GradientStop[] | null {
  const stops: GradientStop[] = [];
  for (const p of parts) {
    // Bare percentage hint: `30%`
    const hintMatch = p.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (hintMatch) {
      if (stops.length === 0) return null; // hint can't lead
      stops[stops.length - 1].hint = parseFloat(hintMatch[1]) / 100;
      continue;
    }
    // Color + optional position: `oklch(…) 50%` or just `oklch(…)`
    const m = p.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%$/);
    let colorStr = p;
    let position: number | null = null;
    if (m) {
      colorStr = m[1].trim();
      position = parseFloat(m[2]) / 100;
    }
    const color = parseColor(colorStr);
    if (!color) return null;
    stops.push({
      color,
      position: position ?? (stops.length === 0 ? 0 : 1),
    });
  }
  return stops.length >= 1 ? stops : null;
}

export function parseGradient(input: string): Gradient | null {
  const trimmed = input.trim();
  const m = trimmed.match(FN_RE);
  if (!m) return null;

  const type = m[1].toLowerCase() as GradientType;
  const parts = splitTopLevel(m[2]);
  if (parts.length === 0) return null;

  if (type === "linear") {
    // parts[0] for formatGradient output: "in oklch 90deg"
    // For a hand-written gradient without interp: "90deg" or absent (just stops)
    const { interp, rest } = extractInterp(parts[0]);
    let angle = 180; // CSS default
    let stopParts = parts.slice(1);

    const angleMatch = rest.match(/^(-?\d+(?:\.\d+)?)deg$/i);
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
    } else if (rest.length > 0) {
      // rest wasn't an angle — treat it as the first stop
      stopParts = [rest, ...stopParts];
    }

    const stops = parseStops(stopParts);
    if (!stops) return null;
    return { type: "linear", angle, interp, stops };
  }

  if (type === "radial") {
    // formatGradient output parts[0]: "circle farthest-corner at 50% 50% in oklch"
    const { interp, rest } = extractInterp(parts[0]);
    const head = rest;
    const stopParts = parts.slice(1);

    let shape: "circle" | "ellipse" = "ellipse";
    let size: "closest-side" | "farthest-corner" = "farthest-corner";
    let cx = 0.5;
    let cy = 0.5;

    if (/\bcircle\b/i.test(head)) shape = "circle";
    else if (/\bellipse\b/i.test(head)) shape = "ellipse";
    if (/\bclosest-side\b/i.test(head)) size = "closest-side";
    else if (/\bfarthest-corner\b/i.test(head)) size = "farthest-corner";

    const atMatch = head.match(/\bat\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
    if (atMatch) {
      cx = parseFloat(atMatch[1]) / 100;
      cy = parseFloat(atMatch[2]) / 100;
    }

    const stops = parseStops(stopParts);
    if (!stops) return null;
    return { type: "radial", shape, size, center: { x: cx, y: cy }, interp, stops };
  }

  // conic
  // formatGradient output parts[0]: "from 0deg at 50% 50% in oklch"
  const { interp, rest } = extractInterp(parts[0]);
  const head = rest;
  const stopParts = parts.slice(1);

  let startAngle = 0;
  let cx = 0.5;
  let cy = 0.5;

  const fromMatch = head.match(/\bfrom\s+(-?\d+(?:\.\d+)?)deg\b/i);
  if (fromMatch) startAngle = parseFloat(fromMatch[1]);

  const atMatch = head.match(/\bat\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
  if (atMatch) {
    cx = parseFloat(atMatch[1]) / 100;
    cy = parseFloat(atMatch[2]) / 100;
  }

  const stops = parseStops(stopParts);
  if (!stops) return null;
  return { type: "conic", startAngle, center: { x: cx, y: cy }, interp, stops };
}

// ---------------------------------------------------------------------------
// parseFill / formatFill — discriminated union of Color | Gradient
// ---------------------------------------------------------------------------

export function formatFill(f: Fill): string {
  if (f.kind === "color") return formatColor(f.color, "oklch");
  return formatGradient(f.gradient);
}

export function parseFill(input: string): Fill | null {
  const g = parseGradient(input);
  if (g) return { kind: "gradient", gradient: g };
  const c = parseColor(input);
  if (c) return { kind: "color", color: c };
  return null;
}

// ---------------------------------------------------------------------------
// sampleStopsAt — interpolate a stop color at an arbitrary 0..1 position
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Shortest-path hue lerp on a 0..360 circle. Matches what users perceive in
// an OKLCH-rendered gradient between two adjacent stops.
function lerpHue(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  else if (d < -180) d += 360;
  return ((a + d * t) % 360 + 360) % 360;
}

/**
 * Returns the OKLCH color at `position` (0..1) along a sorted-by-position
 * stop list. Used by Bar so click-to-add picks the color the user sees.
 * Interpolation is done in OKLCH regardless of the gradient's `interp`
 * setting — the stops themselves are canonical OKLCH and that gives a
 * perceptually sensible pick even when the visual paint uses sRGB/HSL.
 */
export function sampleStopsAt(
  stops: GradientStop[],
  position: number,
): OklchColor {
  if (stops.length === 0) return { l: 0.5, c: 0, h: 0, alpha: 1 };
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  if (position <= sorted[0].position) return { ...sorted[0].color };
  const last = sorted[sorted.length - 1];
  if (position >= last.position) return { ...last.color };
  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].position < position) i++;
  const a = sorted[i];
  const b = sorted[i + 1];
  const span = b.position - a.position;
  const t = span === 0 ? 0 : (position - a.position) / span;
  return {
    l: lerp(a.color.l, b.color.l, t),
    c: lerp(a.color.c, b.color.c, t),
    h: lerpHue(a.color.h, b.color.h, t),
    alpha: lerp(a.color.alpha, b.color.alpha, t),
  };
}

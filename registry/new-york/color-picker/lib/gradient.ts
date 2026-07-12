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
  /**
   * Degrees, 0..360. CSS gradient angle convention: 0deg = up, increases
   * clockwise. Always present. When `start` and `end` are set, this field
   * is kept in sync with `atan2(end - start)` so consumers reading `angle`
   * alone still get a meaningful value.
   */
  angle: number;
  /**
   * When true, `formatGradient` emits `repeating-linear-gradient(...)`. The
   * stop ramp repeats every (last - first) position span — typically used
   * for stripes / barberpole patterns. Optional: undefined = false.
   */
  repeating?: boolean;
  /**
   * Optional start endpoint of the gradient line, normalized 0..1 of the
   * gradient box in each axis. When both `start` and `end` are set, the
   * gradient is treated as "positioned" — the line is the segment between
   * them, and `formatGradient` emits CSS with stop positions adjusted so
   * the visual transition happens between these two points (the CSS
   * gradient line itself still passes through the box center because
   * `linear-gradient` has no way to express an offset line, but the
   * adjusted stop positions preserve the visual offset).
   *
   * When unset, the gradient behaves the legacy way: line passes through
   * the box center, direction determined by `angle` only.
   */
  start?: { x: number; y: number };
  /** Optional end endpoint. See `start`. */
  end?: { x: number; y: number };
  stops: GradientStop[];
  interp: GradientInterp;
}

/**
 * CSS radial-gradient extent keywords — the four values the spec allows in
 * the `<size>` slot. They describe how far the gradient ellipse reaches
 * from its center, measured to either a side or a corner of the gradient
 * box. Spec: https://www.w3.org/TR/css-images-3/#valdef-radial-gradient-extent-keyword
 */
export type RadialSizeKeyword =
  | "closest-side"
  | "closest-corner"
  | "farthest-side"
  | "farthest-corner";

export interface RadialGradient {
  type: "radial";
  shape: "circle" | "ellipse";
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  size: RadialSizeKeyword;
  /**
   * Optional explicit radii. When set, takes precedence over `shape`+`size`
   * for CSS emission. `x` is a fraction of the gradient box width, `y` a
   * fraction of its height — matching the CSS `<length-percentage>{1,2}`
   * radial-gradient ending-shape syntax. When unset, the keyword form
   * (`shape size`) is emitted instead.
   *
   * Use this for **ellipse** shapes — pairs of percentages stay
   * container-relative on the consumer side.
   */
  radii?: { x: number; y: number };
  /**
   * Optional explicit circle radius in absolute pixels. Only meaningful
   * when `shape === "circle"`. When set, takes the highest precedence at
   * emit time and produces a `radial-gradient(<px>px at ...)` form — which
   * is the **only** way to get a CSS radial gradient that stays visually
   * circular regardless of the consumer container's aspect ratio. The
   * `<length-percentage>{2}` form always implies ellipse (CSS spec), so
   * even rx === ry-by-pixel from the picker box draws an ellipse when
   * pasted into a differently-shaped container.
   */
  radiusPx?: number;
  stops: GradientStop[];
  interp: GradientInterp;
  /** See `LinearGradient.repeating`. Emits `repeating-radial-gradient(...)`. */
  repeating?: boolean;
}

export interface ConicGradient {
  type: "conic";
  /** Degrees. */
  startAngle: number;
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  stops: GradientStop[];
  interp: GradientInterp;
  /** See `LinearGradient.repeating`. Emits `repeating-conic-gradient(...)`. */
  repeating?: boolean;
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

/**
 * Derive a CSS gradient angle (0deg = up, increases clockwise) from two
 * box-normalized points. Returns undefined when the two points coincide.
 */
function angleFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): number | undefined {
  const dx = end.x - start.x;
  // Box y axis points down in screen coords, but CSS gradient angle is
  // measured with 0deg = up. Flip dy so the formula matches the visual.
  const dy = -(end.y - start.y);
  if (dx === 0 && dy === 0) return undefined;
  // atan2(x, y) with CSS convention: angle = arctan2(dx, dy) gives 0 = up,
  // increases clockwise. Same convention used by AnglePad and Area.
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/**
 * Project a linear gradient's `start` and `end` endpoints onto the CSS
 * gradient line (the centered line implied by the derived angle). Returns
 * `null` when the segment has zero length and no projection is meaningful.
 *
 * The CSS gradient line length depends on the actual box dimensions; this
 * projection assumes a square unit box, so the magnitudes of the returned
 * `startProj` / `endProj` are an approximation in stretched containers.
 * The direction is always correct.
 */
export function gradientLineProjection(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { startProj: number; endProj: number } | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const cssLen = Math.abs(ux) + Math.abs(uy);
  const project = (p: { x: number; y: number }) =>
    0.5 + ((p.x - 0.5) * ux + (p.y - 0.5) * uy) / cssLen;
  return { startProj: project(start), endProj: project(end) };
}

/**
 * Map an authored stop position (0..1 along the [start, end] segment) into
 * its visible position along the CSS gradient line. Identity when the
 * segment has zero length or either endpoint is missing.
 */
export function projectStopPosition(
  authoredPos: number,
  start: { x: number; y: number } | undefined,
  end: { x: number; y: number } | undefined,
): number {
  if (!start || !end) return authoredPos;
  const proj = gradientLineProjection(start, end);
  if (!proj) return authoredPos;
  return proj.startProj + (proj.endProj - proj.startProj) * authoredPos;
}

/**
 * Inverse of `projectStopPosition`: take a position along the CSS gradient
 * line and return the corresponding authored position. Useful for
 * converting a pointer position on the Bar back into the value that should
 * be written to `stop.position`. Returns the input unchanged when there's
 * no segment to project onto.
 */
export function reverseProjectStopPosition(
  displayedPos: number,
  start: { x: number; y: number } | undefined,
  end: { x: number; y: number } | undefined,
): number {
  if (!start || !end) return displayedPos;
  const proj = gradientLineProjection(start, end);
  if (!proj) return displayedPos;
  const span = proj.endProj - proj.startProj;
  if (span === 0) return 0;
  return (displayedPos - proj.startProj) / span;
}

/**
 * Re-map a list of stop positions so that the gradient transition happens
 * between `start` and `end` along the centered CSS gradient line. Used by
 * `formatGradient` for the positioned linear case, and by the Bar /
 * StopList parts to mirror that projection in their UI.
 */
export function adjustStopsForEndpoints(
  stops: GradientStop[],
  start: { x: number; y: number },
  end: { x: number; y: number },
): GradientStop[] {
  const proj = gradientLineProjection(start, end);
  if (!proj) return stops;
  const { startProj, endProj } = proj;
  return stops.map((s) => ({
    ...s,
    position: startProj + (endProj - startProj) * s.position,
    hint:
      s.hint === undefined
        ? undefined
        : startProj + (endProj - startProj) * s.hint,
  }));
}

export function formatGradient(g: Gradient): string {
  const interp = `in ${formatInterp(g.interp)}`;
  const prefix = g.repeating ? "repeating-" : "";
  if (g.type === "linear") {
    if (g.start && g.end) {
      const derivedAngle = angleFromPoints(g.start, g.end);
      // If start and end coincide (zero-length line), there's no meaningful
      // direction — fall through to the plain angle form.
      if (derivedAngle !== undefined) {
        const adjusted = adjustStopsForEndpoints(g.stops, g.start, g.end);
        return `${prefix}linear-gradient(${interp} ${trim(derivedAngle)}deg, ${formatStops(adjusted)})`;
      }
    }
    return `${prefix}linear-gradient(${interp} ${trim(g.angle)}deg, ${formatStops(g.stops)})`;
  }
  if (g.type === "radial") {
    const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
    // Precedence at emit time:
    //   1. shape=circle + radiusPx → `<px>px` (single length forces circle,
    //      stays a true circle in any consumer container)
    //   2. radii → `<rx>% <ry>%` (always renders as an ellipse, scales with
    //      container width / height respectively)
    //   3. keyword form → `shape size` (CSS default, computed live by the
    //      renderer relative to the container + center)
    let endingShape: string;
    if (g.shape === "circle" && g.radiusPx !== undefined) {
      endingShape = `${trim(g.radiusPx)}px`;
    } else if (g.shape === "ellipse" && g.radii) {
      // The `% %` pair always implies ellipse in CSS, so it must never be
      // emitted for shape: "circle" — stale radii from an earlier ellipse
      // edit would silently flip the rendered shape.
      endingShape = `${trim(g.radii.x * 100)}% ${trim(g.radii.y * 100)}%`;
    } else {
      endingShape = `${g.shape} ${g.size}`;
    }
    return `${prefix}radial-gradient(${endingShape} ${center} ${interp}, ${formatStops(g.stops)})`;
  }
  // conic
  const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
  return `${prefix}conic-gradient(from ${trim(g.startAngle)}deg ${center} ${interp}, ${formatStops(g.stops)})`;
}

// ---------------------------------------------------------------------------
// parseGradient — inverse of formatGradient
// ---------------------------------------------------------------------------

const FN_RE = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/is;

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
  const raw: Array<{
    color: OklchColor;
    position: number | null;
    hint?: number;
  }> = [];
  // A hint belongs to the stop that FOLLOWS it (formatStops emits stop i's
  // hint between stop i-1 and stop i), so stash it until the next color stop.
  let pendingHint: number | undefined;
  for (const p of parts) {
    // Bare percentage hint: `30%`
    const hintMatch = p.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (hintMatch) {
      if (raw.length === 0) return null; // hint can't lead
      if (pendingHint !== undefined) return null; // two hints in a row
      pendingHint = parseFloat(hintMatch[1]) / 100;
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
    raw.push({
      color,
      position,
      ...(pendingHint !== undefined ? { hint: pendingHint } : {}),
    });
    pendingHint = undefined;
  }
  if (pendingHint !== undefined) return null; // hint can't trail
  if (raw.length === 0) return null;

  // CSS Images 3 §3.4.3 position fixup:
  //  1. First/last stops without a position default to 0% / 100%.
  //  2. Explicit positions may never decrease — clamp to the running max.
  //  3. Runs of unpositioned stops are spaced evenly between their
  //     positioned neighbors.
  if (raw[0].position === null) raw[0].position = 0;
  if (raw[raw.length - 1].position === null) raw[raw.length - 1].position = 1;
  let runningMax = raw[0].position as number;
  for (const s of raw) {
    if (s.position !== null) {
      s.position = Math.max(s.position, runningMax);
      runningMax = s.position;
    }
  }
  let i = 0;
  while (i < raw.length) {
    if (raw[i].position !== null) {
      i++;
      continue;
    }
    let j = i;
    while (raw[j].position === null) j++;
    const prev = raw[i - 1].position as number;
    const next = raw[j].position as number;
    const count = j - i + 1; // gaps between prev and next
    for (let k = i; k < j; k++) {
      raw[k].position = prev + ((next - prev) * (k - i + 1)) / count;
    }
    i = j;
  }
  return raw.map((s) => ({
    color: s.color,
    position: s.position as number,
    ...(s.hint !== undefined ? { hint: s.hint } : {}),
  }));
}

/**
 * Map a CSS `to <side-or-corner>` linear direction to a gradient angle.
 * Corners use the square-box angles (45/135/225/315) — the picker's model
 * only stores an angle, so the CSS "magic corner" aspect-dependence is
 * intentionally approximated. Returns null for invalid pairs
 * (`to left right`).
 */
function sideOrCornerAngle(
  a: string,
  b: string | undefined,
): number | null {
  const set = new Set([a.toLowerCase(), ...(b ? [b.toLowerCase()] : [])]);
  if (b && set.size !== 2) return null;
  const has = (s: string) => set.has(s);
  if ((has("top") && has("bottom")) || (has("left") && has("right"))) {
    return null;
  }
  if (set.size === 1) {
    if (has("top")) return 0;
    if (has("right")) return 90;
    if (has("bottom")) return 180;
    return 270; // left
  }
  if (has("top") && has("right")) return 45;
  if (has("bottom") && has("right")) return 135;
  if (has("bottom") && has("left")) return 225;
  return 315; // top left
}

export function parseGradient(input: string): Gradient | null {
  const trimmed = input.trim();
  const m = trimmed.match(FN_RE);
  if (!m) return null;

  const repeating = !!m[1];
  const type = m[2].toLowerCase() as GradientType;
  const parts = splitTopLevel(m[3]);
  if (parts.length === 0) return null;

  if (type === "linear") {
    // parts[0] for formatGradient output: "in oklch 90deg"
    // For a hand-written gradient without interp: "90deg" or absent (just stops)
    const { interp, rest } = extractInterp(parts[0]);
    let angle = 180; // CSS default
    let stopParts = parts.slice(1);

    const angleMatch = rest.match(/^(-?\d+(?:\.\d+)?)deg$/i);
    const toMatch = rest.match(
      /^to\s+(top|bottom|left|right)(?:\s+(top|bottom|left|right))?$/i,
    );
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
    } else if (toMatch) {
      const dir = sideOrCornerAngle(toMatch[1], toMatch[2]);
      if (dir === null) return null; // e.g. "to left right"
      angle = dir;
    } else if (rest.length > 0) {
      // rest wasn't a direction — treat it as the first stop
      stopParts = [rest, ...stopParts];
    }

    const stops = parseStops(stopParts);
    if (!stops) return null;
    return {
      type: "linear",
      angle,
      interp,
      stops,
      ...(repeating ? { repeating: true } : {}),
    };
  }

  if (type === "radial") {
    // formatGradient output parts[0]: "circle farthest-corner at 50% 50% in oklch"
    //                            or:  "48% 30% at 50% 50% in oklch"
    const { interp, rest } = extractInterp(parts[0]);
    const head = rest;
    const stopParts = parts.slice(1);

    let shape: "circle" | "ellipse" = "ellipse";
    let size: RadialSizeKeyword = "farthest-corner";
    let cx = 0.5;
    let cy = 0.5;
    let radii: { x: number; y: number } | undefined;
    let radiusPx: number | undefined;

    if (/\bcircle\b/i.test(head)) shape = "circle";
    else if (/\bellipse\b/i.test(head)) shape = "ellipse";
    // Order matters: `closest-corner` and `farthest-side` must be checked
    // before the shorter `closest-side` and `farthest-corner` to avoid the
    // longer keyword being partially matched. Using anchored \b regexes
    // sidesteps that issue regardless of order.
    if (/\bclosest-corner\b/i.test(head)) size = "closest-corner";
    else if (/\bclosest-side\b/i.test(head)) size = "closest-side";
    else if (/\bfarthest-side\b/i.test(head)) size = "farthest-side";
    else if (/\bfarthest-corner\b/i.test(head)) size = "farthest-corner";

    const beforeAt = head.split(/\bat\b/i)[0] ?? head;

    // Single `<px>` length form (e.g. "268px") — CSS spec requires this
    // to be a circle, so set shape too. Check before the `%% %%` pair so a
    // mixed `circle 100px` doesn't accidentally try to parse a pair.
    const singleLenMatch = beforeAt.match(/(-?\d+(?:\.\d+)?)px(?!\s*-?\d+(?:\.\d+)?\s*(?:px|%))/);
    if (singleLenMatch) {
      radiusPx = parseFloat(singleLenMatch[1]);
      shape = "circle";
    }

    // Explicit two-value ending shape (e.g. "48% 30%") — appears before `at`.
    // We deliberately only match the percentage form formatGradient emits;
    // raw lengths (`100px 80px`) are intentionally ignored here so they fall
    // through to the keyword defaults instead of being silently rescaled.
    if (!radiusPx) {
      const radiiMatch = beforeAt.match(
        /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/,
      );
      if (radiiMatch) {
        radii = {
          x: parseFloat(radiiMatch[1]) / 100,
          y: parseFloat(radiiMatch[2]) / 100,
        };
      }
    }

    const atMatch = head.match(/\bat\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
    if (atMatch) {
      cx = parseFloat(atMatch[1]) / 100;
      cy = parseFloat(atMatch[2]) / 100;
    }

    const stops = parseStops(stopParts);
    if (!stops) return null;
    return {
      type: "radial",
      shape,
      size,
      center: { x: cx, y: cy },
      ...(radii ? { radii } : {}),
      ...(radiusPx !== undefined ? { radiusPx } : {}),
      interp,
      stops,
      ...(repeating ? { repeating: true } : {}),
    };
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
  return {
    type: "conic",
    startAngle,
    center: { x: cx, y: cy },
    interp,
    stops,
    ...(repeating ? { repeating: true } : {}),
  };
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
  let t = span === 0 ? 0 : (position - a.position) / span;
  // CSS midpoint hint: the hint (stored on the following stop, in absolute
  // axis coordinates like `position`) marks where the blend reaches 50%.
  // Browsers warp progress with t^(log(.5)/log(h)) so t = h lands at 0.5 —
  // apply the same curve so click-to-add picks the color the user sees.
  if (b.hint !== undefined && span > 0) {
    const h = (b.hint - a.position) / span;
    if (h > 0 && h < 1) {
      t = Math.pow(t, Math.log(0.5) / Math.log(h));
    }
  }
  return {
    l: lerp(a.color.l, b.color.l, t),
    c: lerp(a.color.c, b.color.c, t),
    h: lerpHue(a.color.h, b.color.h, t),
    alpha: lerp(a.color.alpha, b.color.alpha, t),
  };
}

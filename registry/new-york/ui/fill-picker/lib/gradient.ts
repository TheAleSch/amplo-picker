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
  /**
   * Optional stable identity, honored in **controlled** mode only.
   *
   * Without it the picker reconciles an incoming `value` against its own
   * state by position and array index, which cannot tell two stops sharing a
   * position apart — reorder them externally and the colors swap between the
   * existing internal ids while the selection and per-stop format stay put.
   *
   * Supply an id per stop and reconciliation matches on identity instead, so
   * selection, per-stop color format, and colors all follow the right stop
   * through any reorder. Ids must be unique within the gradient; duplicates
   * are ignored and fall back to a generated id.
   *
   * Purely opt-in. Omit it and nothing changes — the picker reconciles by
   * position exactly as before and never adds an `id` to what it emits.
   *
   * Once you do supply ids, they round-trip: `onValueChange` echoes them back
   * (including on stops added inside the picker), so the ordinary
   * `onValueChange={g => setG(g)}` pattern keeps identity instead of losing
   * the tags on the first update.
   */
  id?: string;
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
 * box-normalized points. Returns undefined when either point is missing or
 * the two coincide.
 */
export function angleFromPoints(
  start: { x: number; y: number } | undefined,
  end: { x: number; y: number } | undefined,
): number | undefined {
  if (!start || !end) return undefined;
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
  // `in <space> [<hue-method> hue]` — only `hsl longer hue` has a model
  // value; other hue methods are accepted and dropped rather than left
  // in `rest` to poison the header parse.
  const m = s.match(
    /\bin\s+([a-z0-9-]+)(?:\s+(shorter|longer|increasing|decreasing)\s+hue)?\b/i,
  );
  if (!m) return { interp: "oklch", rest: s };
  const space = m[1].toLowerCase();
  const longer = m[2]?.toLowerCase() === "longer";
  let interp: GradientInterp = "oklch";
  if (space === "hsl") interp = longer ? "hsl-longer" : "hsl";
  else if (space === "oklab") interp = "oklab";
  else if (space === "srgb") interp = "srgb";
  return { interp, rest: s.replace(m[0], "").trim() };
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
    // Color + up to two positions: `oklch(…)`, `oklch(…) 50%`, or the
    // hard-stop shorthand `red 0% 50%`, which is two stops of one color.
    const two = p.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
    const one = two ? null : p.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%$/);
    const colorStr = (two ?? one)?.[1].trim() ?? p;
    const positions: Array<number | null> = two
      ? [parseFloat(two[2]) / 100, parseFloat(two[3]) / 100]
      : [one ? parseFloat(one[2]) / 100 : null];
    const color = parseColor(colorStr);
    if (!color) return null;
    positions.forEach((position, k) => {
      raw.push({
        color: k === 0 ? color : { ...color },
        position,
        ...(k === 0 && pendingHint !== undefined ? { hint: pendingHint } : {}),
      });
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

const NUM_RE_SRC = String.raw`-?\d+(?:\.\d+)?`;
const PCT_RE = new RegExp(`^(${NUM_RE_SRC})%$`);
const PX_RE = new RegExp(`^(${NUM_RE_SRC})px$`, "i");
const ANGLE_RE = new RegExp(`^(${NUM_RE_SRC})(deg|turn|rad|grad)?$`, "i");
const RADIAL_SIZES: readonly string[] = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
] satisfies RadialSizeKeyword[];

const wrapDeg = (d: number) => ((d % 360) + 360) % 360;

/** CSS `<angle>` → degrees in [0, 360). Unitless is accepted only for `0`. */
function parseAngle(s: string): number | null {
  const m = s.trim().match(ANGLE_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  switch (m[2]?.toLowerCase()) {
    case "deg":
      return wrapDeg(n);
    case "turn":
      return wrapDeg(n * 360);
    case "rad":
      return wrapDeg((n * 180) / Math.PI);
    case "grad":
      return wrapDeg(n * 0.9);
    default:
      return n === 0 ? 0 : null;
  }
}

/**
 * CSS `<position>` (one or two tokens: percentages and side keywords) →
 * 0..1 fractions. Pixel offsets aren't representable in the model → null.
 */
function parsePosition(s: string): { x: number; y: number } | null {
  const toks = s.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const X: Record<string, number> = { left: 0, center: 0.5, right: 1 };
  const Y: Record<string, number> = { top: 0, center: 0.5, bottom: 1 };
  const pct = (t: string) => {
    const m = t.match(PCT_RE);
    return m ? parseFloat(m[1]) / 100 : undefined;
  };
  if (toks.length === 1) {
    const [t] = toks;
    const p = pct(t);
    if (p !== undefined) return { x: p, y: 0.5 };
    if (t in X) return { x: X[t], y: 0.5 };
    if (t in Y) return { x: 0.5, y: Y[t] };
    return null;
  }
  if (toks.length !== 2) return null;
  let [a, b] = toks;
  // Keyword pairs may come vertical-first (`top right`).
  if ((a in Y && !(a in X)) || (b in X && !(b in Y))) [a, b] = [b, a];
  const x = pct(a) ?? X[a];
  const y = pct(b) ?? Y[b];
  return x === undefined || y === undefined ? null : { x, y };
}

interface RadialHeader {
  shape: "circle" | "ellipse";
  size: RadialSizeKeyword;
  center: { x: number; y: number };
  radii?: { x: number; y: number };
  radiusPx?: number;
}

/**
 * Parse a radial header (`circle farthest-corner at 50% 50%`, `48% 30%`,
 * `268px at top`, …). Returns null on any unrecognized token so invalid
 * input is rejected instead of silently becoming the default gradient.
 */
function parseRadialHeader(head: string): RadialHeader | null {
  const [beforeAt, afterAt, ...extra] = head.split(/\bat\b/i);
  if (extra.length > 0) return null;
  let center = { x: 0.5, y: 0.5 };
  if (afterAt !== undefined) {
    const pos = parsePosition(afterAt);
    if (!pos) return null;
    center = pos;
  }
  let shape: "circle" | "ellipse" | undefined;
  let size: RadialSizeKeyword | undefined;
  const lengths: string[] = [];
  for (const tok of beforeAt.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
    if (tok === "circle" || tok === "ellipse") {
      if (shape) return null;
      shape = tok;
    } else if (RADIAL_SIZES.includes(tok)) {
      if (size) return null;
      size = tok as RadialSizeKeyword;
    } else if (PX_RE.test(tok) || PCT_RE.test(tok)) {
      lengths.push(tok);
    } else {
      return null;
    }
  }
  if (lengths.length > 2) return null;
  const header: RadialHeader = {
    shape: shape ?? "ellipse",
    size: size ?? "farthest-corner",
    center,
  };
  if (lengths.length === 1) {
    // A single `<length>` is only valid as a circle radius; a lone
    // percentage isn't valid CSS.
    const px = lengths[0].match(PX_RE);
    if (!px) return null;
    header.radiusPx = parseFloat(px[1]);
    header.shape = "circle";
  } else if (lengths.length === 2) {
    // Only the percentage pair formatGradient emits maps onto the model;
    // raw lengths (`100px 80px`) fall through to the keyword defaults
    // rather than being silently rescaled.
    const [rx, ry] = lengths.map((t) => t.match(PCT_RE));
    if (rx && ry) {
      header.radii = { x: parseFloat(rx[1]) / 100, y: parseFloat(ry[1]) / 100 };
    }
  }
  return header;
}

interface ConicHeader {
  startAngle: number;
  center: { x: number; y: number };
}

/** Parse a conic header (`from 90deg at 50% 50%`). Null on junk. */
function parseConicHeader(head: string): ConicHeader | null {
  const [beforeAt, afterAt, ...extra] = head.split(/\bat\b/i);
  if (extra.length > 0) return null;
  let center = { x: 0.5, y: 0.5 };
  if (afterAt !== undefined) {
    const pos = parsePosition(afterAt);
    if (!pos) return null;
    center = pos;
  }
  let startAngle = 0;
  const from = beforeAt.trim();
  if (from) {
    const m = from.match(/^from\s+(\S+)$/i);
    const angle = m ? parseAngle(m[1]) : null;
    if (angle === null) return null;
    startAngle = angle;
  }
  return { startAngle, center };
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

    const parsedAngle = parseAngle(rest);
    const toMatch = rest.match(
      /^to\s+(top|bottom|left|right)(?:\s+(top|bottom|left|right))?$/i,
    );
    if (parsedAngle !== null) {
      angle = parsedAngle;
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

  // radial / conic: a header-less gradient (`radial-gradient(red, blue)`)
  // starts straight with its stops, so when parts[0] isn't a valid header
  // and carried no `in <space>` clause, re-read it as the first stop.
  const { interp, rest } = extractInterp(parts[0]);
  const hadInterp = rest !== parts[0];
  const header =
    type === "radial" ? parseRadialHeader(rest) : parseConicHeader(rest);
  if (!header && hadInterp) return null;
  const stops = parseStops(header ? parts.slice(1) : parts);
  if (!stops) return null;

  if (type === "radial") {
    const h = (header as RadialHeader | null) ?? {
      shape: "ellipse",
      size: "farthest-corner",
      center: { x: 0.5, y: 0.5 },
    };
    return {
      type: "radial",
      shape: h.shape,
      size: h.size,
      center: h.center,
      ...(h.radii ? { radii: h.radii } : {}),
      ...(h.radiusPx !== undefined ? { radiusPx: h.radiusPx } : {}),
      interp,
      stops,
      ...(repeating ? { repeating: true } : {}),
    };
  }

  const h = (header as ConicHeader | null) ?? {
    startAngle: 0,
    center: { x: 0.5, y: 0.5 },
  };
  return {
    type: "conic",
    startAngle: h.startAngle,
    center: h.center,
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
const ACHROMATIC_C = 1e-4;

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
  // An achromatic stop's hue is powerless; CSS Color 4 treats it as missing
  // and borrows the other endpoint's hue instead of sweeping through 0°.
  const ha = a.color.c <= ACHROMATIC_C ? b.color.h : a.color.h;
  const hb = b.color.c <= ACHROMATIC_C ? a.color.h : b.color.h;
  return {
    l: lerp(a.color.l, b.color.l, t),
    c: lerp(a.color.c, b.color.c, t),
    h: lerpHue(ha, hb, t),
    alpha: lerp(a.color.alpha, b.color.alpha, t),
  };
}

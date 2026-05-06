"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import {
  findCusp,
  findMaxChroma,
  formatColor,
  gamutFromFormat as libGamutFromFormat,
  gamutSignedDistance,
  linSrgbToLinP3,
  oklchToLinearSrgb,
  toGamut,
} from "../lib/color";
import type { Gamut, OklchColor } from "../lib/types";
import { cn } from "@/lib/utils";

export type AreaMode = "oklch-cl" | "hsv-sv" | "oklch-hc";
export type AreaGamut = Gamut | "none";

export interface AreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * What the 2D Area represents.
   *  - oklch-cl: Y = OKLCH lightness, X = chroma normalized to gamut. Perceptually uniform.
   *    Top row is white-ish (max chroma at L=1 is 0). Most-saturated colors live at mid-Y.
   *  - hsv-sv: Y = HSV-style "value", X = saturation. OKHSV-like — anchored to the gamut
   *    cusp so top-right corner is fully saturated (Photoshop/Framer feel).
   *  - oklch-hc: X = hue, Y = chroma normalized (lightness picked separately).
   */
  mode?: AreaMode;
  /**
   * Ignored when `gamut` is "srgb" / "p3" / "rec2020" — chroma fills the
   * square up to the gamut surface. Only meaningful when `gamut === "none"`,
   * where it bounds the absolute-chroma X axis.
   */
  chromaMax?: number;
  /**
   * Render gamut. The square is filled with in-gamut colors up to this
   * gamut's surface, and warning lines mark narrower-gamut cutoffs inside.
   * Defaults to the gamut implied by the active output format
   * (hex/rgb/hsl/hsb → srgb, p3 → p3, oklch/oklab → rec2020).
   * Pass "none" to disable warping and paint the raw OKLCH plane up to
   * `chromaMax` (no fill warp, no lines).
   */
  gamut?: AreaGamut;
  /**
   * Show the gamut-cutoff warning lines drawn inside the active render gamut.
   * Defaults to true. Setting to false hides them regardless of `gamut` —
   * useful for a quieter visual when the badge already conveys gamut status.
   * No effect when `gamut` is "srgb" or "none" (nothing to draw anyway).
   */
  showWarningLines?: boolean;
  /** Render resolution of the gradient canvas. Higher = sharper, slower. Default 160. */
  resolution?: number;
}

/** Which gamuts get a warning line drawn inside the active render gamut. */
function warningGamuts(active: AreaGamut): Gamut[] {
  switch (active) {
    case "srgb":
    case "none":
      return [];
    case "p3":
      return ["srgb"];
    case "rec2020":
      return ["srgb", "p3"];
  }
}

const SUPPORTS_P3 =
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(color-gamut: p3)").matches;

export const Area = React.forwardRef<HTMLDivElement, AreaProps>(function Area(
  {
    mode = "oklch-cl",
    chromaMax = 0.4,
    gamut: gamutProp,
    showWarningLines = true,
    resolution = 160,
    className,
    ...rest
  },
  ref,
) {
  const { color, setColor, format } = useColorPickerContext();
  const gamut: AreaGamut = gamutProp ?? libGamutFromFormat(format);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [paths, setPaths] = React.useState<string[][]>([]);

  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  // The gradient and warning lines depend only on the axis the mode keeps
  // *fixed* (hue for oklch-cl/hsv-sv, lightness for oklch-hc). Depending on
  // every channel of `color` would trigger a 25 600-pixel canvas repaint plus
  // a 128² marching-squares pass on every pointer tick — enough to stall the
  // bead. Narrowing the dep to the locked axis keeps drags free.
  const fixedAxisValue = mode === "oklch-hc" ? color.l : color.h;
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = resolution;
    const h = resolution;
    canvas.width = w;
    canvas.height = h;
    const ctx2dOpts: CanvasRenderingContext2DSettings = SUPPORTS_P3
      ? { colorSpace: "display-p3" }
      : {};
    const ctx = canvas.getContext("2d", ctx2dOpts);
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    paintGradient(img, w, h, mode, color, chromaMax, gamut, SUPPORTS_P3);
    ctx.putImageData(img, 0, 0);
    if (gamut === "none" || !showWarningLines) {
      setPaths([]);
    } else {
      setPaths(
        warningGamuts(gamut).map((g) =>
          computeGamutPaths(mode, color, chromaMax, g, gamut),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, fixedAxisValue, chromaMax, gamut, showWarningLines, resolution]);

  const [px, py] = positionFor(mode, color, chromaMax, gamut);

  const moveTo = React.useCallback(
    (x: number, y: number) => {
      const xn = clamp01(x);
      const yn = clamp01(y);
      const next = sampleAt(mode, color, chromaMax, gamut, xn, yn);
      // With warping every (X, Y) is in-gamut by construction, so toGamut is
      // defensive only — guards against drift at numerical boundaries. When
      // gamut === "none" the user has explicitly opted out of warping and we
      // skip clamping entirely (raw OKLCH plane).
      if (gamut !== "none") {
        const targetHue = next.h;
        const clamped = toGamut(next, gamut as Gamut);
        setColor({ ...clamped, h: targetHue });
      } else {
        setColor(next);
      }
    },
    [mode, chromaMax, color, setColor, gamut],
  );

  const handlePointer = React.useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      moveTo((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height);
    },
    [moveTo],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    handlePointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handlePointer(e.clientX, e.clientY);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 10 : 1;
    const stepX = big / 100; // % of axis
    const stepY = big / 100;
    let nx = px;
    let ny = py;
    switch (e.key) {
      case "ArrowLeft":
        nx -= stepX;
        break;
      case "ArrowRight":
        nx += stepX;
        break;
      case "ArrowUp":
        ny -= stepY;
        break;
      case "ArrowDown":
        ny += stepY;
        break;
      case "Home":
        nx = 0;
        break;
      case "End":
        nx = 1;
        break;
      case "PageUp":
        ny -= 0.1;
        break;
      case "PageDown":
        ny += 0.1;
        break;
      default:
        return;
    }
    e.preventDefault();
    moveTo(nx, ny);
  };

  const valueText = ariaValueTextFor(mode, color, chromaMax, gamut);

  return (
    <div
      ref={containerRef}
      data-slot="color-picker-area"
      role="application"
      aria-label="Color area"
      aria-roledescription="2D color area, use arrow keys to adjust"
      aria-valuetext={valueText}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "relative h-45 w-full overflow-hidden rounded-md border border-border outline-none touch-none select-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        className,
      )}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden="true"
      />
      {paths.length > 0 && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          {paths.map((groupPaths, gi) =>
            groupPaths.map((d, i) => (
              <g key={`${gi}-${i}`}>
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(0,0,0,0.55)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )),
          )}
        </svg>
      )}
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
        style={{
          left: `${px * 100}%`,
          top: `${py * 100}%`,
          background: formatColor({ ...color, alpha: 1 }, "oklch"),
        }}
      />
    </div>
  );
});

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function positionFor(
  mode: AreaMode,
  c: OklchColor,
  chromaMax: number,
  gamut: AreaGamut,
): [number, number] {
  if (gamut === "none") {
    switch (mode) {
      case "oklch-cl":
        return [clamp01(c.c / chromaMax), clamp01(1 - c.l)];
      case "hsv-sv": {
        const v = c.l;
        const s = v > 0 ? c.c / Math.max(v * chromaMax, 1e-6) : 0;
        return [clamp01(s), clamp01(1 - v)];
      }
      case "oklch-hc":
        return [
          clamp01((((c.h % 360) + 360) % 360) / 360),
          clamp01(1 - c.c / chromaMax),
        ];
    }
  }
  switch (mode) {
    case "oklch-cl": {
      const maxC = findMaxChroma(c.l, c.h, gamut as Gamut);
      const safeMaxC = maxC > 1e-6 ? maxC : 1e-6;
      return [clamp01(c.c / safeMaxC), clamp01(1 - c.l)];
    }
    case "hsv-sv": {
      const cusp = findCusp(c.h, gamut as Gamut);
      // L = V·(1 − S·(1 − Lc)), C = V·S·Cc → solve for V, S.
      const V = clamp01(c.l + (c.c * (1 - cusp.l)) / Math.max(cusp.c, 1e-6));
      const S = V > 1e-6 ? clamp01(c.c / (V * Math.max(cusp.c, 1e-6))) : 0;
      return [S, clamp01(1 - V)];
    }
    case "oklch-hc": {
      const maxC = findMaxChroma(c.l, c.h, gamut as Gamut);
      const safeMaxC = maxC > 1e-6 ? maxC : 1e-6;
      return [
        clamp01((((c.h % 360) + 360) % 360) / 360),
        clamp01(1 - c.c / safeMaxC),
      ];
    }
  }
}

/**
 * Build the OKLCH color for a normalized (x, y) inside the area, given the
 * locked axis on `base`. Mirror of `positionFor`.
 */
function sampleAt(
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  gamut: AreaGamut,
  xn: number,
  yn: number,
): OklchColor {
  if (gamut === "none") {
    switch (mode) {
      case "oklch-cl":
        return { ...base, c: xn * chromaMax, l: 1 - yn };
      case "hsv-sv": {
        const v = 1 - yn;
        return { ...base, l: v, c: xn * v * chromaMax };
      }
      case "oklch-hc":
        return { ...base, h: xn * 360, c: (1 - yn) * chromaMax };
    }
  }
  switch (mode) {
    case "oklch-cl": {
      const l = 1 - yn;
      const maxC = findMaxChroma(l, base.h, gamut as Gamut);
      return { ...base, l, c: xn * maxC };
    }
    case "hsv-sv": {
      const cusp = findCusp(base.h, gamut as Gamut);
      const V = 1 - yn;
      const S = xn;
      const l = V * (1 - S * (1 - cusp.l));
      const c = V * S * cusp.c;
      return { ...base, l, c };
    }
    case "oklch-hc": {
      const h = xn * 360;
      const maxC = findMaxChroma(base.l, h, gamut as Gamut);
      return { ...base, h, c: (1 - yn) * maxC };
    }
  }
}

function ariaValueTextFor(
  mode: AreaMode,
  c: OklchColor,
  chromaMax: number,
  gamut: AreaGamut,
): string {
  switch (mode) {
    case "oklch-cl": {
      const maxC =
        gamut === "none"
          ? chromaMax
          : findMaxChroma(c.l, c.h, gamut as Gamut) || chromaMax;
      return `Lightness ${(c.l * 100).toFixed(0)} percent, chroma ${c.c.toFixed(2)} of ${maxC.toFixed(2)}, hue ${c.h.toFixed(0)} degrees`;
    }
    case "hsv-sv": {
      if (gamut === "none") {
        const v = c.l;
        const s = (c.c / Math.max(v * chromaMax, 1e-6)) * 100 || 0;
        return `Saturation ${s.toFixed(0)} percent, value ${(v * 100).toFixed(0)} percent, hue ${c.h.toFixed(0)} degrees`;
      }
      const cusp = findCusp(c.h, gamut as Gamut);
      const V = clamp01(c.l + (c.c * (1 - cusp.l)) / Math.max(cusp.c, 1e-6));
      const S = V > 1e-6 ? clamp01(c.c / (V * Math.max(cusp.c, 1e-6))) : 0;
      return `Saturation ${(S * 100).toFixed(0)} percent, value ${(V * 100).toFixed(0)} percent, hue ${c.h.toFixed(0)} degrees`;
    }
    case "oklch-hc": {
      const maxC =
        gamut === "none"
          ? chromaMax
          : findMaxChroma(c.l, c.h, gamut as Gamut) || chromaMax;
      return `Hue ${c.h.toFixed(0)} degrees, chroma ${c.c.toFixed(2)} of ${maxC.toFixed(2)}, lightness ${(c.l * 100).toFixed(0)} percent`;
    }
  }
}

/* ----------------------- gradient painting ----------------------- */
/* Per-paint LUT of max chroma for the moving axis. Each row (or column for
 * oklch-hc) gets one bisection so the per-pixel cost stays a single multiply.
 * When gamut === "none" we skip the LUT and paint absolute chroma up to
 * chromaMax (the legacy unwrapped plane). */

function paintGradient(
  img: ImageData,
  w: number,
  h: number,
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  gamut: AreaGamut,
  canvasIsP3: boolean,
) {
  const data = img.data;
  const ctx = buildWarpContext(mode, base, gamut, w, h);

  for (let yPx = 0; yPx < h; yPx++) {
    const yn = yPx / (h - 1);
    for (let xPx = 0; xPx < w; xPx++) {
      const xn = xPx / (w - 1);

      const [l, c, hue] = warpedSample(ctx, mode, base, chromaMax, xn, yn, xPx, yPx);

      const lin = oklchToLinearSrgb(l, c, hue);
      const targetLin = canvasIsP3 ? linSrgbToLinP3(lin) : lin;
      const idx = (yPx * w + xPx) * 4;
      data[idx] = clampByte(srgbEncode(targetLin.r) * 255);
      data[idx + 1] = clampByte(srgbEncode(targetLin.g) * 255);
      data[idx + 2] = clampByte(srgbEncode(targetLin.b) * 255);
      data[idx + 3] = 255;
    }
  }
}

/**
 * Per-paint warp resources. For oklch-cl and oklch-hc we precompute a 1D
 * max-chroma LUT keyed by the moving axis. For hsv-sv we precompute the
 * (locked-hue) cusp once. For "none" we hold no resources — the legacy raw
 * mapping uses chromaMax directly.
 */
type WarpContext =
  | { kind: "none" }
  | { kind: "lut-y"; lut: Float32Array }
  | { kind: "lut-x"; lut: Float32Array }
  | { kind: "cusp"; cusp: { l: number; c: number } };

function buildWarpContext(
  mode: AreaMode,
  base: OklchColor,
  gamut: AreaGamut,
  w: number,
  h: number,
): WarpContext {
  if (gamut === "none") return { kind: "none" };
  switch (mode) {
    case "oklch-cl": {
      const lut = new Float32Array(h);
      for (let j = 0; j < h; j++) {
        const l = 1 - j / (h - 1);
        lut[j] = findMaxChroma(l, base.h, gamut as Gamut);
      }
      return { kind: "lut-y", lut };
    }
    case "oklch-hc": {
      const lut = new Float32Array(w);
      for (let i = 0; i < w; i++) {
        const hue = (i / (w - 1)) * 360;
        lut[i] = findMaxChroma(base.l, hue, gamut as Gamut);
      }
      return { kind: "lut-x", lut };
    }
    case "hsv-sv":
      return { kind: "cusp", cusp: findCusp(base.h, gamut as Gamut) };
  }
}

/**
 * Read (l, c, hue) for a normalized (xn, yn) using the precomputed warp
 * context. `xPx`/`yPx` index into the LUT for oklch-cl/oklch-hc; hsv-sv and
 * "none" don't use them.
 */
function warpedSample(
  ctx: WarpContext,
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  xn: number,
  yn: number,
  xPx: number,
  yPx: number,
): [number, number, number] {
  if (ctx.kind === "none") {
    const ok = sampleRaw(mode, base, chromaMax, xn, yn);
    return [ok.l, ok.c, ok.h];
  }
  switch (mode) {
    case "oklch-cl": {
      const l = 1 - yn;
      const maxC = (ctx as { kind: "lut-y"; lut: Float32Array }).lut[yPx];
      return [l, xn * maxC, base.h];
    }
    case "hsv-sv": {
      const cusp = (ctx as { kind: "cusp"; cusp: { l: number; c: number } }).cusp;
      const V = 1 - yn;
      const S = xn;
      const l = V * (1 - S * (1 - cusp.l));
      const c = V * S * cusp.c;
      return [l, c, base.h];
    }
    case "oklch-hc": {
      const hue = xn * 360;
      const maxC = (ctx as { kind: "lut-x"; lut: Float32Array }).lut[xPx];
      return [base.l, (1 - yn) * maxC, hue];
    }
  }
}

function sampleRaw(
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  xn: number,
  yn: number,
): { l: number; c: number; h: number } {
  switch (mode) {
    case "oklch-cl":
      return { l: 1 - yn, c: xn * chromaMax, h: base.h };
    case "hsv-sv": {
      const v = 1 - yn;
      return { l: v, c: xn * v * chromaMax, h: base.h };
    }
    case "oklch-hc":
      return { l: base.l, c: (1 - yn) * chromaMax, h: xn * 360 };
  }
}

/**
 * Compute a warning gamut's boundary inside the *active render gamut's* warped
 * coordinate space, as SVG path strings in normalized 0..1 coords. Marching
 * squares on a 128² grid where each cell samples gamutSignedDistance against
 * the warning gamut, with sample positions warped through the active gamut's
 * max-chroma so the line lands on the correct (X, Y) inside the filled square.
 */
function computeGamutPaths(
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  warningGamut: Gamut,
  activeGamut: AreaGamut,
): string[] {
  const N = 128;
  const stride = N + 1;
  const sd = new Float32Array(stride * stride);
  // Precompute hsv-sv's cusp once; without this the 16 384 grid samples would
  // each rebuild it (52 findMaxChroma calls each → ~850 K total).
  const cusp =
    mode === "hsv-sv" && activeGamut !== "none"
      ? findCusp(base.h, activeGamut as Gamut)
      : null;
  for (let j = 0; j <= N; j++) {
    const yn = j / N;
    for (let i = 0; i <= N; i++) {
      const xn = i / N;
      const ok =
        activeGamut === "none"
          ? sampleRaw(mode, base, chromaMax, xn, yn)
          : sampleWarpedForLine(mode, base, activeGamut as Gamut, xn, yn, cusp);
      sd[j * stride + i] = gamutSignedDistance(
        { l: ok.l, c: ok.c, h: ok.h, alpha: 1 },
        warningGamut,
      );
    }
  }

  const interp = (
    ax: number, ay: number, av: number,
    bx: number, by: number, bv: number,
  ): [number, number] => {
    const t = av / (av - bv);
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
  };

  const segs: number[] = []; // flat: [ax, ay, bx, by, ax, ay, bx, by, ...]
  const pushSeg = (a: [number, number], b: [number, number]) => {
    if (a[0] === b[0] && a[1] === b[1]) return;
    segs.push(a[0], a[1], b[0], b[1]);
  };
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const aTL = sd[j * stride + i];
      const aTR = sd[j * stride + i + 1];
      const aBL = sd[(j + 1) * stride + i];
      const aBR = sd[(j + 1) * stride + i + 1];
      const code =
        (aTL > 0 ? 8 : 0) |
        (aTR > 0 ? 4 : 0) |
        (aBR > 0 ? 2 : 0) |
        (aBL > 0 ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const x0 = i / N;
      const y0 = j / N;
      const x1 = (i + 1) / N;
      const y1 = (j + 1) / N;
      const top = () => interp(x0, y0, aTL, x1, y0, aTR);
      const right = () => interp(x1, y0, aTR, x1, y1, aBR);
      const bottom = () => interp(x0, y1, aBL, x1, y1, aBR);
      const left = () => interp(x0, y0, aTL, x0, y1, aBL);
      switch (code) {
        case 1: case 14: pushSeg(left(), bottom()); break;
        case 2: case 13: pushSeg(bottom(), right()); break;
        case 3: case 12: pushSeg(left(), right()); break;
        case 4: case 11: pushSeg(top(), right()); break;
        case 6: case 9:  pushSeg(top(), bottom()); break;
        case 7: case 8:  pushSeg(left(), top()); break;
        case 5:  pushSeg(left(), top()); pushSeg(bottom(), right()); break;
        case 10: pushSeg(left(), bottom()); pushSeg(top(), right()); break;
      }
    }
  }

  const segCount = segs.length / 4;
  if (segCount === 0) return [];

  // Build endpoint map keyed by quantized coords. Endpoints from adjacent cells
  // share the same `interp` inputs along their shared edge, so they collide
  // exactly — quantization only protects against float ULP drift.
  const Q = 1_000_000;
  const key = (x: number, y: number) => `${(x * Q) | 0},${(y * Q) | 0}`;
  type Endpoint = { seg: number; end: 0 | 1 };
  const endpointMap = new Map<string, Endpoint[]>();
  const addEp = (k: string, e: Endpoint) => {
    const arr = endpointMap.get(k);
    if (arr) arr.push(e);
    else endpointMap.set(k, [e]);
  };
  for (let s = 0; s < segCount; s++) {
    const o = s * 4;
    addEp(key(segs[o], segs[o + 1]), { seg: s, end: 0 });
    addEp(key(segs[o + 2], segs[o + 3]), { seg: s, end: 1 });
  }

  const used = new Uint8Array(segCount);
  const popEndpointAt = (k: string): Endpoint | null => {
    const arr = endpointMap.get(k);
    if (!arr) return null;
    while (arr.length > 0) {
      const e = arr.pop()!;
      if (!used[e.seg]) return e;
    }
    return null;
  };

  const polylines: number[][] = [];
  for (let start = 0; start < segCount; start++) {
    if (used[start]) continue;
    used[start] = 1;
    const o = start * 4;
    const pts: number[] = [segs[o], segs[o + 1], segs[o + 2], segs[o + 3]];

    // Extend forward off the tail.
    while (true) {
      const tx = pts[pts.length - 2];
      const ty = pts[pts.length - 1];
      const e = popEndpointAt(key(tx, ty));
      if (!e) break;
      used[e.seg] = 1;
      const no = e.seg * 4;
      if (e.end === 0) pts.push(segs[no + 2], segs[no + 3]);
      else pts.push(segs[no], segs[no + 1]);
    }
    // Extend backward off the head.
    while (true) {
      const hx = pts[0];
      const hy = pts[1];
      const e = popEndpointAt(key(hx, hy));
      if (!e) break;
      used[e.seg] = 1;
      const no = e.seg * 4;
      if (e.end === 0) pts.unshift(segs[no + 2], segs[no + 3]);
      else pts.unshift(segs[no], segs[no + 1]);
    }

    polylines.push(pts);
  }

  const fmt = (v: number) => v.toFixed(5);
  return polylines.map((pts) => {
    const last = pts.length;
    const closed =
      last >= 4 && pts[0] === pts[last - 2] && pts[1] === pts[last - 1];
    let d = `M${fmt(pts[0])},${fmt(pts[1])}`;
    for (let i = 2; i < last; i += 2) {
      d += `L${fmt(pts[i])},${fmt(pts[i + 1])}`;
    }
    if (closed) d += "Z";
    return d;
  });
}

/**
 * Sample helper for the warning-line marching squares. Mirrors `sampleAt`
 * but takes raw inputs (no `gamut === "none"` branch — callers handle it).
 * `cusp` is required for hsv-sv mode; precomputed by the caller for speed.
 */
function sampleWarpedForLine(
  mode: AreaMode,
  base: OklchColor,
  activeGamut: Gamut,
  xn: number,
  yn: number,
  cusp: { l: number; c: number } | null,
): { l: number; c: number; h: number } {
  switch (mode) {
    case "oklch-cl": {
      const l = 1 - yn;
      const maxC = findMaxChroma(l, base.h, activeGamut);
      return { l, c: xn * maxC, h: base.h };
    }
    case "hsv-sv": {
      const k = cusp ?? findCusp(base.h, activeGamut);
      const V = 1 - yn;
      const S = xn;
      const l = V * (1 - S * (1 - k.l));
      const c = V * S * k.c;
      return { l, c, h: base.h };
    }
    case "oklch-hc": {
      const h = xn * 360;
      const maxC = findMaxChroma(base.l, h, activeGamut);
      return { l: base.l, c: (1 - yn) * maxC, h };
    }
  }
}

function srgbEncode(v: number) {
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function clampByte(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
}

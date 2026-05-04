"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import type { ColorFormat, Gamut, OklchColor } from "../lib/types";
import { cn } from "@/lib/utils";

export type AreaMode = "oklch-cl" | "hsv-sv" | "oklch-hc";
export type AreaGamut = Gamut | "none";

export interface AreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * What the 2D Area represents.
   *  - oklch-cl: X=chroma, Y=lightness (hue from slider). Perceptually uniform.
   *  - hsv-sv: X=saturation, Y=value (HSV). Classic.
   *  - oklch-hc: X=hue, Y=chroma. Lightness picked separately.
   */
  mode?: AreaMode;
  /** Maximum chroma plotted on the X axis when mode === "oklch-cl" or Y axis when mode === "oklch-hc". */
  chromaMax?: number;
  /**
   * Gamut whose boundary is traced as a white cutoff line on the canvas.
   * Defaults to the gamut implied by the active output format
   * (hex/rgb/hsl/hsb → srgb, p3 → p3, oklch/oklab → none).
   * Pass "none" to suppress the line.
   */
  gamut?: AreaGamut;
  /** Render resolution of the gradient canvas. Higher = sharper, slower. Default 200. */
  resolution?: number;
}

function gamutFromFormat(f: ColorFormat): AreaGamut {
  switch (f) {
    case "hex":
    case "rgb":
    case "hsl":
    case "hsb":
      return "srgb";
    case "p3":
      return "p3";
    case "oklch":
    case "oklab":
      return "none";
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
    resolution = 160,
    className,
    ...rest
  },
  ref,
) {
  const { color, setColor, format } = useColorPickerContext();
  const gamut: AreaGamut = gamutProp ?? gamutFromFormat(format);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [paths, setPaths] = React.useState<string[]>([]);

  React.useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

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
    paintGradient(img, w, h, mode, color, chromaMax);
    ctx.putImageData(img, 0, 0);
    setPaths(
      gamut === "none"
        ? []
        : computeGamutPaths(mode, color, chromaMax, gamut as Gamut),
    );
  }, [mode, color.h, color.l, color.c, chromaMax, gamut, resolution]);

  const [px, py] = positionFor(mode, color, chromaMax);

  const moveTo = React.useCallback(
    (x: number, y: number) => {
      const xn = clamp01(x);
      const yn = clamp01(y);
      let next: OklchColor;
      switch (mode) {
        case "oklch-cl":
          next = { ...color, c: xn * chromaMax, l: 1 - yn };
          break;
        case "hsv-sv": {
          const v = 1 - yn;
          next = { ...color, l: v, c: xn * v * chromaMax };
          break;
        }
        case "oklch-hc":
          next = { ...color, h: xn * 360, c: (1 - yn) * chromaMax };
          break;
      }
      setColor(next);
    },
    [mode, chromaMax, color, setColor],
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

  const valueText = ariaValueTextFor(mode, color, chromaMax);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Color area"
      aria-roledescription="2D color area, use arrow keys to adjust"
      aria-valuetext={valueText}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-md border border-border outline-none touch-none select-none",
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
          {paths.map((d, i) => (
            <g key={i}>
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
                stroke="white"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
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

function positionFor(mode: AreaMode, c: OklchColor, chromaMax: number): [number, number] {
  switch (mode) {
    case "oklch-cl":
      return [clamp01(c.c / chromaMax), clamp01(1 - c.l)];
    case "hsv-sv": {
      const v = c.l;
      const s = v > 0 ? c.c / Math.max(v * chromaMax, 1e-6) : 0;
      return [clamp01(s), clamp01(1 - v)];
    }
    case "oklch-hc":
      return [clamp01(((c.h % 360) + 360) % 360 / 360), clamp01(1 - c.c / chromaMax)];
  }
}

function ariaValueTextFor(mode: AreaMode, c: OklchColor, chromaMax: number): string {
  switch (mode) {
    case "oklch-cl":
      return `Lightness ${(c.l * 100).toFixed(0)} percent, chroma ${(c.c).toFixed(2)} of ${chromaMax}, hue ${c.h.toFixed(0)} degrees`;
    case "hsv-sv":
      return `Saturation ${((c.c / Math.max(c.l * chromaMax, 1e-6)) * 100 || 0).toFixed(0)} percent, value ${(c.l * 100).toFixed(0)} percent, hue ${c.h.toFixed(0)} degrees`;
    case "oklch-hc":
      return `Hue ${c.h.toFixed(0)} degrees, chroma ${(c.c).toFixed(2)} of ${chromaMax}, lightness ${(c.l * 100).toFixed(0)} percent`;
  }
}

/* ----------------------- gradient painting ----------------------- */
/* Uses display-p3 canvas when supported; converts OKLCH per pixel via inline math.
 * For perf, we pre-resolve fixed components once, vary only the X/Y axes inside loops.
 */

function paintGradient(
  img: ImageData,
  w: number,
  h: number,
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
) {
  const data = img.data;
  for (let yPx = 0; yPx < h; yPx++) {
    const yn = yPx / (h - 1);
    for (let xPx = 0; xPx < w; xPx++) {
      const xn = xPx / (w - 1);
      const ok = sample(mode, base, chromaMax, xn, yn);
      const rgb = oklchToLinearRgb(ok.l, ok.c, ok.h);
      const srgb = linearToSrgb(rgb);
      const idx = (yPx * w + xPx) * 4;
      data[idx] = clampByte(srgb.r * 255);
      data[idx + 1] = clampByte(srgb.g * 255);
      data[idx + 2] = clampByte(srgb.b * 255);
      data[idx + 3] = 255;
    }
  }
}

/**
 * Compute the gamut boundary as SVG path strings in normalized 0..1 coords.
 * Marching squares + linear edge interpolation gives smooth crossings; segments
 * are then stitched into continuous polylines so the renderer can stroke each
 * with one path (no per-cell subpath caps → no beads). Output is consumed by an
 * SVG overlay with `vector-effect: non-scaling-stroke`, so quality is decoupled
 * from canvas resolution and DPR.
 */
function computeGamutPaths(
  mode: AreaMode,
  base: OklchColor,
  chromaMax: number,
  gamut: Gamut,
): string[] {
  const N = 128;
  const stride = N + 1;
  const sd = new Float32Array(stride * stride);
  for (let j = 0; j <= N; j++) {
    const yn = j / N;
    for (let i = 0; i <= N; i++) {
      const xn = i / N;
      const ok = sample(mode, base, chromaMax, xn, yn);
      const rgb = oklchToLinearRgb(ok.l, ok.c, ok.h);
      sd[j * stride + i] = signedGamutDistance(rgb, gamut);
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

/** >0 = outside gamut, <0 = inside, 0 = on boundary. */
function signedGamutDistance(linRgb: { r: number; g: number; b: number }, gamut: Gamut): number {
  // Distance from [0,1] cube; positive when any channel exceeds the bounds.
  const lo = -Math.min(linRgb.r, linRgb.g, linRgb.b);
  const hi = Math.max(linRgb.r, linRgb.g, linRgb.b) - 1;
  const sd = Math.max(lo, hi);
  if (gamut === "srgb") return sd;
  // P3 / rec2020: rough relaxation; precise check uses target-space conversion at input layer.
  const ext = gamut === "p3" ? 0.3 : 0.5;
  return sd - ext;
}

function sample(mode: AreaMode, base: OklchColor, chromaMax: number, xn: number, yn: number): { l: number; c: number; h: number } {
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

/* OKLCH → linear sRGB matrix conversion (Björn Ottosson's OKLab) */
function oklchToLinearRgb(l: number, c: number, hDeg: number): { r: number; g: number; b: number } {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  // OKLab → LMS'
  const lp = l + 0.3963377774 * a + 0.2158037573 * b;
  const mp = l - 0.1055613458 * a - 0.0638541728 * b;
  const sp = l - 0.0894841775 * a - 1.291485548 * b;

  // LMS' → LMS (cube)
  const L = lp * lp * lp;
  const M = mp * mp * mp;
  const S = sp * sp * sp;

  return {
    r: 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    g: -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    b: -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  };
}

function linearToSrgb(c: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  return { r: lin2srgb(c.r), g: lin2srgb(c.g), b: lin2srgb(c.b) };
}
function lin2srgb(v: number) {
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function clampByte(x: number) {
  return x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
}

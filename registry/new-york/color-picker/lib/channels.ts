import { converter, type Color } from "culori";
import type { ColorFormat, OklchColor } from "./types";
import { toGamut } from "./color";

const toOklch = converter("oklch");
const toRgb = converter("rgb");
const toHsl = converter("hsl");
const toHsv = converter("hsv");
const toOklab = converter("oklab");
const toP3 = converter("p3");

export interface ChannelDescriptor {
  /** Internal key used by setColorChannel. */
  key: string;
  /** One- or two-letter UI label (R, G, B, H, S, L, etc.). */
  label: string;
  /** Current value in display units (e.g. RGB 0–255, OKLCH L 0–100). */
  value: number;
  min: number;
  max: number;
  /** Arrow-key step. */
  step: number;
  /** Shift+arrow step. */
  bigStep: number;
  /** Decimals to render. */
  precision: number;
  /** Optional unit suffix shown after the field. */
  suffix?: string;
}

const ALPHA_DESCRIPTOR = (alpha: number): ChannelDescriptor => ({
  key: "alpha",
  label: "α",
  value: round(alpha * 100, 0),
  min: 0,
  max: 100,
  step: 1,
  bigStep: 10,
  precision: 0,
  suffix: "%",
});

/**
 * Per-format channel descriptors for the multi-field input. Hex returns an
 * empty array — render hex as a single text field instead.
 */
export function colorChannels(
  color: OklchColor,
  format: ColorFormat,
): ChannelDescriptor[] {
  switch (format) {
    case "hex":
      return [];
    case "rgb": {
      const rgb = toRgb({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      });
      const r = round((rgb?.r ?? 0) * 255, 0);
      const g = round((rgb?.g ?? 0) * 255, 0);
      const b = round((rgb?.b ?? 0) * 255, 0);
      return [
        intChannel("r", "R", r, 0, 255),
        intChannel("g", "G", g, 0, 255),
        intChannel("b", "B", b, 0, 255),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    }
    case "hsl": {
      const hsl = toHsl({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      });
      return [
        intChannel("h", "H", round(hsl?.h ?? 0, 0), 0, 360),
        intChannel("s", "S", round((hsl?.s ?? 0) * 100, 0), 0, 100, "%"),
        intChannel("l", "L", round((hsl?.l ?? 0) * 100, 0), 0, 100, "%"),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    }
    case "hsb": {
      const hsv = toHsv({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      });
      return [
        intChannel("h", "H", round(hsv?.h ?? 0, 0), 0, 360),
        intChannel("s", "S", round((hsv?.s ?? 0) * 100, 0), 0, 100, "%"),
        intChannel("b", "B", round((hsv?.v ?? 0) * 100, 0), 0, 100, "%"),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    }
    case "oklch":
      return [
        intChannel("l", "L", round(color.l * 100, 0), 0, 100, "%"),
        floatChannel("c", "C", round(color.c, 3), 0, 0.4, 0.005, 0.05, 3),
        intChannel("h", "H", round(color.h, 0), 0, 360),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    case "oklab": {
      const lab = toOklab({ mode: "oklch", ...oklchObj(color) });
      return [
        intChannel("l", "L", round((lab?.l ?? color.l) * 100, 0), 0, 100, "%"),
        floatChannel("a", "a", round(lab?.a ?? 0, 3), -0.4, 0.4, 0.005, 0.05, 3),
        floatChannel("b", "b", round(lab?.b ?? 0, 3), -0.4, 0.4, 0.005, 0.05, 3),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    }
    case "p3": {
      const p3 = toP3({
        mode: "oklch",
        ...oklchObj(toGamut(color, "p3")),
      });
      return [
        floatChannel("r", "R", round(p3?.r ?? 0, 3), 0, 1, 0.01, 0.1, 3),
        floatChannel("g", "G", round(p3?.g ?? 0, 3), 0, 1, 0.01, 0.1, 3),
        floatChannel("b", "B", round(p3?.b ?? 0, 3), 0, 1, 0.01, 0.1, 3),
        ALPHA_DESCRIPTOR(color.alpha),
      ];
    }
  }
}

/**
 * Replace one channel's value in the active format's space and convert the
 * result back to canonical OKLCH. Display-unit input (e.g. RGB 0–255, OKLCH
 * L 0–100, alpha 0–100) — colorChannels and this writer agree on units.
 */
export function setColorChannel(
  color: OklchColor,
  format: ColorFormat,
  key: string,
  value: number,
): OklchColor {
  if (key === "alpha") {
    return { ...color, alpha: clamp(value / 100, 0, 1) };
  }
  switch (format) {
    case "hex":
      // Hex isn't channel-addressable; callers should special-case it.
      return color;
    case "rgb": {
      const rgb = toRgb({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      }) ?? { r: 0, g: 0, b: 0 };
      const next = {
        ...rgb,
        [key]: clamp(value / 255, 0, 1),
        mode: "rgb" as const,
      };
      return fromCulori(next, color.alpha);
    }
    case "hsl": {
      const hsl = toHsl({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      }) ?? { h: 0, s: 0, l: 0 };
      const h = key === "h" ? wrap(value, 360) : (hsl.h ?? 0);
      const s = key === "s" ? clamp(value / 100, 0, 1) : hsl.s;
      const l = key === "l" ? clamp(value / 100, 0, 1) : hsl.l;
      return fromCulori({ mode: "hsl" as const, h, s, l }, color.alpha);
    }
    case "hsb": {
      const hsv = toHsv({
        mode: "oklch",
        ...oklchObj(toGamut(color, "srgb")),
      }) ?? { h: 0, s: 0, v: 0 };
      const h = key === "h" ? wrap(value, 360) : (hsv.h ?? 0);
      const s = key === "s" ? clamp(value / 100, 0, 1) : hsv.s;
      const v = key === "b" ? clamp(value / 100, 0, 1) : hsv.v;
      return fromCulori({ mode: "hsv" as const, h, s, v }, color.alpha);
    }
    case "oklch": {
      switch (key) {
        case "l":
          return { ...color, l: clamp(value / 100, 0, 1) };
        case "c":
          // OKLCH chroma is unbounded above; gamut limits are applied at
          // display time via toGamut, never at channel-edit time.
          return { ...color, c: Math.max(value, 0) };
        case "h":
          return { ...color, h: wrap(value, 360) };
        default:
          return color;
      }
    }
    case "oklab": {
      const lab = toOklab({ mode: "oklch", ...oklchObj(color) }) ?? {
        l: 0,
        a: 0,
        b: 0,
      };
      const l = key === "l" ? clamp(value / 100, 0, 1) : (lab.l ?? 0);
      const a = key === "a" ? clamp(value, -0.5, 0.5) : (lab.a ?? 0);
      const b = key === "b" ? clamp(value, -0.5, 0.5) : (lab.b ?? 0);
      return fromCulori({ mode: "oklab" as const, l, a, b }, color.alpha);
    }
    case "p3": {
      const p3 = toP3({
        mode: "oklch",
        ...oklchObj(toGamut(color, "p3")),
      }) ?? { r: 0, g: 0, b: 0 };
      const next = {
        ...p3,
        [key]: clamp(value, 0, 1),
        mode: "p3" as const,
      };
      return fromCulori(next, color.alpha);
    }
  }
}

function fromCulori(c: Color, alpha: number): OklchColor {
  const ok = toOklch(c);
  if (!ok) return { l: 0, c: 0, h: 0, alpha };
  return {
    l: ok.l ?? 0,
    c: ok.c ?? 0,
    h: ok.h ?? 0,
    alpha,
  };
}

function oklchObj(c: OklchColor) {
  return { l: c.l, c: c.c, h: c.h, alpha: c.alpha };
}

function intChannel(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  suffix?: string,
): ChannelDescriptor {
  return {
    key,
    label,
    value,
    min,
    max,
    step: 1,
    bigStep: 10,
    precision: 0,
    suffix,
  };
}

function floatChannel(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  bigStep: number,
  precision: number,
  suffix?: string,
): ChannelDescriptor {
  return { key, label, value, min, max, step, bigStep, precision, suffix };
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function wrap(v: number, mod: number) {
  return ((v % mod) + mod) % mod;
}

function round(v: number, precision: number) {
  const m = 10 ** precision;
  return Math.round(v * m) / m;
}

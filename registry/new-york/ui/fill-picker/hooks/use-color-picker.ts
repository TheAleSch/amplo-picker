"use client";

import * as React from "react";
import {
  parseColor,
  parseColorDetailed,
  formatAll,
  gamutFromFormat,
  gamutInfo,
  contrast,
  toGamut,
} from "../lib/color";
import type {
  ColorFormat,
  ContrastResult,
  GamutInfo,
  OklchColor,
} from "../lib/types";

export type ColorComponent = "l" | "c" | "h" | "alpha";

export interface UseColorPickerProps {
  /** Controlled color value (string or canonical OklchColor). */
  value?: string | OklchColor;
  /** Initial color when uncontrolled. */
  defaultValue?: string | OklchColor;
  /**
   * Fires whenever the color changes.
   *  - `color`: canonical OKLCH form (lossless source of truth).
   *  - `formatted`: the active output format string (governed by `format`).
   *  - `formats`: every supported format pre-serialized — use `formats.hex`
   *    when you need a fallback alongside the canonical `formats.oklch`.
   */
  onValueChange?: (
    color: OklchColor,
    formatted: string,
    formats: Record<ColorFormat, string>,
  ) => void;
  /** Active output format. */
  format?: ColorFormat;
  /** Initial format when uncontrolled. */
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  /**
   * Color spaces (output formats) the picker exposes. Restricts the
   * FormatSwitcher tabs and the default format. Defaults to all formats.
   */
  formats?: ColorFormat[];
  /** Background used for contrast metrics. */
  backgroundColor?: string | OklchColor;
}

export interface ColorPickerState {
  color: OklchColor;
  format: ColorFormat;
  /** Active format string (mirrors `format`). */
  formatted: string;
  /** Allowed output formats (the set restricting the FormatSwitcher). */
  formats: ColorFormat[];
  /** Pre-serialized strings for every supported format. */
  formatStrings: Record<ColorFormat, string>;
  setColor: (next: string | OklchColor) => void;
  setComponent: (key: ColorComponent, value: number) => void;
  adjustComponent: (key: ColorComponent, delta: number) => void;
  setFormat: (f: ColorFormat) => void;
  setFromString: (s: string) => boolean;
  gamut: GamutInfo;
  contrast: ContrastResult;
  background: OklchColor;
}

const ALL_FORMATS: ColorFormat[] = ["hex", "rgb", "hsl", "hsb", "oklch", "oklab", "p3"];

const BLACK: OklchColor = { l: 0, c: 0, h: 0, alpha: 1 };
const WHITE: OklchColor = { l: 1, c: 0, h: 0, alpha: 1 };

function coerce(input: string | OklchColor | undefined, fallback: OklchColor): OklchColor {
  if (!input) return fallback;
  if (typeof input === "string") {
    return parseColor(input) ?? fallback;
  }
  // Strings are hue-wrapped by the parser; normalize objects the same way.
  return { ...input, h: wrapHue(input.h) };
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(Math.max(x, lo), hi);
}

function wrapHue(h: number) {
  const m = h % 360;
  return m < 0 ? m + 360 : m;
}

const HUE_EPS = 1e-4;
function isAchromatic(c: OklchColor): boolean {
  return c.c <= HUE_EPS || c.l <= HUE_EPS || c.l >= 1 - HUE_EPS;
}

function applyComponent(c: OklchColor, key: ColorComponent, raw: number): OklchColor {
  // NaN/Infinity (e.g. a cleared number field) would poison every derived
  // conversion; ignore the write instead.
  if (!Number.isFinite(raw)) return c;
  switch (key) {
    case "l":
      return { ...c, l: clamp(raw, 0, 1) };
    case "c":
      return { ...c, c: Math.max(raw, 0) };
    case "h":
      return { ...c, h: wrapHue(raw) };
    case "alpha":
      return { ...c, alpha: clamp(raw, 0, 1) };
  }
}

export function useColorPicker(props: UseColorPickerProps = {}): ColorPickerState {
  const {
    value: controlledValue,
    defaultValue,
    onValueChange,
    format: controlledFormat,
    defaultFormat = "p3",
    onFormatChange,
    formats: formatsProp,
    backgroundColor,
  } = props;

  const formats = React.useMemo<ColorFormat[]>(
    () => (formatsProp && formatsProp.length > 0 ? formatsProp : ALL_FORMATS),
    [formatsProp],
  );
  const initialFormat = formats.includes(defaultFormat) ? defaultFormat : formats[0];

  const [internalColor, setInternalColor] = React.useState<OklchColor>(() =>
    coerce(defaultValue, BLACK),
  );
  const [internalFormat, setInternalFormat] = React.useState<ColorFormat>(initialFormat);

  const isControlledColor = controlledValue !== undefined;
  const isControlledFormat = controlledFormat !== undefined;

  // Hue is undefined for achromatic colors (c=0, pure black, pure white) so
  // any string round-trip through hex/rgb erases it. Remember the last hue
  // observed on a chromatic, mid-lightness color and substitute it back when
  // the resolved color lands on an achromatic edge — keeps the area picker
  // from snapping the hue to 0 when the user drags toward gray/black/white.
  // Seeded from the initial color state rather than re-parsing
  // `defaultValue` on every render (every drag frame).
  const lastGoodHueRef = React.useRef<number>(internalColor.h || 0);

  const isControlledStringInput =
    isControlledColor && typeof controlledValue === "string";
  const controlledParsed = React.useMemo(
    () =>
      isControlledStringInput
        ? parseColorDetailed(controlledValue as string)
        : null,
    [controlledValue, isControlledStringInput],
  );
  const rawColor = React.useMemo(
    () =>
      isControlledStringInput
        ? (controlledParsed?.color ?? BLACK)
        : isControlledColor
          ? coerce(controlledValue, BLACK)
          : internalColor,
    [
      controlledParsed,
      controlledValue,
      internalColor,
      isControlledColor,
      isControlledStringInput,
    ],
  );
  // A hue is "good" (worth remembering) when it's meaningful: any chromatic
  // color, or a string that authored a hue even at zero chroma (OKLCH can).
  const controlledHueAuthored = controlledParsed
    ? !controlledParsed.hueMissing
    : false;
  React.useLayoutEffect(() => {
    if (!isAchromatic(rawColor) || controlledHueAuthored) {
      lastGoodHueRef.current = rawColor.h;
    }
  }, [controlledHueAuthored, rawColor]);
  // Only substitute on string-controlled inputs whose parse actually lost
  // the hue (achromatic hex/rgb/hsl round-trips). Strings that author a hue
  // (e.g. `oklch(0.5 0 90)`), object-controlled, and uncontrolled state all
  // carry the hue verbatim — including explicit user assignments like
  // setComponent("h", 0) on a black/white color.
  // Reading the prior committed hue is intentional: layout effects keep the
  // ref current before input can arrive, while avoiding a render-time write.
  // eslint-disable-next-line react-hooks/refs
  const preservedHue = lastGoodHueRef.current;
  const color = React.useMemo<OklchColor>(
    () =>
      isControlledStringInput && (controlledParsed?.hueMissing ?? true)
        ? { ...rawColor, h: preservedHue }
        : rawColor,
    [
      controlledParsed?.hueMissing,
      isControlledStringInput,
      preservedHue,
      rawColor,
    ],
  );
  const format = isControlledFormat ? controlledFormat! : internalFormat;
  const background = React.useMemo(
    () => coerce(backgroundColor, WHITE),
    [backgroundColor],
  );

  const formatStrings = React.useMemo(() => formatAll(color), [color]);
  const formatted = formatStrings[format];
  const gamut = React.useMemo(() => gamutInfo(color), [color]);
  const contrastResult = React.useMemo(
    () => contrast(color, background),
    [color, background],
  );

  const commitColor = React.useCallback(
    (next: OklchColor, formatOverride?: ColorFormat) => {
      if (!isControlledColor) setInternalColor(next);
      if (onValueChange) {
        const all = formatAll(next);
        onValueChange(next, all[formatOverride ?? format], all);
      }
    },
    [format, isControlledColor, onValueChange],
  );

  // Commit a string input, re-pinning the remembered hue when the parse
  // lost it (achromatic hex/rgb/hsl) — otherwise a gray commit would store
  // the defaulted h: 0 and later re-saturation would snap to red.
  const commitString = React.useCallback(
    (s: string): boolean => {
      const parsed = parseColorDetailed(s);
      if (!parsed) return false;
      const next = parsed.hueMissing
        ? { ...parsed.color, h: lastGoodHueRef.current }
        : parsed.color;
      commitColor(next);
      return true;
    },
    [commitColor],
  );

  const setColor = React.useCallback(
    (next: string | OklchColor) => {
      if (typeof next === "string") {
        commitString(next);
        return;
      }
      commitColor(next);
    },
    [commitColor, commitString],
  );

  const setComponent = React.useCallback(
    (key: ColorComponent, val: number) => {
      commitColor(applyComponent(color, key, val));
    },
    [color, commitColor],
  );

  const adjustComponent = React.useCallback(
    (key: ColorComponent, delta: number) => {
      const current =
        key === "l" ? color.l : key === "c" ? color.c : key === "h" ? color.h : color.alpha;
      commitColor(applyComponent(color, key, current + delta));
    },
    [color, commitColor],
  );

  const setFormat = React.useCallback(
    (f: ColorFormat) => {
      // Switching formats is also a switch of *picking* gamut. If the current
      // OKLCH state lives outside the new format's gamut (e.g. user authored
      // a wide P3 chroma in OKLCH mode, then toggled to hex), the displayed
      // string would be gamut-mapped at format time but the underlying state
      // — and the gamut badge — would still report out-of-gamut. Clamp on
      // the way in so state and display agree. Hue is pinned per the picker's
      // "chroma is the only lossy axis" invariant.
      const targetGamut = gamutFromFormat(f);
      const info = gamutInfo(color);
      const alreadyIn =
        targetGamut === "srgb"
          ? info.inSrgb
          : targetGamut === "p3"
            ? info.inP3
            : info.inRec2020;
      if (!alreadyIn) {
        const targetHue = color.h;
        const clamped = toGamut(color, targetGamut);
        // Pass the next format explicitly so the clamp notification never
        // emits using the closure's previous format.
        commitColor({ ...clamped, h: targetHue }, f);
      }
      if (!isControlledFormat) setInternalFormat(f);
      onFormatChange?.(f);
    },
    [color, commitColor, isControlledFormat, onFormatChange],
  );

  const setFromString = React.useCallback(
    (s: string) => commitString(s),
    [commitString],
  );

  return {
    color,
    format,
    formatted,
    formats,
    formatStrings,
    setColor,
    setComponent,
    adjustComponent,
    setFormat,
    setFromString,
    gamut,
    contrast: contrastResult,
    background,
  };
}

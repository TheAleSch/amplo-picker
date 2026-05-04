"use client";

import * as React from "react";
import {
  parseColor,
  formatColor,
  gamutInfo,
  contrast,
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
  /** Fires whenever the color changes. */
  onValueChange?: (color: OklchColor, formatted: string) => void;
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
  formatted: string;
  formats: ColorFormat[];
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
  return input;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(Math.max(x, lo), hi);
}

function wrapHue(h: number) {
  const m = h % 360;
  return m < 0 ? m + 360 : m;
}

function applyComponent(c: OklchColor, key: ColorComponent, raw: number): OklchColor {
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
    defaultFormat = "hex",
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

  const color = isControlledColor ? coerce(controlledValue, BLACK) : internalColor;
  const format = isControlledFormat ? controlledFormat! : internalFormat;
  const background = coerce(backgroundColor, WHITE);

  const formatted = React.useMemo(() => formatColor(color, format), [color, format]);
  const gamut = React.useMemo(() => gamutInfo(color), [color]);
  const contrastResult = React.useMemo(
    () => contrast(color, background),
    [color, background],
  );

  const commitColor = React.useCallback(
    (next: OklchColor) => {
      if (!isControlledColor) setInternalColor(next);
      onValueChange?.(next, formatColor(next, format));
    },
    [format, isControlledColor, onValueChange],
  );

  const setColor = React.useCallback(
    (next: string | OklchColor) => {
      const parsed = coerce(next, color);
      commitColor(parsed);
    },
    [color, commitColor],
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
      if (!isControlledFormat) setInternalFormat(f);
      onFormatChange?.(f);
    },
    [isControlledFormat, onFormatChange],
  );

  const setFromString = React.useCallback(
    (s: string) => {
      const parsed = parseColor(s);
      if (!parsed) return false;
      commitColor(parsed);
      return true;
    },
    [commitColor],
  );

  return {
    color,
    format,
    formatted,
    formats,
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

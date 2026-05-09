"use client";

import * as React from "react";
import {
  DEFAULT_LINEAR,
  formatFill,
  type Fill,
  type ColorFill,
  type GradientFill,
} from "../lib/gradient";
import type { OklchColor } from "../lib/types";

const DEFAULT_COLOR: OklchColor = { l: 0, c: 0, h: 0, alpha: 1 };

export type FillMode = "color" | "gradient";

export interface UseFillPickerProps {
  value?: Fill;
  defaultValue?: Fill;
  onValueChange?: (fill: Fill, css: string) => void;
  mode?: FillMode;
  defaultMode?: FillMode;
  onModeChange?: (mode: FillMode) => void;
}

export interface FillPickerState {
  fill: Fill;
  mode: FillMode;
  setFill: (fill: Fill) => void;
  setMode: (mode: FillMode) => void;
}

export function useFillPicker(props: UseFillPickerProps = {}): FillPickerState {
  const {
    value,
    defaultValue,
    onValueChange,
    mode: modeProp,
    defaultMode,
    onModeChange,
  } = props;

  const initialFill: Fill =
    value ?? defaultValue ?? { kind: "color", color: DEFAULT_COLOR };
  const initialMode: FillMode = modeProp ?? defaultMode ?? initialFill.kind;

  const [internalFill, setInternalFill] = React.useState<Fill>(initialFill);
  const [internalMode, setInternalMode] = React.useState<FillMode>(initialMode);

  const lastColorRef = React.useRef<ColorFill>(
    initialFill.kind === "color"
      ? initialFill
      : { kind: "color", color: DEFAULT_COLOR },
  );
  const lastGradientRef = React.useRef<GradientFill>(
    initialFill.kind === "gradient"
      ? initialFill
      : { kind: "gradient", gradient: DEFAULT_LINEAR },
  );

  React.useEffect(() => {
    if (value === undefined) return;
    setInternalFill(value);
    if (value.kind === "color") lastColorRef.current = value;
    else lastGradientRef.current = value;
  }, [value]);

  React.useEffect(() => {
    if (modeProp === undefined) return;
    setInternalMode(modeProp);
  }, [modeProp]);

  const setFill = React.useCallback(
    (fill: Fill) => {
      setInternalFill(fill);
      if (fill.kind === "color") lastColorRef.current = fill;
      else lastGradientRef.current = fill;
      onValueChange?.(fill, formatFill(fill));
    },
    [onValueChange],
  );

  const setMode = React.useCallback(
    (next: FillMode) => {
      setInternalMode(next);
      onModeChange?.(next);
      const restored: Fill =
        next === "color" ? lastColorRef.current : lastGradientRef.current;
      setInternalFill(restored);
      onValueChange?.(restored, formatFill(restored));
    },
    [onValueChange, onModeChange],
  );

  return { fill: internalFill, mode: internalMode, setFill, setMode };
}

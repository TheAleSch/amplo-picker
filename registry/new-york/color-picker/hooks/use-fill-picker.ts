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

  // Derive in render — don't sync props → state via useEffect (per React's
  // "you might not need an effect" guidance). The controlled value is the
  // source of truth when provided; internal state is only consulted when
  // uncontrolled.
  const isControlled = value !== undefined;
  const isControlledMode = modeProp !== undefined;
  const fill: Fill = isControlled ? value : internalFill;
  const mode: FillMode = isControlledMode ? modeProp : internalMode;

  // Track the last fill we saw for each kind so setMode can restore the cached
  // side. Mutating refs during render is allowed (refs are not state) and
  // avoids the parent → effect → setState round-trip.
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
  if (fill.kind === "color") lastColorRef.current = fill;
  else lastGradientRef.current = fill;

  const setFill = React.useCallback(
    (next: Fill) => {
      setInternalFill(next);
      onValueChange?.(next, formatFill(next));
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

  return { fill, mode, setFill, setMode };
}

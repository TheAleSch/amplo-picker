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

  // With no seed fill, the default fill follows the requested mode so
  // `defaultMode: "gradient"` doesn't start on a color fill.
  const seedFill = value ?? defaultValue;
  const initialMode: FillMode =
    modeProp ?? defaultMode ?? seedFill?.kind ?? "color";
  const initialFill: Fill =
    seedFill ??
    (initialMode === "gradient"
      ? { kind: "gradient", gradient: DEFAULT_LINEAR }
      : { kind: "color", color: DEFAULT_COLOR });

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

  // Track the last committed fill for each kind so setMode can restore the
  // cached side. A layout effect updates the cache before input can arrive
  // without mutating refs during render.
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
  React.useLayoutEffect(() => {
    if (fill.kind === "color") lastColorRef.current = fill;
    else lastGradientRef.current = fill;
  }, [fill]);

  const setFill = React.useCallback(
    (next: Fill) => {
      if (!isControlled) setInternalFill(next);
      onValueChange?.(next, formatFill(next));
    },
    [isControlled, onValueChange],
  );

  const setMode = React.useCallback(
    (next: FillMode) => {
      if (!isControlledMode) setInternalMode(next);
      onModeChange?.(next);
      const restored: Fill =
        next === "color" ? lastColorRef.current : lastGradientRef.current;
      if (!isControlled) setInternalFill(restored);
      onValueChange?.(restored, formatFill(restored));
    },
    [isControlled, isControlledMode, onModeChange, onValueChange],
  );

  return { fill, mode, setFill, setMode };
}

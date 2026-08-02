"use client";

import * as React from "react";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  useColorPicker,
  type ColorPickerState,
} from "../../hooks/use-color-picker";

/**
 * Tooltip/popover-agnostic half of the per-stop color editor: a
 * `useColorPicker` bound to one gradient stop's color and per-stop format.
 *
 * Shared by both variants' stop editors (`stop-editor-popover.tsx` here and
 * `fill-picker-base/parts/gradient/stop-editor.tsx`) so the memoization
 * subtleties below can't drift between them — mirrors the
 * `*-shared` split used by GamutBadge / ContrastReadout.
 */
export function useStopColorPickerState(stopId: string): ColorPickerState {
  const grad = useGradientPickerContext();
  const stop = grad.stops.find((s) => s.id === stopId) ?? grad.stops[0];
  const format = grad.getStopColorFormat(stopId);
  // Memoize on the channel values, not on `stop` identity — same reasoning as
  // `<GradientPicker.StopColor>`'s Bound. The gradient hook allocates fresh
  // stop objects on every controlled sync (even a structural match), so
  // passing `stop?.color` straight through would hand the inner picker a new
  // OklchColor identity on each parent render, turning Area's `[color]`
  // effect into a per-render trigger.
  const stopL = stop?.color.l;
  const stopC = stop?.color.c;
  const stopH = stop?.color.h;
  const stopAlpha = stop?.color.alpha;
  const liveColor = React.useMemo(
    () =>
      stopL === undefined ||
      stopC === undefined ||
      stopH === undefined ||
      stopAlpha === undefined
        ? undefined
        : { l: stopL, c: stopC, h: stopH, alpha: stopAlpha },
    [stopL, stopC, stopH, stopAlpha],
  );
  return useColorPicker({
    value: liveColor,
    onValueChange: (c) => {
      if (stop) grad.setStopColor(stop.id, c);
    },
    format,
    onFormatChange: (f) => grad.setStopColorFormat(stopId, f),
  });
}

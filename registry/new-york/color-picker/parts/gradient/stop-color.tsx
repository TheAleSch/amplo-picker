"use client";

import * as React from "react";
import { ColorPickerContext } from "../../context";
import { useGradientPickerContext } from "../../contexts/gradient";
import { useColorPicker } from "../../hooks/use-color-picker";
import type { OklchColor } from "../../lib/types";

/**
 * Mounts ColorPickerContext bound to the selected stop's color. Children are
 * normal ColorPicker.* parts (Area, Hue, ChannelInput, ...) — they Just Work
 * because they only depend on ColorPickerContext.
 *
 * The inner Bound component is keyed on the selected stop id, so a fresh
 * useColorPicker instance (and a fresh `lastGoodHueRef`) is created per
 * stop. This isolates hue preservation per stop: editing stop A then
 * switching to stop B and back to A doesn't smear hue history across stops.
 */
export const StopColor: React.FC<React.PropsWithChildren> = ({ children }) => {
  const grad = useGradientPickerContext();
  const stop = grad.selectedStop;
  if (!stop) return null;
  return (
    <Bound key={stop.id} stopId={stop.id} initialColor={stop.color}>
      {children}
    </Bound>
  );
};

const Bound: React.FC<
  React.PropsWithChildren<{ stopId: string; initialColor: OklchColor }>
> = ({ stopId, initialColor, children }) => {
  const grad = useGradientPickerContext();
  // Re-read the live color on every render so external moves (e.g. preset
  // applied) flow into the picker. Memoize on the channel values (not on
  // grad.stops identity) so the controlled value handed to useColorPicker is
  // ref-stable across renders that don't actually change this stop's color.
  // Without this, every gradient update — even ones that don't touch this
  // stop — would hand the inner ColorPicker a fresh OklchColor object, which
  // turns Area's `[color]` effect into a per-render trigger and can spiral
  // into Maximum-update-depth under React 19's stricter detection.
  const found = grad.stops.find((s) => s.id === stopId);
  const l = found?.color.l ?? initialColor.l;
  const c = found?.color.c ?? initialColor.c;
  const h = found?.color.h ?? initialColor.h;
  const alpha = found?.color.alpha ?? initialColor.alpha;
  const liveColor = React.useMemo<OklchColor>(
    () => ({ l, c, h, alpha }),
    [l, c, h, alpha],
  );

  const setStopColorRef = React.useRef(grad.setStopColor);
  setStopColorRef.current = grad.setStopColor;
  const onValueChange = React.useCallback(
    (color: OklchColor) => setStopColorRef.current(stopId, color),
    [stopId],
  );

  const state = useColorPicker({ value: liveColor, onValueChange });

  return (
    <ColorPickerContext.Provider value={state}>
      {children}
    </ColorPickerContext.Provider>
  );
};

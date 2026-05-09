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
  // applied) flow into the picker. The stop is guaranteed to exist while
  // this component is mounted because the parent gates on selectedStop.
  const liveColor =
    grad.stops.find((s) => s.id === stopId)?.color ?? initialColor;

  const state = useColorPicker({
    value: liveColor,
    onValueChange: (color) => grad.setStopColor(stopId, color),
  });

  return (
    <ColorPickerContext.Provider value={state}>
      {children}
    </ColorPickerContext.Provider>
  );
};

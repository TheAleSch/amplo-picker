"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPickerContext } from "../../context";
import { useGradientPickerContext } from "../../contexts/gradient";
import { useColorPicker } from "../../hooks/use-color-picker";
import { Area as ColorArea } from "../area";
import { Hue } from "../hue";
import { Alpha } from "../alpha";
import { ChannelInput } from "../channel-input";
import { FormatSwitcher } from "../format-switcher";
import { EyeDropper } from "../eye-dropper";

export interface StopEditorPopoverProps {
  /** Stop the popover edits — color + per-stop format are read/written via gradient context. */
  stopId: string;
  /** Controlled open state. Omit for trigger-managed open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trigger element (rendered via Radix `asChild`). */
  children: React.ReactNode;
}

/**
 * Shared color-editor popover used by `<GradientPicker.StopList>` rows and
 * by `<GradientPicker.Bar editOnClick>`. Mounts a `useColorPicker` bound
 * to the named stop and provides it via `ColorPickerContext` so the
 * standard `<ColorPicker.*>` parts work inside.
 */
export function StopEditorPopover({
  stopId,
  open,
  onOpenChange,
  children,
}: StopEditorPopoverProps) {
  const grad = useGradientPickerContext();
  const stop = grad.stops.find((s) => s.id === stopId) ?? grad.stops[0];
  const format = grad.getStopColorFormat(stopId);
  const state = useColorPicker({
    value: stop?.color,
    onValueChange: (c) => {
      if (stop) grad.setStopColor(stop.id, c);
    },
    format,
    onFormatChange: (f) => grad.setStopColorFormat(stopId, f),
  });
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="flex w-72 flex-col gap-3 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <ColorPickerContext.Provider value={state}>
          <ColorArea mode="oklch-cl" />
          <div className="flex flex-col gap-1.5">
            <Hue />
            <Alpha />
          </div>
          <div className="flex items-center gap-2">
            <FormatSwitcher className="flex-1" />
            <EyeDropper className="h-8 w-full flex-1" />
          </div>
          <ChannelInput showFormat={false} />
        </ColorPickerContext.Provider>
      </PopoverContent>
    </Popover>
  );
}

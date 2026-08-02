"use client";

import * as React from "react";
import { StopPopover } from "./stop-popover";
import { ColorPickerContext } from "../../context";
import type { GradientStopEditorRenderer } from "../../contexts/gradient";
import { useStopColorPickerState } from "./stop-editor-shared";
import { Area as ColorArea } from "../area";
import { Hue } from "../hue";
import { Alpha } from "../alpha";
import { ChannelInput } from "../channel-input";
import { FormatSwitcher } from "../format-switcher";
import { EyeDropper } from "../eye-dropper";

export interface StopEditorPopoverProps {
  /** Stop the popover edits — color + per-stop format are read/written via gradient context. */
  stopId: string;
  /**
   * Controlled open state. Required — open is always external because
   * the anchor element typically has its own pointer handling (drag on
   * Bar handles, click on StopList swatches) that would conflict with
   * a trigger-managed open state.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Anchor element. Positioned against; provides positioning only. */
  children: React.ReactElement;
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
  const state = useStopColorPickerState(stopId);
  return (
    <StopPopover
      open={open}
      onOpenChange={onOpenChange}
      anchor={children}
      className="flex w-72 flex-col gap-3"
      onContentClick={(e) => e.stopPropagation()}
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
    </StopPopover>
  );
}

/**
 * `<GradientPicker.Bar editOnClick>`'s stop-editor slot, filled with the
 * popover above. Injected as the default by the Radix/shadcn barrel
 * (`gradient-picker.tsx`, `fill-picker.tsx`); the Base UI variant injects its
 * own from `fill-picker-base/parts/gradient/stop-editor.tsx`.
 */
export const stopEditorSlot: GradientStopEditorRenderer = ({
  children,
  ...props
}) => (
  // The Bar always passes a single element (the stop handle) as `children`;
  // the slot type is widened to ReactNode only because it is React's own
  // children convention.
  <StopEditorPopover {...props}>
    {children as React.ReactElement}
  </StopEditorPopover>
);

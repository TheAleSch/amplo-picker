"use client";

import * as React from "react";
import { StopPopover } from "@/registry/new-york/ui/fill-picker/parts/gradient/stop-popover";
import { ColorPickerContext } from "@/registry/new-york/ui/fill-picker/context";
import type { GradientStopEditorRenderer } from "@/registry/new-york/ui/fill-picker/contexts/gradient";
import { useStopColorPickerState } from "@/registry/new-york/ui/fill-picker/parts/gradient/stop-editor-shared";
import { Area as ColorArea } from "@/registry/new-york/ui/fill-picker/parts/area";
import { EyeDropper } from "@/registry/new-york/ui/fill-picker/parts/eye-dropper";

import { Hue } from "../hue";
import { Alpha } from "../alpha";
import { ChannelInput } from "../channel-input";
import { FormatSwitcher } from "../format-switcher";

export interface StopEditorProps {
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
 * Base UI variant of `<StopEditorPopover>`: same layout, same bound state
 * (`useStopColorPickerState`, shared with the original so the memoization
 * subtleties can't drift), but composed from this tree's Base UI parts —
 * Hue/Alpha on Slider, FormatSwitcher on Select, ChannelInput on NumberField.
 *
 * Area and EyeDropper come from the engine unchanged: they're pointer/canvas
 * logic and a plain shadcn Button, already shipped as-is by this variant's
 * `color-picker.tsx`.
 *
 * The popover shell is the engine's `StopPopover` — already built directly on
 * `@base-ui/react/popover` (anchor-without-trigger, z-50 positioner), so
 * there's nothing Radix-flavoured to re-do.
 */
export function StopEditor({
  stopId,
  open,
  onOpenChange,
  children,
}: StopEditorProps) {
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
 * `<GradientPickerBase.Bar editOnClick>`'s stop-editor slot, filled with the
 * editor above. Injected as the default by the Base UI barrels
 * (`gradient.tsx`, `fill.tsx`).
 */
export const stopEditorSlot: GradientStopEditorRenderer = ({
  children,
  ...props
}) => (
  // The Bar always passes a single element (the stop handle) as `children`;
  // the slot type is widened to ReactNode only because it is React's own
  // children convention.
  <StopEditor {...props}>{children as React.ReactElement}</StopEditor>
);

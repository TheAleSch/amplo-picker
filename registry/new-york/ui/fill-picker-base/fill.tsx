"use client";

// Re-export the Base UI gradient-picker public surface (which itself
// re-exports the Base UI color-picker), so a single import point covers
// the whole Base UI fill-picker public surface: color + gradient + the
// fill switcher below.
export * from "./gradient";
export { ColorPickerBase, GradientPickerBase } from "./gradient";

// Root/Tabs/Tab/Pane are plain markup (role="tablist"/"tab", no Radix
// primitive underneath) — reused unmodified from the original.
import * as React from "react";
import { Root as FillRoot } from "@/registry/new-york/ui/fill-picker/parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "@/registry/new-york/ui/fill-picker/parts/fill/tabs";
import {
  Pane as EngineFillPane,
  type PaneProps,
} from "@/registry/new-york/ui/fill-picker/parts/fill/pane";
import { GradientStopEditorContext } from "@/registry/new-york/ui/fill-picker/contexts/gradient";
import { stopEditorSlot } from "./parts/gradient/stop-editor";

export type { Fill, ColorFill, GradientFill } from "@/registry/new-york/ui/fill-picker/lib/gradient";
export { formatFill, parseFill } from "@/registry/new-york/ui/fill-picker/lib/gradient";
export { useFillPicker } from "@/registry/new-york/ui/fill-picker/hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "@/registry/new-york/ui/fill-picker/hooks/use-fill-picker";

/**
 * The engine `Pane` plus this variant's stop editor: the gradient pane owns
 * its gradient state directly (never via `<GradientPickerBase.Root>`), so a
 * `<Bar editOnClick>` nested inside it gets its editor from here.
 */
const FillPane = React.forwardRef<HTMLDivElement, PaneProps>(function Pane(
  props,
  ref,
) {
  return (
    <GradientStopEditorContext.Provider value={stopEditorSlot}>
      <EngineFillPane ref={ref} {...props} />
    </GradientStopEditorContext.Provider>
  );
});

export const FillPickerBase = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};

// Plain-name alias — see `GradientPicker` / `ColorPicker` in gradient.tsx.
export const FillPicker = FillPickerBase;

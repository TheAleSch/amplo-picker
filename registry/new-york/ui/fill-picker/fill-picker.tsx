"use client";

// Re-export the gradient-picker public surface (which itself re-exports
// color-picker), so a single import point covers the whole fill-picker
// public surface: color + gradient + the fill switcher below.
export * from "./gradient-picker";
export { ColorPicker, GradientPicker } from "./gradient-picker";

import * as React from "react";
import { Root as FillRoot } from "./parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "./parts/fill/tabs";
import { Pane as EngineFillPane, type PaneProps } from "./parts/fill/pane";
import { GradientStopEditorContext } from "./contexts/gradient";
import { stopEditorSlot } from "./parts/gradient/stop-editor-popover";

export type { Fill, ColorFill, GradientFill } from "./lib/gradient";
export { formatFill, parseFill } from "./lib/gradient";
export { useFillPicker } from "./hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "./hooks/use-fill-picker";

/**
 * The engine `Pane` plus this variant's stop editor. The gradient pane builds
 * its gradient state itself (it never goes through `<GradientPicker.Root>`),
 * so the editor a `<Bar editOnClick>` nested inside it needs is injected here
 * — same default the gradient barrel's `Root` injects.
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

export const FillPicker = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};

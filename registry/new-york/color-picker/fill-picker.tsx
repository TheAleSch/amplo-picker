"use client";

// Re-export the gradient-picker public surface (which itself re-exports
// color-picker), so a single import point covers the whole fill-picker
// public surface: color + gradient + the fill switcher below.
export * from "./gradient-picker";
export { ColorPicker, GradientPicker } from "./gradient-picker";

import { Root as FillRoot } from "./parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "./parts/fill/tabs";
import { Pane as FillPane } from "./parts/fill/pane";

export type { Fill, ColorFill, GradientFill } from "./lib/gradient";
export { formatFill, parseFill } from "./lib/gradient";
export { useFillPicker } from "./hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "./hooks/use-fill-picker";

export const FillPicker = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};

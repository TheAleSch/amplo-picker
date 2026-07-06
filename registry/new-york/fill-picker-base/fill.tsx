"use client";

// Re-export the Base UI gradient-picker public surface (which itself
// re-exports the Base UI color-picker), so a single import point covers
// the whole Base UI fill-picker public surface: color + gradient + the
// fill switcher below.
export * from "./gradient";
export { ColorPickerBase, GradientPickerBase } from "./gradient";

// Root/Tabs/Tab/Pane are plain markup (role="tablist"/"tab", no Radix
// primitive underneath) — reused unmodified from the original.
import { Root as FillRoot } from "@/registry/new-york/color-picker/parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "@/registry/new-york/color-picker/parts/fill/tabs";
import { Pane as FillPane } from "@/registry/new-york/color-picker/parts/fill/pane";

export type { Fill, ColorFill, GradientFill } from "@/registry/new-york/color-picker/lib/gradient";
export { formatFill, parseFill } from "@/registry/new-york/color-picker/lib/gradient";
export { useFillPicker } from "@/registry/new-york/color-picker/hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "@/registry/new-york/color-picker/hooks/use-fill-picker";

export const FillPickerBase = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};

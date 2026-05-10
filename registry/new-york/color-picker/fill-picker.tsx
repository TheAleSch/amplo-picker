"use client";

// Re-export everything ColorPicker exposes so a single import point covers
// the whole fill-picker public surface.
export * from "./color-picker";
export { ColorPicker } from "./color-picker";

// FillPicker shell
import { Root as FillRoot } from "./parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "./parts/fill/tabs";
import { Pane as FillPane } from "./parts/fill/pane";

// GradientPicker parts
import { Root as GradientRoot } from "./parts/gradient/root";
import { Bar } from "./parts/gradient/bar";
import { TypeSwitcher } from "./parts/gradient/type-switcher";
import { AngleDial } from "./parts/gradient/angle-dial";
import { CenterPad } from "./parts/gradient/center-pad";
import { RadialShape } from "./parts/gradient/radial-shape";
import { StopList } from "./parts/gradient/stop-list";
import { StopColor } from "./parts/gradient/stop-color";
import { InterpSwitcher } from "./parts/gradient/interp-switcher";
import { Presets, BUILTIN_GRADIENT_PRESETS } from "./parts/gradient/presets";
import { CssInput as GradientCssInput } from "./parts/gradient/css-input";

export type {
  Fill,
  ColorFill,
  GradientFill,
  Gradient,
  GradientType,
  GradientInterp,
  GradientStop,
  LinearGradient,
  RadialGradient,
  ConicGradient,
} from "./lib/gradient";
export {
  formatFill,
  parseFill,
  formatGradient,
  parseGradient,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
} from "./lib/gradient";
export { BUILTIN_GRADIENT_PRESETS };
export { useGradientPicker } from "./hooks/use-gradient-picker";
export type {
  UseGradientPickerProps,
  GradientPickerState,
} from "./hooks/use-gradient-picker";
export { useFillPicker } from "./hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "./hooks/use-fill-picker";

export const GradientPicker = {
  Root: GradientRoot,
  Bar,
  TypeSwitcher,
  AngleDial,
  CenterPad,
  RadialShape,
  StopList,
  StopColor,
  InterpSwitcher,
  Presets,
  CssInput: GradientCssInput,
};

export const FillPicker = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};

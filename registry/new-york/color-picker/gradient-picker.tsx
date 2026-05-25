"use client";

// Re-export the color-picker public surface so consumers who install
// gradient-picker get the underlying color types/hooks/parts they need
// to compose stop editors and previews.
export * from "./color-picker";
export { ColorPicker } from "./color-picker";

import { Root as GradientRoot } from "./parts/gradient/root";
import { Bar } from "./parts/gradient/bar";
import { Area as GradientArea } from "./parts/gradient/area";
import { Overlay as GradientOverlay } from "./parts/gradient/overlay";
import { TypeSwitcher } from "./parts/gradient/type-switcher";
import { ReverseStops } from "./parts/gradient/reverse-stops";
import { RepeatingToggle } from "./parts/gradient/repeating-toggle";
import { AnglePad } from "./parts/gradient/angle-pad";
import { AngleInput } from "./parts/gradient/angle-input";
import { PositionPad } from "./parts/gradient/position-pad";
import { PositionInput } from "./parts/gradient/position-input";
import { ShapeSwitcher } from "./parts/gradient/shape-switcher";
import { RadiusInput } from "./parts/gradient/radius-input";
import { EllipseRadiiInput } from "./parts/gradient/ellipse-radii-input";
import { RadialSizeSelect } from "./parts/gradient/radial-size-select";
import { StopList } from "./parts/gradient/stop-list";
import { StopColor } from "./parts/gradient/stop-color";
import { InterpSwitcher } from "./parts/gradient/interp-switcher";
import { Presets, BUILTIN_GRADIENT_PRESETS } from "./parts/gradient/presets";
import { CssInput as GradientCssInput } from "./parts/gradient/css-input";
import { PositionGroup } from "./parts/gradient/position-group";
import { AngleGroup } from "./parts/gradient/angle-group";

export type {
  Gradient,
  GradientType,
  GradientInterp,
  GradientStop,
  LinearGradient,
  RadialGradient,
  RadialSizeKeyword,
  ConicGradient,
} from "./lib/gradient";
export {
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

export const GradientPicker = {
  Root: GradientRoot,
  Bar,
  Area: GradientArea,
  Overlay: GradientOverlay,
  TypeSwitcher,
  ReverseStops,
  RepeatingToggle,
  AnglePad,
  AngleInput,
  PositionPad,
  PositionInput,
  ShapeSwitcher,
  RadiusInput,
  EllipseRadiiInput,
  RadialSizeSelect,
  StopList,
  StopColor,
  InterpSwitcher,
  Presets,
  CssInput: GradientCssInput,
  PositionGroup,
  AngleGroup,
};

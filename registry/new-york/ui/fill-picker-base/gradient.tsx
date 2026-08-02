"use client";

// Base UI variant of the gradient picker.
//
// Mirrors `registry/new-york/ui/fill-picker/gradient-picker.tsx`'s public
// surface. Only the parts that touch Radix/shadcn primitives directly are
// rewritten on Base UI:
//   - TypeSwitcher, InterpSwitcher, RadialSizeSelect → Select
//   - ReverseStops                                   → plain button
//   - StopList                                       → plain button (+
//     the shared field shell), re-exported from the original (see
//     stop-list.tsx for why)
//   - the per-stop color editor → ./parts/gradient/stop-editor, injected
//     below through the `stopEditor` slot. Both `<Bar editOnClick>` and
//     `<StopList>` rows read that slot instead of importing an editor, so
//     they stay dialect-free and open *this* variant's editor here.
//
// Everything else (Root/context, Bar, Area, Overlay, ShapeSwitcher, the
// pad/input/group parts, StopColor, Presets, CssInput, RepeatingToggle) is
// pure pointer/canvas logic or plain markup with zero Radix dependency, so
// it's imported straight from the original — a single source of truth for
// engine fixes.

import * as React from "react";
import { ColorPickerBase } from "./color-picker";

import {
  Root as EngineGradientRoot,
  type RootProps as GradientRootProps,
} from "@/registry/new-york/ui/fill-picker/parts/gradient/root";
import { Bar } from "@/registry/new-york/ui/fill-picker/parts/gradient/bar";
import { Area as GradientArea } from "@/registry/new-york/ui/fill-picker/parts/gradient/area";
import { Overlay as GradientOverlay } from "@/registry/new-york/ui/fill-picker/parts/gradient/overlay";
import { RepeatingToggle } from "@/registry/new-york/ui/fill-picker/parts/gradient/repeating-toggle";
import { AnglePad } from "@/registry/new-york/ui/fill-picker/parts/gradient/angle-pad";
import { AngleInput } from "@/registry/new-york/ui/fill-picker/parts/gradient/angle-input";
import { PositionPad } from "@/registry/new-york/ui/fill-picker/parts/gradient/position-pad";
import { PositionInput } from "@/registry/new-york/ui/fill-picker/parts/gradient/position-input";
import { ShapeSwitcher } from "@/registry/new-york/ui/fill-picker/parts/gradient/shape-switcher";
import { RadiusInput } from "@/registry/new-york/ui/fill-picker/parts/gradient/radius-input";
import { EllipseRadiiInput } from "@/registry/new-york/ui/fill-picker/parts/gradient/ellipse-radii-input";
import { StopColor } from "@/registry/new-york/ui/fill-picker/parts/gradient/stop-color";
import { Presets, BUILTIN_GRADIENT_PRESETS } from "@/registry/new-york/ui/fill-picker/parts/gradient/presets";
import { CssInput as GradientCssInput } from "@/registry/new-york/ui/fill-picker/parts/gradient/css-input";
import { PositionGroup } from "@/registry/new-york/ui/fill-picker/parts/gradient/position-group";
import { AngleGroup } from "@/registry/new-york/ui/fill-picker/parts/gradient/angle-group";

import { TypeSwitcher } from "./parts/gradient/type-switcher";
import { ReverseStops } from "./parts/gradient/reverse-stops";
import { StopList } from "./parts/gradient/stop-list";
import { InterpSwitcher } from "./parts/gradient/interp-switcher";
import { RadialSizeSelect } from "./parts/gradient/radial-size-select";
import { stopEditorSlot } from "./parts/gradient/stop-editor";

export type {
  Gradient,
  GradientType,
  GradientInterp,
  GradientStop,
  LinearGradient,
  RadialGradient,
  RadialSizeKeyword,
  ConicGradient,
} from "@/registry/new-york/ui/fill-picker/lib/gradient";
export {
  formatGradient,
  parseGradient,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
} from "@/registry/new-york/ui/fill-picker/lib/gradient";
export { BUILTIN_GRADIENT_PRESETS };
export { useGradientPicker } from "@/registry/new-york/ui/fill-picker/hooks/use-gradient-picker";
export type {
  UseGradientPickerProps,
  GradientPickerState,
} from "@/registry/new-york/ui/fill-picker/hooks/use-gradient-picker";

// The gradient context surface, re-exported so the barrel is a complete
// entry point for anyone composing custom gradient parts (a part needs
// `useGradientPickerContext` to read state, and `GradientStopEditor*` to
// fill the stop-editor slot). This also keeps the barrel self-consistent
// with how the shadcn CLI rewrites installed imports: its import-fixup pass
// resolves an aliased specifier by file BASENAME and prefers a `.tsx`
// candidate over a `.ts` one, so `.../fill-picker/contexts/gradient.ts`
// gets redirected to this file (`fill-picker-base/gradient.tsx`) in a
// consumer project. Export-from specifiers are exempt from that pass, so
// the re-exports below stay pointed at the real module.
export {
  GradientPickerContext,
  GradientStopEditorContext,
  useGradientPickerContext,
  useGradientStopEditor,
} from "@/registry/new-york/ui/fill-picker/contexts/gradient";
export type { GradientStopEditorRenderer } from "@/registry/new-york/ui/fill-picker/contexts/gradient";

export { ColorPickerBase };

/**
 * The engine `Root` plus this variant's stop editor (Base UI Hue/Alpha/
 * FormatSwitcher/ChannelInput inside the shared popover shell). The Bar
 * imports no editor of its own — it renders whatever is injected here.
 */
const GradientRoot = React.forwardRef<HTMLDivElement, GradientRootProps>(
  function Root({ stopEditor = stopEditorSlot, ...props }, ref) {
    return <EngineGradientRoot ref={ref} stopEditor={stopEditor} {...props} />;
  },
);

export const GradientPickerBase = {
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

// Plain-name aliases so consumers (and docs snippets) can swap variants by
// changing only the import path — mirrors `ColorPicker` in color-picker.tsx.
export const GradientPicker = GradientPickerBase;
export { ColorPicker } from "./color-picker";

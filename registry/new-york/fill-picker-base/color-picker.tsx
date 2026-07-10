"use client";

// Base UI variant of the color picker.
//
// Reuses the engine + presentational parts from the original color-picker.
// Only the parts that benefit from Base UI primitives are rewritten:
//   - Hue, Lightness, Alpha → Slider
//   - FormatSwitcher        → Select
//   - ChannelInput          → NumberField (per channel)
//   - Swatches              → RadioGroup + Radio
//
// Everything else (Root/context, Area canvas, Chroma, GamutBadge, ContrastReadout,
// Preview, EyeDropper, CssInput) is identical to the original; importing
// from the same source means engine fixes propagate to both variants for
// free.

import { Root } from "@/registry/new-york/color-picker/parts/root";
import { Area } from "@/registry/new-york/color-picker/parts/area";
import { Chroma } from "@/registry/new-york/color-picker/parts/chroma";
import { CssInput } from "@/registry/new-york/color-picker/parts/css-input";
import { GamutBadge } from "@/registry/new-york/color-picker/parts/gamut-badge";
import { ContrastReadout } from "@/registry/new-york/color-picker/parts/contrast-readout";
import { Preview } from "@/registry/new-york/color-picker/parts/preview";
import { EyeDropper } from "@/registry/new-york/color-picker/parts/eye-dropper";

import { Hue } from "./parts/hue";
import { Lightness } from "./parts/lightness";
import { Alpha } from "./parts/alpha";
import { FormatSwitcher } from "./parts/format-switcher";
import { ChannelInput } from "./parts/channel-input";
import { Swatches } from "./parts/swatches";

export type {
  ColorFormat,
  OklchColor,
  GamutInfo,
  ContrastResult,
  Gamut,
} from "@/registry/new-york/color-picker/lib/types";
export type {
  UseColorPickerProps,
  ColorPickerState,
} from "@/registry/new-york/color-picker/hooks/use-color-picker";
export { useColorPicker } from "@/registry/new-york/color-picker/hooks/use-color-picker";
export {
  parseColor,
  formatColor,
  formatAll,
  gamutInfo,
  toGamut,
  contrast,
  apcaContrast,
  isValidColor,
} from "@/registry/new-york/color-picker/lib/color";
export {
  colorChannels,
  setColorChannel,
} from "@/registry/new-york/color-picker/lib/channels";
export type { ChannelDescriptor } from "@/registry/new-york/color-picker/lib/channels";

export const ColorPickerBase = {
  Root,
  Area,
  Chroma,
  Hue,
  Lightness,
  Alpha,
  CssInput,
  FormatSwitcher,
  ChannelInput,
  Swatches,
  GamutBadge,
  ContrastReadout,
  Preview,
  EyeDropper,
};

// Alias so consuming code reads the same as the Radix variant — only the
// import path differs (`.../fill-picker-base/color-picker`).
export const ColorPicker = ColorPickerBase;

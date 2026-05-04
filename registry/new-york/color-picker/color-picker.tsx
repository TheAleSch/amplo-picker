"use client";

import * as React from "react";
import { Root, type RootProps } from "./parts/root";
import { Area, type AreaProps } from "./parts/area";
import { Hue } from "./parts/hue";
import { Alpha } from "./parts/alpha";
import { Input } from "./parts/input";
import { FormatSwitcher } from "./parts/format-switcher";
import { Swatches } from "./parts/swatches";
import { GamutBadge } from "./parts/gamut-badge";
import { ContrastReadout } from "./parts/contrast-readout";
import { Preview } from "./parts/preview";
import { EyeDropper } from "./parts/eye-dropper";

export type { ColorFormat, OklchColor, GamutInfo, ContrastResult, Gamut } from "./lib/types";
export type { UseColorPickerProps, ColorPickerState } from "./hooks/use-color-picker";
export { useColorPicker } from "./hooks/use-color-picker";
export { parseColor, formatColor, gamutInfo, toGamut, contrast, apcaContrast, isValidColor } from "./lib/color";

export interface ColorPickerProps extends RootProps {
  areaMode?: AreaProps["mode"];
  /** When set, hides the EyeDropper button regardless of browser support. */
  hideEyeDropper?: boolean;
  /** Render APCA contrast value alongside WCAG. */
  apca?: boolean;
}

/**
 * Default styled color picker. Renders the full canonical layout.
 * For composition, use <ColorPicker.Root> + the named parts directly.
 */
function DefaultColorPicker({
  areaMode = "oklch-cl",
  hideEyeDropper,
  apca,
  children,
  ...rootProps
}: ColorPickerProps) {
  if (children !== undefined) {
    return <Root {...rootProps}>{children}</Root>;
  }
  return (
    <Root {...rootProps}>
      <Area mode={areaMode} />
      <div className="flex items-center gap-2">
        <Preview />
        <div className="flex flex-1 flex-col gap-1.5">
          <Hue />
          <Alpha />
        </div>
        {!hideEyeDropper && <EyeDropper />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <FormatSwitcher />
        <GamutBadge />
      </div>
      <Input />
      <ContrastReadout metrics={apca ? ["wcag", "apca"] : ["wcag"]} />
      <Swatches />
    </Root>
  );
}

export const ColorPicker = Object.assign(DefaultColorPicker, {
  Root,
  Area,
  Hue,
  Alpha,
  Input,
  FormatSwitcher,
  Swatches,
  GamutBadge,
  ContrastReadout,
  Preview,
  EyeDropper,
});

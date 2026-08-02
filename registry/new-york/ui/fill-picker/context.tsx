"use client";

import * as React from "react";
import type { ColorPickerState } from "./hooks/use-color-picker";

export const ColorPickerContext = React.createContext<ColorPickerState | null>(null);

export function useColorPickerContext(): ColorPickerState {
  const ctx = React.useContext(ColorPickerContext);
  if (!ctx) {
    throw new Error(
      "ColorPicker.* parts must be rendered inside <ColorPicker> (or <ColorPicker.Root>)",
    );
  }
  return ctx;
}

"use client";

import * as React from "react";
import type { FillPickerState } from "../hooks/use-fill-picker";

export const FillPickerContext = React.createContext<FillPickerState | null>(null);

export function useFillPickerContext(): FillPickerState {
  const ctx = React.useContext(FillPickerContext);
  if (!ctx) {
    throw new Error(
      "FillPicker.Tabs / Tab / Pane must be rendered inside <FillPicker.Root>",
    );
  }
  return ctx;
}

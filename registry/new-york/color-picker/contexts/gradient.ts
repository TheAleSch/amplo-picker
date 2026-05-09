"use client";

import * as React from "react";
import type { GradientPickerState } from "../hooks/use-gradient-picker";

export const GradientPickerContext =
  React.createContext<GradientPickerState | null>(null);

export function useGradientPickerContext(): GradientPickerState {
  const ctx = React.useContext(GradientPickerContext);
  if (!ctx) {
    throw new Error(
      "GradientPicker.* parts must be rendered inside <GradientPicker.Root> " +
        "or <FillPicker.Pane mode=\"gradient\">",
    );
  }
  return ctx;
}

"use client";

import * as React from "react";
import type { FillPickerState } from "../hooks/use-fill-picker";

export const FillPickerContext = React.createContext<FillPickerState | null>(null);

/**
 * Stable id prefix provided by <FillPicker.Root> so Tab (`aria-controls`)
 * and Pane (`aria-labelledby`) can reference each other across the tree.
 */
export const FillPickerIdContext = React.createContext<string>("fill-picker");

export const fillTabId = (base: string, mode: string) => `${base}-tab-${mode}`;
export const fillPaneId = (base: string, mode: string) => `${base}-pane-${mode}`;

export function useFillPickerContext(): FillPickerState {
  const ctx = React.useContext(FillPickerContext);
  if (!ctx) {
    throw new Error(
      "FillPicker.Tabs / Tab / Pane must be rendered inside <FillPicker.Root>",
    );
  }
  return ctx;
}

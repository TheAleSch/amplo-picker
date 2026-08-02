"use client";

import * as React from "react";
import type { GradientPickerState } from "../hooks/use-gradient-picker";

export const GradientPickerContext =
  React.createContext<GradientPickerState | null>(null);

/**
 * Renders the per-stop color editor for `<GradientPicker.Bar editOnClick>`.
 *
 * The Bar owns the *interaction* (which stop is being edited, and when a tap
 * counts as an edit) but not the editor's UI dialect — that ships per variant
 * so the shared Bar can live in a dialect-clean engine item. Each barrel
 * injects its own default through `<Root stopEditor>`; consumers can override
 * it with the same prop.
 *
 * `children` is the stop handle: the renderer must render it (that's the
 * element the popover anchors to and the element the user drags).
 *
 * Called as a plain function inside the parts' stop `.map()`, not mounted as
 * JSX — so it must *return* a component element and never call hooks itself,
 * or the hook order breaks the moment a stop is added or removed.
 */
export type GradientStopEditorRenderer = (props: {
  stopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The stop handle element to anchor/wrap. */
  children: React.ReactNode;
}) => React.ReactNode;

/**
 * Carried separately from `GradientPickerContext` on purpose: the gradient
 * state is also provided by `<FillPicker.Pane mode="gradient">`, which builds
 * it straight from `useGradientPicker` and never sees a `stopEditor` prop.
 * A sibling context lets a barrel inject the default once, above either
 * provider, without threading the renderer through the headless state.
 */
export const GradientStopEditorContext =
  React.createContext<GradientStopEditorRenderer | null>(null);

/** The injected stop editor, or `null` when no barrel/consumer provided one. */
export function useGradientStopEditor(): GradientStopEditorRenderer | null {
  return React.useContext(GradientStopEditorContext);
}

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

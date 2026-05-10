"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ColorPickerContext } from "../../context";
import { GradientPickerContext } from "../../contexts/gradient";
import { useFillPickerContext } from "../../contexts/fill";
import { useColorPicker } from "../../hooks/use-color-picker";
import { useGradientPicker } from "../../hooks/use-gradient-picker";
import type { FillMode } from "../../hooks/use-fill-picker";
import { DEFAULT_LINEAR, type Gradient } from "../../lib/gradient";
import type { OklchColor } from "../../lib/types";

export interface PaneProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: FillMode;
}

export const Pane = React.forwardRef<HTMLDivElement, PaneProps>(function Pane(
  { mode, className, children, ...rest },
  ref,
) {
  const fill = useFillPickerContext();
  if (fill.mode !== mode) return null;

  if (mode === "color") {
    return (
      <ColorPaneInner ref={ref} className={className} {...rest}>
        {children}
      </ColorPaneInner>
    );
  }
  return (
    <GradientPaneInner ref={ref} className={className} {...rest}>
      {children}
    </GradientPaneInner>
  );
});

const ColorPaneInner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ColorPaneInner({ className, children, ...rest }, ref) {
  const fill = useFillPickerContext();
  const colorValue: OklchColor =
    fill.fill.kind === "color"
      ? fill.fill.color
      : { l: 0, c: 0, h: 0, alpha: 1 };

  const setFillRef = React.useRef(fill.setFill);
  React.useEffect(() => {
    setFillRef.current = fill.setFill;
  });
  const onValueChange = React.useCallback((color: OklchColor) => {
    setFillRef.current({ kind: "color", color });
  }, []);

  const state = useColorPicker({ value: colorValue, onValueChange });

  return (
    <ColorPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker-pane"
        data-mode="color"
        className={cn(className)}
        {...rest}
      >
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
});

const GradientPaneInner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function GradientPaneInner({ className, children, ...rest }, ref) {
  const fill = useFillPickerContext();
  const gradientValue: Gradient =
    fill.fill.kind === "gradient" ? fill.fill.gradient : DEFAULT_LINEAR;

  const setFillRef = React.useRef(fill.setFill);
  React.useEffect(() => {
    setFillRef.current = fill.setFill;
  });
  const onValueChange = React.useCallback((gradient: Gradient) => {
    setFillRef.current({ kind: "gradient", gradient });
  }, []);

  const state = useGradientPicker({ value: gradientValue, onValueChange });

  return (
    <GradientPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker-pane"
        data-mode="gradient"
        className={cn(className)}
        {...rest}
      >
        {children}
      </div>
    </GradientPickerContext.Provider>
  );
});

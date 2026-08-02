"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ColorPickerContext } from "../../context";
import { GradientPickerContext } from "../../contexts/gradient";
import {
  fillPaneId,
  fillTabId,
  FillPickerIdContext,
  useFillPickerContext,
} from "../../contexts/fill";
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
  const idBase = React.useContext(FillPickerIdContext);
  if (fill.mode !== mode) return null;

  // APG tabpanel wiring: named by its tab, referenced by aria-controls.
  const panelProps = {
    role: "tabpanel" as const,
    id: fillPaneId(idBase, mode),
    "aria-labelledby": fillTabId(idBase, mode),
  };

  if (mode === "color") {
    return (
      <ColorPaneInner ref={ref} className={className} {...panelProps} {...rest}>
        {children}
      </ColorPaneInner>
    );
  }
  return (
    <GradientPaneInner ref={ref} className={className} {...panelProps} {...rest}>
      {children}
    </GradientPaneInner>
  );
});

/**
 * Tiny mount-fade hook. Pane swaps unmount one tree and mount another;
 * starting at opacity 0 and flipping to 1 on the next frame gives a
 * dependency-free crossfade. Two RAFs because a single one can land in
 * the same browser tick as the React commit on some engines.
 */
function useMountFade() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return visible;
}

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
  setFillRef.current = fill.setFill;
  const onValueChange = React.useCallback((color: OklchColor) => {
    setFillRef.current({ kind: "color", color });
  }, []);

  const state = useColorPicker({ value: colorValue, onValueChange });
  const visible = useMountFade();

  return (
    <ColorPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker-pane"
        data-mode="color"
        className={cn(
          "transition-opacity duration-300 ease-in",
          visible ? "opacity-100" : "opacity-0",
          className,
        )}
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
  setFillRef.current = fill.setFill;
  const onValueChange = React.useCallback((gradient: Gradient) => {
    setFillRef.current({ kind: "gradient", gradient });
  }, []);

  const state = useGradientPicker({ value: gradientValue, onValueChange });
  const visible = useMountFade();

  return (
    <GradientPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker-pane"
        data-mode="gradient"
        className={cn(
          "transition-opacity duration-300 ease-in",
          visible ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </GradientPickerContext.Provider>
  );
});

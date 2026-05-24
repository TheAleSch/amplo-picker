"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FillPickerContext } from "../../contexts/fill";
import {
  useFillPicker,
  type UseFillPickerProps,
} from "../../hooks/use-fill-picker";

export interface RootProps
  extends UseFillPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  {
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
    className,
    children,
    ...rest
  },
  ref,
) {
  const state = useFillPicker({
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
  });

  // Animate the Root's height as panes swap between Solid and Gradient
  // (and as the gradient pane itself grows/shrinks with shape controls).
  // Pure CSS `transition: height` can't animate to/from `auto`, so we
  // observe the live content height via ResizeObserver and pin it as an
  // inline pixel value — the transition takes care of the rest. No
  // dependencies, no measurement pass: the observer fires the moment
  // React commits the new tree.
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [innerHeight, setInnerHeight] = React.useState<number | null>(null);
  React.useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      // border-box so padding inside `innerRef` is included.
      const box = entry.borderBoxSize?.[0];
      setInnerHeight(box ? box.blockSize : entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Skip the very first commit so the picker mounts at its natural
  // height instead of animating up from 0.
  const animateRef = React.useRef(false);
  React.useEffect(() => {
    if (innerHeight !== null) animateRef.current = true;
  }, [innerHeight]);
  return (
    <FillPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker"
        className={cn(
          "w-full max-w-70 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-sm",
          animateRef.current &&
            "transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          className,
        )}
        {...rest}
        style={
          innerHeight !== null ? { height: innerHeight, ...rest.style } : rest.style
        }
      >
        <div ref={innerRef} className="flex flex-col gap-2 p-3">
          {children}
        </div>
      </div>
    </FillPickerContext.Provider>
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { RadialSizeKeyword } from "../../lib/gradient";

const SIZE_OPTIONS: RadialSizeKeyword[] = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
];

export const RadialShape = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function RadialShape({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  const g = ctx.gradient;

  return (
    <div
      ref={ref}
      data-slot="gradient-radial-shape"
      className={cn("flex items-center gap-2", className)}
      {...rest}
    >
      <div role="tablist" aria-label="Radial shape" className="inline-flex rounded-md bg-muted p-1">
        {(["circle", "ellipse"] as const).map((shape) => {
          const active = g.shape === shape;
          return (
            <button
              key={shape}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => ctx.setRadialShape(shape)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {shape}
            </button>
          );
        })}
      </div>
      <select
        value={g.size}
        onChange={(e) => ctx.setRadialSize(e.target.value as RadialSizeKeyword)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        aria-label="Radial size"
      >
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
});

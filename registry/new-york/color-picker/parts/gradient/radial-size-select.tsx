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

export const RadialSizeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function RadialSizeSelect({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  return (
    <select
      ref={ref}
      data-slot="gradient-radial-size-select"
      value={ctx.gradient.size}
      onChange={(e) => ctx.setRadialSize(e.target.value as RadialSizeKeyword)}
      aria-label="Radial size"
      className={cn(
        "h-8 rounded-md border border-border bg-background px-2 text-xs",
        className,
      )}
      {...rest}
    >
      {SIZE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";

const OPTIONS: { value: GradientInterp; label: string }[] = [
  { value: "oklch", label: "OKLCH" },
  { value: "oklab", label: "OKLab" },
  { value: "srgb", label: "sRGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsl-longer", label: "HSL (longer hue)" },
];

export const InterpSwitcher = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function InterpSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <select
      ref={ref}
      value={ctx.gradient.interp}
      onChange={(e) => ctx.setInterp(e.target.value as GradientInterp)}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-background px-2 text-xs",
        className,
      )}
      aria-label="Interpolation space"
      {...rest}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

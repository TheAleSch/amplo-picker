"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";

/**
 * Selectable interpolation spaces. Each maps to the CSS Color 4
 * `<gradient> in <space>` clause emitted by `formatGradient`.
 *
 * - `oklch`      → `in oklch` — perceptually uniform; smooth hue arc, no muddy mids.
 * - `oklab`      → `in oklab` — perceptual but cartesian; straight line through OK space.
 * - `srgb`       → `in srgb`  — legacy browser default; often grays in the middle.
 * - `hsl`        → `in hsl`   — walks the hue circle the *shorter* way.
 * - `hsl-longer` → `in hsl longer hue` — walks the hue circle the *longer* way (rainbow sweep).
 */
const OPTIONS: { value: GradientInterp; label: string }[] = [
  { value: "oklch", label: "OKLCH" },
  { value: "oklab", label: "OKLab" },
  { value: "srgb", label: "sRGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsl-longer", label: "HSL (longer hue)" },
];

/**
 * Native `<select>` bound to the active gradient's `interp` property.
 *
 * Reads `gradient.interp` from `<GradientPicker.Root>` context and dispatches
 * `setInterp` on change. Only the *blending math between stops* changes — stop
 * positions and stop colors stay identical. Switching does not mutate any stop.
 *
 * Forwards a ref to the underlying `<select>` and accepts every standard
 * `SelectHTMLAttributes` prop (e.g. `className`, `disabled`, `onBlur`,
 * `aria-describedby`). Internally fixes `value`, `onChange`, and `aria-label`;
 * passing those is harmless but they will be overwritten.
 *
 * Must render inside `<GradientPicker.Root>` — throws otherwise.
 */
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

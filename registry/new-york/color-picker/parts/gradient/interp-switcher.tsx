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
 * Styled to match the shadcn new-york `<select>` look shared with
 * `<ColorPicker.FormatSwitcher>` and `<GradientPicker.TypeSwitcher>` —
 * same height, border, chevron, and focus ring.
 *
 * Forwards a ref to the underlying `<select>` and accepts every standard
 * `SelectHTMLAttributes` prop. Internally fixes `value`, `onChange`, and
 * `aria-label`; passing those is harmless but they will be overwritten.
 *
 * Must render inside `<GradientPicker.Root>` — throws otherwise.
 */
export const InterpSwitcher = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function InterpSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <div
      data-slot="gradient-interp-switcher"
      className={cn("relative inline-flex w-full items-center", className)}
    >
      <select
        ref={ref}
        data-slot="gradient-interp-switcher-select"
        aria-label="Interpolation space"
        value={ctx.gradient.interp}
        onChange={(e) => ctx.setInterp(e.target.value as GradientInterp)}
        className={cn(
          "h-8 w-full appearance-none rounded-md border border-input bg-transparent pl-2.5 pr-7 text-xs font-medium shadow-xs outline-none",
          "focus-visible:ring-1 focus-visible:ring-ring",
          "cursor-pointer",
        )}
        {...rest}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-2 size-3 text-muted-foreground"
      >
        <path
          d="M3 4.5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

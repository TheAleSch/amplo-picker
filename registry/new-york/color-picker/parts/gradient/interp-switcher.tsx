"use client";

import * as React from "react";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";
import { FieldSelect } from "../field";

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
 * Built on `<FieldSelect>` so it shares its border, focus ring, font, and
 * chevron with every other select in the picker.
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
    <FieldSelect
      ref={ref}
      data-slot="gradient-interp-switcher-select"
      aria-label="Interpolation space"
      value={ctx.gradient.interp}
      onChange={(e) => ctx.setInterp(e.target.value as GradientInterp)}
      className="w-full"
      wrapperProps={{
        "data-slot": "gradient-interp-switcher",
        className: cn("w-full", className),
      }}
      {...rest}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </FieldSelect>
  );
});

function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

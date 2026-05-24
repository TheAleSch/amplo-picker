"use client";

import * as React from "react";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientType } from "../../lib/gradient";
import { FieldSelect } from "../field";

const TYPES: { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

/**
 * Native `<select>` bound to `gradient.type`. Built on `<FieldSelect>`
 * so it shares its border, focus ring, font, and chevron with every other
 * select in the picker (`<ColorPicker.FormatSwitcher>`,
 * `<GradientPicker.InterpSwitcher>`, `<GradientPicker.RadialSizeSelect>`).
 *
 * Width is intrinsic (not `w-full`) so it can sit next to icon buttons like
 * `<GradientPicker.ReverseStops>` without stretching to fill the row.
 */
export const TypeSwitcher = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function TypeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <FieldSelect
      ref={ref}
      data-slot="gradient-type-switcher-select"
      aria-label="Gradient type"
      value={ctx.gradient.type}
      onChange={(e) => ctx.setType(e.target.value as GradientType)}
      className="normal-case"
      wrapperProps={{
        "data-slot": "gradient-type-switcher",
        className,
      }}
      {...rest}
    >
      {TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </FieldSelect>
  );
});

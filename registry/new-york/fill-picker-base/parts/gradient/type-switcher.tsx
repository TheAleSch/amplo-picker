"use client";

import * as React from "react";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";
import type { GradientType } from "@/registry/new-york/color-picker/lib/gradient";
import { FieldSelect, FieldSelectItem } from "./field";

const TYPES: { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

/**
 * Base UI port of `<GradientPicker.TypeSwitcher>`. Bound to `gradient.type`.
 * Built on `<FieldSelect>` (Base UI `Select` under the hood) so it shares
 * its border, focus ring, font, and chevron with every other dropdown in
 * the Base UI picker.
 *
 * Width is intrinsic (not `w-full`) so it can sit next to icon buttons
 * like `<GradientPickerBase.ReverseStops>` without stretching the row.
 */
export const TypeSwitcher = React.forwardRef<
  HTMLButtonElement,
  { className?: string }
>(function TypeSwitcher({ className }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <FieldSelect
      ref={ref}
      aria-label="Gradient type"
      value={ctx.gradient.type}
      onValueChange={(v) => ctx.setType(v as GradientType)}
      wrapperProps={{
        "data-slot": "gradient-type-switcher",
        className,
      }}
    >
      {TYPES.map((t) => (
        <FieldSelectItem key={t.value} value={t.value}>
          {t.label}
        </FieldSelectItem>
      ))}
    </FieldSelect>
  );
});

"use client";

import * as React from "react";
import { SelectItem } from "@/components/ui/select";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientType } from "../../lib/gradient";
import { FieldSelect } from "../field";
import { GRADIENT_TYPE_OPTIONS } from "../../lib/gradient-options";

const TYPES = GRADIENT_TYPE_OPTIONS;

/**
 * Bound to `gradient.type`. Built on `<FieldSelect>` (shadcn `<Select>`
 * under the hood) so it shares its border, focus ring, font, and chevron
 * with every other dropdown in the picker.
 *
 * Width is intrinsic (not `w-full`) so it can sit next to icon buttons
 * like `<GradientPicker.ReverseStops>` without stretching the row.
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
        <SelectItem key={t.value} value={t.value}>
          {t.label}
        </SelectItem>
      ))}
    </FieldSelect>
  );
});

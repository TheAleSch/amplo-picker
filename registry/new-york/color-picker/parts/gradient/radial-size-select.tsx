"use client";

import * as React from "react";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { RadialSizeKeyword } from "../../lib/gradient";
import { FieldSelect } from "../field";

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
    <FieldSelect
      ref={ref}
      data-slot="gradient-radial-size-select"
      aria-label="Radial size"
      value={ctx.gradient.size}
      onChange={(e) => ctx.setRadialSize(e.target.value as RadialSizeKeyword)}
      wrapperProps={{ className }}
      {...rest}
    >
      {SIZE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </FieldSelect>
  );
});

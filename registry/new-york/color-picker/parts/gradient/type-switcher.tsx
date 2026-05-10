"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientType } from "../../lib/gradient";

const TYPES: { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

/**
 * Compact native `<select>` bound to `gradient.type`. Renders as a small
 * inline trigger ("Linear ▾") so it sits naturally next to icon-button
 * controls like `<GradientPicker.ReverseStops>`. The native `<select>` sits
 * on top of the visual chip with `opacity:0` so the OS chooser still opens
 * on click + arrow keys + screen reader interaction.
 */
export const TypeSwitcher = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function TypeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  const current =
    TYPES.find((t) => t.value === ctx.gradient.type) ?? TYPES[0];

  return (
    <span
      data-slot="gradient-type-switcher"
      className={cn(
        "relative inline-flex items-center gap-1 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span aria-hidden="true">{current.label}</span>
      <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
      <select
        ref={ref}
        value={ctx.gradient.type}
        onChange={(e) => ctx.setType(e.target.value as GradientType)}
        aria-label="Gradient type"
        className="absolute inset-0 cursor-pointer opacity-0 outline-none"
        {...rest}
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </span>
  );
});

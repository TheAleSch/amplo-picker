"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientType } from "../../lib/gradient";

const TYPES: { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

/**
 * Native `<select>` bound to `gradient.type`. Styled to match the shadcn
 * new-york `<select>` look used by `<ColorPicker.FormatSwitcher>` and
 * `<GradientPicker.InterpSwitcher>` — same height, border, chevron, and
 * focus ring — so all three controls line up visually side by side.
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
    <div
      data-slot="gradient-type-switcher"
      className={cn("relative inline-flex items-center", className)}
    >
      <select
        ref={ref}
        data-slot="gradient-type-switcher-select"
        aria-label="Gradient type"
        value={ctx.gradient.type}
        onChange={(e) => ctx.setType(e.target.value as GradientType)}
        className={cn(
          "h-8 appearance-none rounded-md border border-input bg-transparent pl-2.5 pr-7 text-xs font-medium shadow-xs outline-none",
          "focus-visible:ring-1 focus-visible:ring-ring",
          "cursor-pointer",
        )}
        {...rest}
      >
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
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

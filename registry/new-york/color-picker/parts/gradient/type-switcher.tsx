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

export const TypeSwitcher = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function TypeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <div
      ref={ref}
      data-slot="gradient-type-switcher"
      role="tablist"
      aria-label="Gradient type"
      className={cn("inline-flex w-full rounded-md bg-muted p-1", className)}
      {...rest}
    >
      {TYPES.map((t) => {
        const active = ctx.gradient.type === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => ctx.setType(t.value)}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
});

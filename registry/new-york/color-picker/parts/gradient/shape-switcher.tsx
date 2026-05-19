"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

const OPTIONS = [
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipses" },
] as const;

export const ShapeSwitcher = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ShapeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  const current = ctx.gradient.shape;

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Radial gradient shape"
      data-slot="gradient-shape-switcher"
      className={cn(
        "inline-flex w-full rounded-md bg-muted p-[3px] gap-[2px]",
        className,
      )}
      {...rest}
    >
      {OPTIONS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => ctx.setRadialShape(value)}
            className={cn(
              "flex-1 rounded-sm px-3 py-1 text-xs font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});

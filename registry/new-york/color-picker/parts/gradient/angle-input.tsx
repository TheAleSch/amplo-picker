"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const AngleInput = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(function AngleInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "radial") return null;

  const angle =
    ctx.gradient.type === "linear"
      ? ctx.gradient.angle
      : ctx.gradient.startAngle;
  const setAngle =
    ctx.gradient.type === "linear" ? ctx.setAngle : ctx.setStartAngle;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    if (Number.isFinite(n)) setAngle(((n % 360) + 360) % 360);
  };

  return (
    <label
      ref={ref}
      data-slot="gradient-angle-input"
      className={cn(
        "inline-flex h-12 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        max={360}
        step={1}
        value={Math.round(angle)}
        onChange={onChange}
        aria-label="Gradient angle in degrees"
        className="w-16 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      />
      <span className="text-muted-foreground">°</span>
    </label>
  );
});

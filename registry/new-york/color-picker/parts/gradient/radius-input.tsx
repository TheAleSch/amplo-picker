"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const RadiusInput = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(function RadiusInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "circle") return null;
  const g = ctx.gradient;
  const usePercent = !!ctx.containerWidth;
  const display = (() => {
    if (g.radiusPx === undefined) return "";
    return usePercent
      ? Math.round((g.radiusPx / (ctx.containerWidth as number)) * 100)
      : Math.round(g.radiusPx);
  })();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "") {
      ctx.setRadiusPx(undefined);
      return;
    }
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return;
    if (!usePercent) {
      ctx.setRadiusPx(Math.max(0, n));
      return;
    }
    ctx.setRadiusPx(Math.max(0, (n / 100) * (ctx.containerWidth as number)));
  };

  return (
    <label
      ref={ref}
      data-slot="gradient-radius-input"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        step={1}
        value={display}
        placeholder="auto"
        onChange={onChange}
        aria-label={
          usePercent
            ? "Circle radius as percent of Area width"
            : "Circle radius in pixels"
        }
        className="w-12 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      />
      <span className="text-muted-foreground">{usePercent ? "%" : "px"}</span>
    </label>
  );
});

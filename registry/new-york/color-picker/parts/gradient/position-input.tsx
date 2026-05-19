"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const PositionInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PositionInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "linear") return null;
  const center = ctx.gradient.center;

  const commit = (axis: "x" | "y", raw: string) => {
    if (raw === "") return;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    const clamp = (v: number) => Math.max(0, Math.min(1, v / 100));
    ctx.setCenter(
      axis === "x"
        ? { x: clamp(n), y: center.y }
        : { x: center.x, y: clamp(n) },
    );
  };

  return (
    <div
      ref={ref}
      data-slot="gradient-position-input"
      className={cn(
        "inline-flex items-center gap-0 rounded-md border border-border bg-background text-xs text-foreground",
        className,
      )}
      {...rest}
    >
      <label className="inline-flex items-center gap-1 px-2 py-1">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(center.x * 100)}
          onChange={(e) => commit("x", e.target.value)}
          aria-label="Gradient center x percent"
          className="w-10 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        />
        <span className="text-muted-foreground">%</span>
      </label>
      <span aria-hidden className="h-4 w-px bg-border" />
      <label className="inline-flex items-center gap-1 px-2 py-1">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(center.y * 100)}
          onChange={(e) => commit("y", e.target.value)}
          aria-label="Gradient center y percent"
          className="w-10 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        />
        <span className="text-muted-foreground">%</span>
      </label>
    </div>
  );
});

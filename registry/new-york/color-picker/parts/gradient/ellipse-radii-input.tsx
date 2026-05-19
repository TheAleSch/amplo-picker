"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const EllipseRadiiInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function EllipseRadiiInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "ellipse") return null;
  const g = ctx.gradient;

  const commit = (axis: "x" | "y", raw: string) => {
    if (raw === "") {
      ctx.setRadii(undefined);
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    const current = g.radii ?? { x: 0, y: 0 };
    ctx.setRadii(
      axis === "x"
        ? { x: Math.max(0, n / 100), y: current.y }
        : { x: current.x, y: Math.max(0, n / 100) },
    );
  };

  return (
    <div
      ref={ref}
      data-slot="gradient-ellipse-radii-input"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        step={1}
        value={g.radii ? Math.round(g.radii.x * 100) : ""}
        placeholder="auto"
        onChange={(e) => commit("x", e.target.value)}
        aria-label="Ellipse horizontal radius percent"
        className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span aria-hidden>×</span>
      <input
        type="number"
        min={0}
        step={1}
        value={g.radii ? Math.round(g.radii.y * 100) : ""}
        placeholder="auto"
        onChange={(e) => commit("y", e.target.value)}
        aria-label="Ellipse vertical radius percent"
        className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span>%</span>
    </div>
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { RadialSizeKeyword } from "../../lib/gradient";

const SIZE_OPTIONS: RadialSizeKeyword[] = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
];

export const RadialShape = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function RadialShape({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  const g = ctx.gradient;

  return (
    <div
      ref={ref}
      data-slot="gradient-radial-shape"
      className={cn("flex items-center gap-2", className)}
      {...rest}
    >
      <div role="tablist" aria-label="Radial shape" className="inline-flex rounded-md bg-muted p-1">
        {(["circle", "ellipse"] as const).map((shape) => {
          const active = g.shape === shape;
          return (
            <button
              key={shape}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => ctx.setRadialShape(shape)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {shape}
            </button>
          );
        })}
      </div>
      <select
        value={g.size}
        onChange={(e) => ctx.setRadialSize(e.target.value as RadialSizeKeyword)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        aria-label="Radial size"
      >
        {SIZE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {/* Numeric size override. For circle we expose a single px input bound
         to `radiusPx`; for ellipse, two percentage inputs bound to
         `radii.x` / `radii.y`. Useful when the desired size is larger than
         the in-Area edge handle can reach by dragging, or when the user
         wants a precise numeric value. */}
      {g.shape === "circle" ? (
        <label className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span>r</span>
          <input
            type="number"
            min={0}
            step={1}
            value={
              g.radiusPx !== undefined ? Math.round(g.radiusPx) : ""
            }
            placeholder="auto"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                ctx.setRadiusPx(undefined);
                return;
              }
              const n = parseFloat(v);
              if (Number.isFinite(n)) ctx.setRadiusPx(Math.max(0, n));
            }}
            className="h-7 w-16 rounded border border-border bg-background px-1 text-right text-xs text-foreground"
            aria-label="Circle radius in pixels"
          />
          <span>px</span>
        </label>
      ) : (
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="number"
            min={0}
            step={1}
            value={
              g.radii ? Math.round(g.radii.x * 100) : ""
            }
            placeholder="auto"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                ctx.setRadii(undefined);
                return;
              }
              const n = parseFloat(v);
              if (!Number.isFinite(n)) return;
              const current = g.radii ?? { x: 0, y: 0 };
              ctx.setRadii({ x: Math.max(0, n / 100), y: current.y });
            }}
            className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground"
            aria-label="Ellipse horizontal radius percent"
          />
          <span>×</span>
          <input
            type="number"
            min={0}
            step={1}
            value={
              g.radii ? Math.round(g.radii.y * 100) : ""
            }
            placeholder="auto"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                ctx.setRadii(undefined);
                return;
              }
              const n = parseFloat(v);
              if (!Number.isFinite(n)) return;
              const current = g.radii ?? { x: 0, y: 0 };
              ctx.setRadii({ x: current.x, y: Math.max(0, n / 100) });
            }}
            className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground"
            aria-label="Ellipse vertical radius percent"
          />
          <span>%</span>
        </span>
      )}
    </div>
  );
});

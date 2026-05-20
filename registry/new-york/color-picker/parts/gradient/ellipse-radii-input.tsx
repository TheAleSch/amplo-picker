"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  FieldDivider,
  FieldInput,
  FieldInputGroup,
  FieldShell,
  FieldSuffix,
} from "../field";

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
    <FieldShell
      ref={ref}
      data-slot="gradient-ellipse-radii-input"
      className={cn("inline-flex w-fit", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Ellipse horizontal radius</span>
        <FieldInput
          inputMode="numeric"
          value={g.radii ? Math.round(g.radii.x * 100) : ""}
          placeholder="auto"
          onChange={(e) => commit("x", e.target.value)}
          aria-label="Ellipse horizontal radius percent"
          className="w-12"
        />
      </FieldInputGroup>
      <FieldDivider />
      <FieldInputGroup>
        <span className="sr-only">Ellipse vertical radius</span>
        <FieldInput
          inputMode="numeric"
          value={g.radii ? Math.round(g.radii.y * 100) : ""}
          placeholder="auto"
          onChange={(e) => commit("y", e.target.value)}
          aria-label="Ellipse vertical radius percent"
          className="w-12"
        />
        <FieldSuffix>%</FieldSuffix>
      </FieldInputGroup>
    </FieldShell>
  );
});

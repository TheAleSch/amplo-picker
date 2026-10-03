"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  FieldDivider,
  FieldDraftInput,
  FieldInputGroup,
  FieldShell,
  FieldSuffix,
} from "../field";
import { keywordToRadii } from "./overlay";

export const EllipseRadiiInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function EllipseRadiiInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "ellipse") return null;
  const g = ctx.gradient;

  const commit = (axis: "x" | "y", raw: string) => {
    if (raw.trim() === "") {
      ctx.setRadii(undefined);
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    // Keep the untouched axis at its *effective* extent. For an ellipse the
    // keyword seed is already normalized per axis, so the box size cancels
    // out (1 × 1) — the same seed the Overlay's edge handle starts from.
    const current =
      g.radii ?? keywordToRadii("ellipse", g.size, g.center, 1, 1);
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
      className={cn("min-w-0 shrink-0", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Ellipse horizontal radius</span>
        <FieldDraftInput
          inputMode="decimal"
          nudge={1}
          value={g.radii ? String(Math.round(g.radii.x * 100)) : ""}
          placeholder="auto"
          onCommit={(raw) => commit("x", raw)}
          aria-label="Ellipse horizontal radius percent"
          className="w-12"
        />
      </FieldInputGroup>
      <FieldDivider />
      <FieldInputGroup>
        <span className="sr-only">Ellipse vertical radius</span>
        <FieldDraftInput
          inputMode="decimal"
          nudge={1}
          value={g.radii ? String(Math.round(g.radii.y * 100)) : ""}
          placeholder="auto"
          onCommit={(raw) => commit("y", raw)}
          aria-label="Ellipse vertical radius percent"
          className="w-12"
        />
        <FieldSuffix>%</FieldSuffix>
      </FieldInputGroup>
    </FieldShell>
  );
});

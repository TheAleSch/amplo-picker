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
    <FieldShell
      ref={ref}
      data-slot="gradient-position-input"
      className={cn("inline-flex w-fit", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Gradient center x</span>
        <FieldInput
          inputMode="numeric"
          value={Math.round(center.x * 100)}
          onChange={(e) => commit("x", e.target.value)}
          aria-label="Gradient center x percent"
          className="w-10"
        />
        <FieldSuffix>%</FieldSuffix>
      </FieldInputGroup>
      <FieldDivider />
      <FieldInputGroup>
        <span className="sr-only">Gradient center y</span>
        <FieldInput
          inputMode="numeric"
          value={Math.round(center.y * 100)}
          onChange={(e) => commit("y", e.target.value)}
          aria-label="Gradient center y percent"
          className="w-10"
        />
        <FieldSuffix>%</FieldSuffix>
      </FieldInputGroup>
    </FieldShell>
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  FieldDraftInput,
  FieldInputGroup,
  FieldShell,
  FieldSuffix,
} from "../field";

export const AngleInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AngleInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "radial") return null;

  const angle =
    ctx.gradient.type === "linear"
      ? ctx.gradient.angle
      : ctx.gradient.startAngle;
  const setAngle =
    ctx.gradient.type === "linear" ? ctx.setAngle : ctx.setStartAngle;

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) setAngle(((n % 360) + 360) % 360);
  };

  return (
    <FieldShell
      ref={ref}
      data-slot="gradient-angle-input"
      className={cn("min-w-0 flex-1", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Gradient angle</span>
        <FieldDraftInput
          inputMode="decimal"
          nudge={1}
          value={String(Math.round(angle))}
          onCommit={commit}
          aria-label="Gradient angle in degrees"
          className="w-10"
        />
        <FieldSuffix>°</FieldSuffix>
      </FieldInputGroup>
    </FieldShell>
  );
});

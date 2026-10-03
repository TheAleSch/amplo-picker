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

export const RadiusInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function RadiusInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "circle") return null;
  const g = ctx.gradient;
  const usePercent = !!ctx.containerWidth;
  const display = (() => {
    if (g.radiusPx === undefined) return "";
    return String(
      usePercent
        ? Math.round((g.radiusPx / (ctx.containerWidth as number)) * 100)
        : Math.round(g.radiusPx),
    );
  })();

  const commit = (raw: string) => {
    const v = raw.trim();
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
    <FieldShell
      ref={ref}
      data-slot="gradient-radius-input"
      className={cn("min-w-0 shrink-0", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Circle radius</span>
        <FieldDraftInput
          inputMode="decimal"
          nudge={1}
          value={display}
          placeholder="auto"
          onCommit={commit}
          aria-label={
            usePercent
              ? "Circle radius as percent of Area width"
              : "Circle radius in pixels"
          }
          className="w-12"
        />
        <FieldSuffix>{usePercent ? "%" : "px"}</FieldSuffix>
      </FieldInputGroup>
    </FieldShell>
  );
});

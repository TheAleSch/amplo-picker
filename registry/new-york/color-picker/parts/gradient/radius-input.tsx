"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  FieldInput,
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
    <FieldShell
      ref={ref}
      data-slot="gradient-radius-input"
      className={cn("min-w-0 flex-1", className)}
      {...rest}
    >
      <FieldInputGroup>
        <span className="sr-only">Circle radius</span>
        <FieldInput
          inputMode="numeric"
          value={display}
          placeholder="auto"
          onChange={onChange}
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

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const PositionGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PositionGroup({ className, children, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "linear") return null;
  return (
    <div
      ref={ref}
      data-slot="gradient-position-group"
      className={cn("inline-flex items-center gap-2", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

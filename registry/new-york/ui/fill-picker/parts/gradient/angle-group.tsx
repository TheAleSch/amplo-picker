"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const AngleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AngleGroup({ className, children, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "radial") return null;
  return (
    <div
      ref={ref}
      data-slot="gradient-angle-group"
      className={cn("flex w-full items-center gap-2", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

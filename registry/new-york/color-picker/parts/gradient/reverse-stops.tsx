"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

/**
 * Icon button that mirrors every stop's position around 0.5, flipping the
 * gradient's visual order while preserving stop ids and colors. Disabled
 * when there are fewer than 2 stops (nothing meaningful to reverse).
 *
 * Reads from `<GradientPicker.Root>` context — throws if rendered outside.
 */
export const ReverseStops = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ReverseStops({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  const disabled = ctx.stops.length < 2;
  return (
    <button
      ref={ref}
      type="button"
      data-slot="gradient-reverse-stops"
      onClick={ctx.reverseStops}
      disabled={disabled}
      aria-label="Reverse stop order"
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      <ArrowLeftRight aria-hidden="true" className="size-4" />
    </button>
  );
});

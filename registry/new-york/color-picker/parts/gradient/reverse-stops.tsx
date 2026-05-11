"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

/**
 * Icon button that mirrors every stop's position around 0.5, flipping the
 * gradient's visual order while preserving stop ids and colors. Disabled
 * when there are fewer than 2 stops (nothing meaningful to reverse).
 *
 * Styled with the shared shadcn `<Button variant="outline" size="icon-sm">`
 * so it matches `<ColorPicker.EyeDropper>` and the rest of the new-york
 * icon-button family.
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
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="icon-sm"
      data-slot="gradient-reverse-stops"
      onClick={ctx.reverseStops}
      disabled={disabled}
      aria-label="Reverse stop order"
      className={cn("cursor-pointer", className)}
      {...rest}
    >
      <ArrowLeftRight aria-hidden="true" className="size-4" />
    </Button>
  );
});

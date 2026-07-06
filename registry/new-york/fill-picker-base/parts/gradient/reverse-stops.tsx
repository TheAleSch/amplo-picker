"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";

/**
 * Icon button that mirrors every stop's position around 0.5, flipping the
 * gradient's visual order while preserving stop ids and colors. Disabled
 * when there are fewer than 2 stops (nothing meaningful to reverse).
 *
 * A plain semantic `<button>` styled with the same classes as shadcn's
 * `<Button variant="outline" size="icon-sm">` (used by the Radix variant)
 * — no Radix `Slot` import needed since this button never needs `asChild`.
 *
 * Reads from `<GradientPickerBase.Root>` context — throws if rendered
 * outside.
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
        "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        className,
      )}
      {...rest}
    >
      <ArrowLeftRight aria-hidden="true" className="size-4" />
    </button>
  );
});

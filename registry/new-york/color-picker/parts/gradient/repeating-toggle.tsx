"use client";

import * as React from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

/**
 * Icon toggle that flips the active gradient between its standard and
 * `repeating-*` CSS form. The stop ramp tiles instead of stretching to
 * fill the box — useful for stripes, barberpoles, conic rings.
 *
 * Pressed state is reflected via `data-state="on"|"off"` + `aria-pressed`
 * so consumers can style it; the default styling tints the icon when on.
 *
 * Reads from `<GradientPicker.Root>` context — throws if rendered outside.
 */
export const RepeatingToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function RepeatingToggle({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  // Conic gradients already wrap a full 360° sweep, so `repeating-conic` only
  // changes the paint when stops cover less than the full circle — too niche
  // to expose as a top-level toggle. Hide the affordance there.
  if (ctx.gradient.type === "conic") return null;
  const on = !!ctx.gradient.repeating;
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="icon-sm"
      data-slot="gradient-repeating-toggle"
      data-state={on ? "on" : "off"}
      aria-pressed={on}
      aria-label={on ? "Disable repeating gradient" : "Enable repeating gradient"}
      onClick={() => ctx.setRepeating(!on)}
      className={cn(
        "cursor-pointer",
        on
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <Repeat aria-hidden="true" className="size-4" />
    </Button>
  );
});

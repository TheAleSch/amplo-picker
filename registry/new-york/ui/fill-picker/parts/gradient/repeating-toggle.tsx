"use client";

import * as React from "react";
import { Repeat } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

/**
 * Icon toggle that flips the active gradient between its standard and
 * `repeating-*` CSS form. The stop ramp tiles instead of stretching to
 * fill the box — useful for stripes, barberpoles.
 *
 * Built on shadcn `<Toggle variant="outline" size="sm">` so the pressed
 * state is wired by Base UI (`data-pressed`) and the visual treatment
 * matches every other toggle the consumer might already have. We tighten
 * the lit-border affordance over the base variant.
 *
 * Hidden when `gradient.type === "conic"` — conic already sweeps a full
 * 360°, so `repeating-conic-gradient` only matters for niche pie-slice
 * patterns; not worth a top-level toggle.
 *
 * Reads from `<GradientPicker.Root>` context — throws if rendered outside.
 */
export const RepeatingToggle = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Toggle>
>(function RepeatingToggle({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "conic") return null;
  const on = !!ctx.gradient.repeating;
  return (
    <Toggle
      ref={ref}
      variant="outline"
      size="sm"
      data-slot="gradient-repeating-toggle"
      pressed={on}
      onPressedChange={ctx.setRepeating}
      aria-label={on ? "Disable repeating gradient" : "Enable repeating gradient"}
      className={cn(
        "cursor-pointer text-muted-foreground data-[pressed]:border-foreground/70 data-[pressed]:bg-foreground/10 data-[pressed]:text-foreground",
        className,
      )}
      {...rest}
    >
      <Repeat aria-hidden="true" className="size-4" />
    </Toggle>
  );
});

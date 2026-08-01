"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";
import { GRADIENT_INTERP_OPTIONS } from "../../lib/gradient-options";

const OPTIONS = GRADIENT_INTERP_OPTIONS;

export interface InterpSwitcherProps {
  className?: string;
  /** Applied to the SelectTrigger. */
  triggerClassName?: string;
}

/**
 * Bound to the active gradient's `interp` property. Switching only
 * changes the blending math between stops — stop positions and colors
 * stay identical.
 *
 * Must render inside `<GradientPicker.Root>` — throws otherwise.
 */
export const InterpSwitcher = React.forwardRef<
  HTMLButtonElement,
  InterpSwitcherProps
>(function InterpSwitcher({ className, triggerClassName }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <Select
      value={ctx.gradient.interp}
      onValueChange={(v) => ctx.setInterp(v as GradientInterp)}
    >
      <SelectTrigger
        ref={ref}
        data-slot="gradient-interp-switcher"
        aria-label="Interpolation space"
        size="sm"
        className={cn(
          "w-full font-mono text-xs tracking-wide",
          triggerClassName,
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="font-mono text-xs tracking-wide">
        {/* Bare-string children so both Select dialects derive the trigger label
            (Radix mirrors ItemText; the Base wrapper walks children). Descriptions
            ride on title= — an in-item tooltip subtree would pollute both. */}
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} title={opt.description}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

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
import type { RadialSizeKeyword } from "../../lib/gradient";
import { RADIAL_SIZE_OPTIONS } from "../../lib/gradient-options";

const SIZE_OPTIONS = RADIAL_SIZE_OPTIONS;

export interface RadialSizeSelectProps {
  className?: string;
  /** Applied to the SelectTrigger. */
  triggerClassName?: string;
}

export const RadialSizeSelect = React.forwardRef<
  HTMLButtonElement,
  RadialSizeSelectProps
>(function RadialSizeSelect({ className, triggerClassName }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  return (
    <Select
      value={ctx.gradient.size}
      onValueChange={(v) => ctx.setRadialSize(v as RadialSizeKeyword)}
    >
      <SelectTrigger
        ref={ref}
        data-slot="gradient-radial-size-select"
        aria-label="Radial size"
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
        {SIZE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} title={opt.description}>
            {opt.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";

/**
 * Selectable interpolation spaces. Each maps to the CSS Color 4
 * `<gradient> in <space>` clause emitted by `formatGradient`.
 *
 * The description is surfaced via the ⓘ icon next to each option, so
 * users hovering an option in the open menu see *why* they'd pick it.
 */
const OPTIONS: {
  value: GradientInterp;
  label: string;
  description: string;
}[] = [
  {
    value: "oklch",
    label: "OKLCH",
    description:
      "Perceptually uniform polar space. Smooth hue arcs, no muddy mid-tones. Recommended default.",
  },
  {
    value: "oklab",
    label: "OKLab",
    description:
      "Perceptual but cartesian — a straight line through OK space. Smooth lightness, no hue rotation.",
  },
  {
    value: "srgb",
    label: "sRGB",
    description:
      "Legacy browser default. Mixes in gamma-encoded sRGB; often grays through the middle of two saturated colors.",
  },
  {
    value: "hsl",
    label: "HSL",
    description:
      "Walks the hue circle the shorter way between the two stops.",
  },
  {
    value: "hsl-longer",
    label: "HSL (longer hue)",
    description:
      "Walks the hue circle the longer way — produces a full rainbow sweep between two stops.",
  },
];

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
    <TooltipProvider delayDuration={150}>
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
            "w-full font-mono text-xs uppercase tracking-wide",
            triggerClassName,
            className,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="font-mono text-xs uppercase tracking-wide">
          {OPTIONS.map((opt) => (
            <RowWithInfo
              key={opt.value}
              value={opt.value}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
});

function RowWithInfo({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <SelectItem value={value} className="pr-8">
      <span className="flex w-full items-center gap-2">
        <span className="flex-1">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="img"
              aria-label={`About ${label}`}
              className="inline-flex shrink-0 cursor-help text-muted-foreground hover:text-foreground"
            >
              <Info className="size-3" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            className="max-w-[220px] text-[11px] normal-case tracking-normal"
          >
            {description}
          </TooltipContent>
        </Tooltip>
      </span>
    </SelectItem>
  );
}

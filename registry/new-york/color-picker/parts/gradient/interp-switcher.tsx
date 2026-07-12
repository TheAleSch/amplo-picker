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
import { GRADIENT_INTERP_OPTIONS } from "../../lib/gradient-options";

const OPTIONS = GRADIENT_INTERP_OPTIONS;

// `<SelectItem>` here is wrapped in `RowWithInfo`, not a direct child of
// `<SelectContent>`, so `<Select>`'s automatic value→label extraction
// (which only sees literal `<SelectItem>` elements) can't find these labels.
// Pass the map explicitly — same pattern the Base UI-first
// `fill-picker-base/parts/gradient/interp-switcher.tsx` uses.
const INTERP_ITEMS = Object.fromEntries(
  OPTIONS.map((o) => [o.value, o.label]),
) as Record<GradientInterp, string>;

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
        items={INTERP_ITEMS}
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

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
import type { RadialSizeKeyword } from "../../lib/gradient";

/**
 * The four CSS `<size>` keywords for radial gradients, each with a
 * one-sentence hover explanation surfaced via the ⓘ icon.
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient#size
 */
const SIZE_OPTIONS: { value: RadialSizeKeyword; description: string }[] = [
  {
    value: "closest-side",
    description:
      "Ends at the side of the box closest to the center (the shortest reachable edge).",
  },
  {
    value: "closest-corner",
    description:
      "Ends at the corner of the box closest to the center — passes through the nearest corner.",
  },
  {
    value: "farthest-side",
    description:
      "Ends at the side of the box farthest from the center (the longest reachable edge).",
  },
  {
    value: "farthest-corner",
    description:
      "Default. Ends at the corner of the box farthest from the center — gradient covers the entire box.",
  },
];

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
    <TooltipProvider delayDuration={150}>
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
          {SIZE_OPTIONS.map((opt) => (
            <RowWithInfo
              key={opt.value}
              value={opt.value}
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
  description,
}: {
  value: string;
  description: string;
}) {
  return (
    <SelectItem value={value} className="pr-8">
      <span className="flex w-full items-center gap-2">
        <span className="flex-1">{value}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Span (not button) so Select still owns the click for
                row selection — the icon is just a hover affordance. */}
            <span
              role="img"
              aria-label={`About ${value}`}
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

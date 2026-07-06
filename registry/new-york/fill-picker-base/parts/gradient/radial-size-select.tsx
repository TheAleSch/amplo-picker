"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@base-ui/react/tooltip";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";
import type { RadialSizeKeyword } from "@/registry/new-york/color-picker/lib/gradient";
import { FieldSelect, FieldSelectItem } from "./field";

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
  /** Applied to the select trigger. */
  triggerClassName?: string;
}

/** Base UI port of `<GradientPicker.RadialSizeSelect>`. */
export const RadialSizeSelect = React.forwardRef<
  HTMLButtonElement,
  RadialSizeSelectProps
>(function RadialSizeSelect({ className, triggerClassName }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  return (
    <Tooltip.Provider delay={150}>
      <FieldSelect
        ref={ref}
        aria-label="Radial size"
        value={ctx.gradient.size}
        onValueChange={(v) => ctx.setRadialSize(v as RadialSizeKeyword)}
        wrapperProps={{ "data-slot": "gradient-radial-size-select", className: "w-full" }}
        className={cn("w-full", triggerClassName, className)}
      >
        {SIZE_OPTIONS.map((opt) => (
          <RowWithInfo key={opt.value} value={opt.value} description={opt.description} />
        ))}
      </FieldSelect>
    </Tooltip.Provider>
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
    <FieldSelectItem value={value} className="pr-8">
      <span className="flex w-full items-center gap-2">
        <span className="flex-1">{value}</span>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              // Span (not button) so Base UI Select still owns the click
              // for row selection — the icon is just a hover affordance.
              <span
                role="img"
                aria-label={`About ${value}`}
                className="inline-flex shrink-0 cursor-help text-muted-foreground hover:text-foreground"
              >
                <Info className="size-3" aria-hidden />
              </span>
            }
          />
          <Tooltip.Portal>
            <Tooltip.Positioner side="right" align="center" sideOffset={4}>
              <Tooltip.Popup
                className={cn(
                  "z-50 max-w-[220px] overflow-hidden rounded-md bg-primary px-3 py-1.5 text-[11px] normal-case tracking-normal text-primary-foreground",
                )}
              >
                {description}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </span>
    </FieldSelectItem>
  );
}

"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@base-ui/react/tooltip";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";
import type { GradientInterp } from "@/registry/new-york/color-picker/lib/gradient";
import { FieldSelect, FieldSelectItem } from "./field";
import { GRADIENT_INTERP_OPTIONS } from "@/registry/new-york/color-picker/lib/gradient-options";

const OPTIONS = GRADIENT_INTERP_OPTIONS;

const INTERP_ITEMS = Object.fromEntries(
  OPTIONS.map((o) => [o.value, o.label]),
) as Record<GradientInterp, string>;

export interface InterpSwitcherProps {
  className?: string;
  /** Applied to the select trigger. */
  triggerClassName?: string;
}

/**
 * Base UI port of `<GradientPicker.InterpSwitcher>`. Bound to the active
 * gradient's `interp` property. Switching only changes the blending math
 * between stops — stop positions and colors stay identical.
 *
 * Must render inside `<GradientPickerBase.Root>` — throws otherwise.
 */
export const InterpSwitcher = React.forwardRef<
  HTMLButtonElement,
  InterpSwitcherProps
>(function InterpSwitcher({ className, triggerClassName }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <Tooltip.Provider delay={150}>
      <FieldSelect
        ref={ref}
        aria-label="Interpolation space"
        value={ctx.gradient.interp}
        onValueChange={(v) => ctx.setInterp(v as GradientInterp)}
        items={INTERP_ITEMS}
        wrapperProps={{ "data-slot": "gradient-interp-switcher", className: "w-full" }}
        className={cn("w-full", triggerClassName, className)}
      >
        {OPTIONS.map((opt) => (
          <RowWithInfo
            key={opt.value}
            value={opt.value}
            label={opt.label}
            description={opt.description}
          />
        ))}
      </FieldSelect>
    </Tooltip.Provider>
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
    <FieldSelectItem value={value} className="pr-8">
      <span className="flex w-full items-center gap-2">
        <span className="flex-1">{label}</span>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <span
                role="img"
                aria-label={`About ${label}`}
                className="inline-flex shrink-0 cursor-help text-muted-foreground hover:text-foreground"
              >
                <Info className="size-3" aria-hidden />
              </span>
            }
          />
          <Tooltip.Portal>
            {/* z-50 on the POSITIONER, not just the popup: the positioner is
                the element that competes with the Select popup's z-50
                positioner — with z-auto it renders behind the open menu. */}
            <Tooltip.Positioner
              side="right"
              align="center"
              sideOffset={4}
              className="z-50"
            >
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

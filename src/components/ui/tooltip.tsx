"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";

function TooltipProvider({
  delayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & {
  /** Radix-era name for Base UI's `delay`. */
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delayDuration}
      {...props}
    />
  );
}

const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
  /** Radix-era prop: merges Trigger's props onto the single child element
   * via Base UI's `render` instead of rendering its own `<button>`. */
  asChild?: boolean;
}) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      render={asChild ? (children as React.ReactElement) : undefined}
      {...props}
    >
      {asChild ? undefined : children}
    </TooltipPrimitive.Trigger>
  );
}

/**
 * Radix's `<Tooltip.Content>` folded Portal + positioning + surface into one
 * part; Base UI splits those into Portal/Positioner/Popup. This wrapper
 * recomposes them so callers keep passing `side`/`align`/`sideOffset`/
 * `className` exactly as they did under Radix.
 */
function TooltipContent({
  className,
  side,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof TooltipPrimitive.Positioner>,
    "side" | "align" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 origin-[var(--transform-origin)] overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

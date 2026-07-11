"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

function PopoverTrigger({
  asChild,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
  /** Radix-era prop: merges Trigger's props onto the single child element
   * via Base UI's `render` instead of rendering its own `<button>`. */
  asChild?: boolean;
}) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      render={asChild ? (children as React.ReactElement) : undefined}
      {...props}
    >
      {asChild ? undefined : children}
    </PopoverPrimitive.Trigger>
  );
}

/**
 * Base UI's Popover has no dedicated "anchor without a trigger" part (see
 * `registry/new-york/color-picker/parts/gradient/stop-popover.tsx` for the
 * from-scratch version built on `Positioner`'s `anchor` prop). Nothing in
 * this repo drives a popover from a non-trigger anchor through the shared
 * shadcn wrapper, so this is kept as a passthrough for source compatibility
 * with the Radix-era export.
 */
function PopoverAnchor({ children }: { children: React.ReactElement }) {
  return children;
}

/**
 * Radix's `<Popover.Content>` folded Portal + positioning + surface into one
 * part; Base UI splits those into Portal/Positioner/Popup. This wrapper
 * recomposes them so callers keep passing `align`/`side`/`sideOffset`/
 * `collisionPadding`/`className` exactly as they did under Radix.
 */
function PopoverContent({
  className,
  align = "center",
  side,
  sideOffset = 4,
  alignOffset,
  collisionPadding,
  collisionBoundary,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive.Positioner>,
    | "align"
    | "side"
    | "sideOffset"
    | "alignOffset"
    | "collisionPadding"
    | "collisionBoundary"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        className="z-50 outline-none"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-72 origin-[var(--transform-origin)] rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };

"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

export interface StopPopoverProps {
  /** Controlled open — the caller owns it; this is never a self-triggering popover. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The element to position against, rendered in place. It is NOT a trigger:
   * these anchors (Bar drag handles, StopList swatches) own their own pointer
   * handling, so open is driven externally and we anchor via Base UI's
   * Positioner `anchor` prop rather than a Radix-style `PopoverAnchor`.
   */
  anchor: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
  onContentClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Small self-contained popover built directly on `@base-ui/react/popover`.
 *
 * Deliberately does NOT depend on the consumer's `@/components/ui/popover`:
 * shadcn's Base UI popover omits an anchor/asChild surface, so the
 * anchor-without-trigger pattern this editor needs isn't expressible through
 * it. Owning this thin shell keeps the stop editor identical across the Radix
 * and Base UI variants.
 */
export function StopPopover({
  open,
  onOpenChange,
  anchor,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  className,
  children,
  onContentClick,
}: StopPopoverProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const child = React.Children.only(anchor);

  return (
    <>
      {/* Render the anchor in place; capture its DOM node to position against.
          These anchors carry no ref of their own, so a plain override is safe. */}
      {React.cloneElement(child as React.ReactElement<{ ref?: React.Ref<HTMLElement> }>, {
        ref: setAnchorEl,
      })}
      <Popover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
        <Popover.Portal>
          <Popover.Positioner
            anchor={anchorEl}
            side={side}
            align={align}
            sideOffset={sideOffset}
            className="z-50"
          >
            <Popover.Popup
              onClick={onContentClick}
              className={cn(
                "origin-[var(--transform-origin)] rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
                className,
              )}
            >
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

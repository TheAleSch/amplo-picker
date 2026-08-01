"use client";

// Radix shell of ContrastReadout: consumer's shadcn tooltip + asChild.
// (The shadcn CLI rewrites asChild → render when installing into base-*
// styles.) All contrast logic lives in ./contrast-readout-shared.

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CONTRAST_READOUT_CLASS,
  ContrastPopoverPanel,
  useContrastReadout,
} from "./contrast-readout-shared";
import type { ContrastMetric, ContrastReadoutProps } from "./contrast-readout-shared";

export type { ContrastMetric, ContrastReadoutProps };

export const ContrastReadout = React.forwardRef<HTMLDivElement, ContrastReadoutProps>(
  function ContrastReadout(
    { metrics, defaultMetric, showLabel, showValue, showBadges, className, ...rest },
    ref,
  ) {
    const readout = useContrastReadout({
      metrics,
      defaultMetric,
      showLabel,
      showValue,
      showBadges,
    });

    if (readout.togglable) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={ref as React.Ref<HTMLButtonElement>}
                data-slot="color-picker-contrast-readout"
                type="button"
                onClick={readout.cycle}
                aria-label={`Contrast: ${readout.summary}. Click to switch to ${readout.nextMetric.toUpperCase()}.`}
                className={cn(
                  CONTRAST_READOUT_CLASS,
                  "cursor-pointer text-left motion-safe:transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  className,
                )}
                {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              >
                {readout.body}
                <span aria-hidden="true" className="ml-auto text-muted-foreground">⇅</span>
                <span aria-live="polite" className="sr-only">
                  {readout.cycleAnnouncement}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="max-w-[260px] bg-popover p-2.5 text-popover-foreground shadow-md"
            >
              <ContrastPopoverPanel
                title={readout.popover.title}
                rows={readout.popover.rows}
                fg={readout.fgCss}
                bg={readout.bgCss}
                footer={`Click to switch to ${readout.nextMetric.toUpperCase()}`}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              data-slot="color-picker-contrast-readout"
              role="group"
              tabIndex={0}
              aria-label={`Contrast against background: ${readout.summary}`}
              className={cn(
                CONTRAST_READOUT_CLASS,
                "cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className,
              )}
              {...rest}
            >
              {readout.body}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-[260px] bg-popover p-2.5 text-popover-foreground shadow-md"
          >
            <ContrastPopoverPanel
              title={readout.popover.title}
              rows={readout.popover.rows}
              fg={readout.fgCss}
              bg={readout.bgCss}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

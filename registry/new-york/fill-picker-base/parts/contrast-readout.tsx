"use client";

// Base UI shell of ContrastReadout: owns @base-ui/react/tooltip directly
// (delay / render) instead of the consumer's shadcn tooltip wrapper, whose
// prop dialect differs between Radix and Base UI styles. All contrast logic
// lives in the color-picker tree's contrast-readout-shared.

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import {
  CONTRAST_READOUT_CLASS,
  ContrastPopoverPanel,
  useContrastReadout,
} from "@/registry/new-york/color-picker/parts/contrast-readout-shared";
import type {
  ContrastMetric,
  ContrastReadoutProps,
} from "@/registry/new-york/color-picker/parts/contrast-readout-shared";

export type { ContrastMetric, ContrastReadoutProps };

const POPUP_CLASS =
  "z-50 max-w-[260px] rounded-md border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-md";

function ReadoutTooltip({
  trigger,
  children,
}: {
  trigger: React.ReactElement<Record<string, unknown>>;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger render={trigger} />
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" align="center" sideOffset={4} className="z-50">
            <Tooltip.Popup className={POPUP_CLASS}>{children}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

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
        <ReadoutTooltip
          trigger={
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
          }
        >
          <ContrastPopoverPanel
            title={readout.popover.title}
            rows={readout.popover.rows}
            fg={readout.fgCss}
            bg={readout.bgCss}
            footer={`Click to switch to ${readout.nextMetric.toUpperCase()}`}
          />
        </ReadoutTooltip>
      );
    }

    return (
      <ReadoutTooltip
        trigger={
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
        }
      >
        <ContrastPopoverPanel
          title={readout.popover.title}
          rows={readout.popover.rows}
          fg={readout.fgCss}
          bg={readout.bgCss}
        />
      </ReadoutTooltip>
    );
  },
);

"use client";

// Base UI shell of GamutBadge: owns @base-ui/react/tooltip directly
// (delay / render) instead of the consumer's shadcn tooltip wrapper, whose
// prop dialect differs between Radix and Base UI styles. Shared logic lives
// in the color-picker tree's gamut-badge-shared.

import * as React from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import {
  GAMUT_BADGE_CLASS,
  gamutLabel,
} from "@/registry/new-york/color-picker/parts/gamut-badge-shared";
import type { GamutBadgeProps } from "@/registry/new-york/color-picker/parts/gamut-badge-shared";

export type { GamutBadgeProps };

export const GamutBadge = React.forwardRef<HTMLDivElement, GamutBadgeProps>(function GamutBadge(
  { showLabel = true, className, ...rest },
  ref,
) {
  const { gamut } = useColorPickerContext();
  const label = gamutLabel(gamut);

  // delay=0: parity with the Radix shells, which inherit the shadcn wrapper default (0). Base UI's own default is 600.
  return (
    <Tooltip.Provider delay={0}>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <div
              ref={ref}
              data-slot="color-picker-gamut-badge"
              role="status"
              aria-live="polite"
              tabIndex={0}
              className={cn(GAMUT_BADGE_CLASS, className)}
              {...rest}
            >
              {showLabel && <span className="text-muted-foreground">Gamut</span>}
              <span className="font-mono font-medium">{label}</span>
            </div>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner side="top" align="center" sideOffset={4} className="z-50">
            <Tooltip.Popup className="z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-background">
              Color in {label} color space
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
});

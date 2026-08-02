"use client";

// Radix shell of GamutBadge: consumer's shadcn tooltip + asChild.
// (The shadcn CLI rewrites asChild → render when installing into base-*
// styles.) Shared logic lives in ./gamut-badge-shared.

import * as React from "react";
import { useColorPickerContext } from "../context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { GAMUT_BADGE_CLASS, gamutLabel } from "./gamut-badge-shared";
import type { GamutBadgeProps } from "./gamut-badge-shared";

export type { GamutBadgeProps };

export const GamutBadge = React.forwardRef<HTMLDivElement, GamutBadgeProps>(function GamutBadge(
  { showLabel = true, className, ...rest },
  ref,
) {
  const { gamut } = useColorPickerContext();
  const label = gamutLabel(gamut);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent>Color in {label} color space</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

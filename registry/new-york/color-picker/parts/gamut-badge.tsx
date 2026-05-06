"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface GamutBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the "Gamut" prefix label. Default true. */
  showLabel?: boolean;
}

export const GamutBadge = React.forwardRef<HTMLDivElement, GamutBadgeProps>(function GamutBadge(
  { showLabel = true, className, ...rest },
  ref,
) {
  const { gamut } = useColorPickerContext();

  let label = "sRGB";
  if (!gamut.inSrgb && gamut.inP3) label = "P3";
  else if (!gamut.inP3 && gamut.inRec2020) label = "Rec.2020";
  else if (!gamut.inRec2020) label = "Out of gamut";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={ref}
            data-slot="color-picker-gamut-badge"
            role="status"
            aria-live="polite"
            tabIndex={0}
            className={cn(
              "inline-flex w-full cursor-default items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs",
              className,
            )}
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

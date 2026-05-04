"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { cn } from "@/lib/utils";

export interface GamutBadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

export const GamutBadge = React.forwardRef<HTMLDivElement, GamutBadgeProps>(function GamutBadge(
  { className, ...rest },
  ref,
) {
  const { gamut } = useColorPickerContext();

  let label = "sRGB";
  let tone = "ok";
  let title = "Color is within the sRGB gamut and displays identically on every modern screen.";
  if (!gamut.inSrgb && gamut.inP3) {
    label = "Display-P3";
    tone = "warn";
    title =
      "Outside the sRGB gamut. Wide-gamut (Display-P3) screens render this faithfully; sRGB screens fall back to the closest sRGB approximation.";
  } else if (!gamut.inP3 && gamut.inRec2020) {
    label = "Rec.2020";
    tone = "warn";
    title =
      "Outside both sRGB and Display-P3 gamuts. Most consumer displays will show a clipped approximation.";
  } else if (!gamut.inRec2020) {
    label = "Out of gamut";
    tone = "danger";
    title = "Color falls outside Rec.2020. Will be gamut-mapped on output.";
  }

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        tone === "ok" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        tone === "danger" && "bg-destructive/15 text-destructive",
        className,
      )}
      {...rest}
    >
      <span aria-hidden className={cn(
        "size-1.5 rounded-full",
        tone === "ok" && "bg-emerald-500",
        tone === "warn" && "bg-amber-500",
        tone === "danger" && "bg-destructive",
      )} />
      {label}
    </div>
  );
});

// Tooltip-agnostic internals of GamutBadge, shared by the Radix shell
// (parts/gamut-badge.tsx) and the Base UI shell
// (fill-picker-base/parts/gamut-badge.tsx).

import type * as React from "react";
import type { GamutInfo } from "../lib/types";

export interface GamutBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the "Gamut" prefix label. Default true. */
  showLabel?: boolean;
}

export const GAMUT_BADGE_CLASS =
  "inline-flex w-full cursor-default items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs";

export function gamutLabel(
  gamut: Pick<GamutInfo, "inSrgb" | "inP3" | "inRec2020">,
): string {
  if (!gamut.inSrgb && gamut.inP3) return "P3";
  if (!gamut.inP3 && gamut.inRec2020) return "Rec.2020";
  if (!gamut.inRec2020) return "Out of gamut";
  return "sRGB";
}

"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor, parseColor } from "../lib/color";
import { cn } from "@/lib/utils";

export interface SwatchesProps extends React.HTMLAttributes<HTMLDivElement> {
  presets?: string[];
}

const DEFAULT_PRESETS = [
  "oklch(0.95 0 0)",
  "oklch(0.75 0 0)",
  "oklch(0.5 0 0)",
  "oklch(0.25 0 0)",
  "oklch(0.05 0 0)",
  "oklch(0.7 0.18 30)",
  "oklch(0.7 0.18 90)",
  "oklch(0.7 0.18 150)",
  "oklch(0.7 0.18 210)",
  "oklch(0.7 0.18 270)",
];

export const Swatches = React.forwardRef<HTMLDivElement, SwatchesProps>(function Swatches(
  { presets = DEFAULT_PRESETS, className, ...rest },
  ref,
) {
  const { setColor, formatted } = useColorPickerContext();
  return (
    <div
      ref={ref}
      data-slot="color-picker-swatches"
      role="listbox"
      aria-label="Color swatches"
      className={cn("grid grid-cols-10 gap-1", className)}
      {...rest}
    >
      {presets.map((p, i) => {
        const parsed = parseColor(p);
        const active = parsed ? formatColor(parsed, "hex") === formatted : false;
        // Paint the swatch with the raw preset string so out-of-sRGB colors
        // (P3 / OKLCH wide-gamut) actually render in their native gamut on
        // capable displays. Hex-conversion would clamp them to sRGB.
        return (
          <button
            key={`${p}-${i}`}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={p}
            onClick={() => setColor(p)}
            className={cn(
              "size-5 rounded-sm border border-border outline-none transition-transform",
              "focus-visible:ring-2 focus-visible:ring-ring hover:scale-110",
              active && "ring-2 ring-ring",
            )}
            style={{ background: p }}
          />
        );
      })}
    </div>
  );
});

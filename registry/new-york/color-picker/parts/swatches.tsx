"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useColorPickerContext } from "../context";
import { formatColor, parseColor } from "../lib/color";
import type { OklchColor } from "../lib/types";
import { cn } from "@/lib/utils";

export interface SwatchesProps extends React.HTMLAttributes<HTMLDivElement> {
  presets?: string[];
  /**
   * When provided, renders a "+" tile after the presets that calls this with
   * the current color. The consumer owns state (lift `presets` and update it
   * here, persist to localStorage / a server / Zustand / whatever).
   */
  onAdd?: (color: OklchColor, hex: string) => void;
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
  { presets = DEFAULT_PRESETS, onAdd, className, ...rest },
  ref,
) {
  const { color, setColor, formatted } = useColorPickerContext();
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
      {onAdd && (
        <button
          type="button"
          aria-label="Add current color to swatches"
          onClick={() => onAdd(color, formatColor(color, "hex"))}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground outline-none transition-colors",
            "hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus className="size-3" />
        </button>
      )}
    </div>
  );
});

"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useColorPickerContext } from "../context";
import { formatColor, parseColor } from "../lib/color";
import type { OklchColor } from "../lib/types";
import { cn } from "@/lib/utils";

// Inline SVG checkerboard so transparent / partially-opaque presets read as
// translucent rather than solid against the popover bg.
const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><rect width='4' height='4' fill='%23ccc'/><rect x='4' y='4' width='4' height='4' fill='%23ccc'/></svg>\")";

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
  const { color, setColor } = useColorPickerContext();
  // Compare presets to the current color in canonical OKLCH form so the active
  // ring shows regardless of the user's active output format. A hex-string
  // comparison would never match when the format is anything but `hex`.
  const isSamePreset = React.useCallback(
    (preset: OklchColor) => {
      if (Math.abs(preset.l - color.l) >= 1e-3) return false;
      if (Math.abs(preset.c - color.c) >= 1e-3) return false;
      if (Math.abs(preset.alpha - color.alpha) >= 1e-3) return false;
      // Achromatic colors have an undefined hue; skip the hue check when either
      // side has near-zero chroma so swatches like `oklch(0.5 0 0)` match the
      // current gray regardless of its drifted hue.
      if (preset.c < 1e-3 || color.c < 1e-3) return true;
      const d = (((preset.h - color.h) % 360) + 360) % 360;
      const wrapped = d > 180 ? 360 - d : d;
      return wrapped < 0.1;
    },
    [color],
  );
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
        const active = parsed ? isSamePreset(parsed) : false;
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
              "relative size-5 cursor-pointer overflow-hidden rounded-sm border border-border outline-none transition-transform",
              "focus-visible:ring-2 focus-visible:ring-ring hover:scale-110",
              active && "ring-2 ring-ring",
            )}
            style={{ backgroundImage: CHECKERBOARD, backgroundSize: "8px 8px" }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: p }}
            />
          </button>
        );
      })}
      {onAdd && (
        <button
          type="button"
          aria-label="Add current color to swatches"
          onClick={() => onAdd(color, formatColor(color, "hex"))}
          className={cn(
            "inline-flex size-5 cursor-pointer items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground outline-none transition-colors",
            "hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus className="size-3" />
        </button>
      )}
    </div>
  );
});

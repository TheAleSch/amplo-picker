"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useColorPickerContext } from "../context";
import { formatColor, parseColor } from "../lib/color";
import type { OklchColor } from "../lib/types";
import { cn } from "@/lib/utils";
import { CHECKERBOARD_SM } from "../lib/constants";
import {
  DEFAULT_SWATCH_PRESETS,
  isSameSwatchColor,
} from "../lib/swatch-presets";

export interface SwatchesProps extends React.HTMLAttributes<HTMLDivElement> {
  presets?: string[];
  /**
   * When provided, renders a "+" tile after the presets that calls this with
   * the current color. The consumer owns state (lift `presets` and update it
   * here, persist to localStorage / a server / Zustand / whatever).
   */
  onAdd?: (color: OklchColor, hex: string) => void;
}

export const Swatches = React.forwardRef<HTMLDivElement, SwatchesProps>(function Swatches(
  { presets = DEFAULT_SWATCH_PRESETS, onAdd, className, ...rest },
  ref,
) {
  const { color, setColor } = useColorPickerContext();
  // Roving tabindex per the APG listbox pattern: Tab enters the group once,
  // arrows move between options. Focus index survives re-renders but is
  // clamped when the presets array shrinks.
  const [focusIdx, setFocusIdx] = React.useState(0);
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const roveTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, presets.length - 1));
    setFocusIdx(clamped);
    optionRefs.current[clamped]?.focus();
  };
  const onOptionKeyDown = (e: React.KeyboardEvent, i: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        roveTo(i + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        roveTo(i - 1);
        break;
      case "Home":
        e.preventDefault();
        roveTo(0);
        break;
      case "End":
        e.preventDefault();
        roveTo(presets.length - 1);
        break;
    }
  };
  const isSamePreset = (preset: OklchColor) =>
    isSameSwatchColor(preset, color);
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
            ref={(el) => {
              optionRefs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={active}
            aria-label={p}
            tabIndex={i === Math.min(focusIdx, presets.length - 1) ? 0 : -1}
            onKeyDown={(e) => onOptionKeyDown(e, i)}
            onFocus={() => setFocusIdx(i)}
            onClick={() => setColor(p)}
            className={cn(
              // before/after pseudo-padding: keep the 20px visual chip but give the
              // button a 28px hit area (WCAG 2.5.8 target size).
              "relative size-5 cursor-pointer rounded-sm border border-border outline-none motion-safe:transition-transform",
              "before:absolute before:-inset-1 before:content-['']",
              "focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:scale-110",
              active && "ring-2 ring-ring",
            )}
            style={{ backgroundImage: CHECKERBOARD_SM, backgroundSize: "8px 8px" }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-[inherit]"
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
            "relative inline-flex size-5 cursor-pointer items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground outline-none motion-safe:transition-colors",
            "before:absolute before:-inset-1 before:content-['']",
            "hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus className="size-3" />
        </button>
      )}
    </div>
  );
});

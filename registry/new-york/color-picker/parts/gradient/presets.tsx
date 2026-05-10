"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  formatGradient,
  parseGradient,
  type Gradient,
} from "../../lib/gradient";

export const BUILTIN_GRADIENT_PRESETS: string[] = [
  "linear-gradient(in oklch 90deg, oklch(0.9 0.15 60) 0%, oklch(0.6 0.2 30) 100%)",
  "linear-gradient(in oklch 135deg, oklch(0.8 0.18 200) 0%, oklch(0.7 0.2 320) 100%)",
  "linear-gradient(in oklch 0deg, oklch(0.95 0.04 90) 0%, oklch(0.5 0.18 30) 100%)",
  "radial-gradient(circle farthest-corner at 50% 50% in oklch, oklch(0.9 0.2 280) 0%, oklch(0.3 0.12 260) 100%)",
  "conic-gradient(from 0deg at 50% 50% in oklch, oklch(0.7 0.18 0) 0%, oklch(0.7 0.18 90) 25%, oklch(0.7 0.18 180) 50%, oklch(0.7 0.18 270) 75%, oklch(0.7 0.18 360) 100%)",
];

export interface PresetsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override or extend the built-in preset list. */
  presets?: string[];
  /**
   * When provided, renders a "+" tile after the presets that calls this with
   * the current gradient and its serialized CSS. The consumer owns state
   * (lift `presets` and update it here, persist to localStorage / a server /
   * a store / whatever).
   */
  onAdd?: (gradient: Gradient, css: string) => void;
}

export const Presets = React.forwardRef<HTMLDivElement, PresetsProps>(
  function Presets(
    { presets = BUILTIN_GRADIENT_PRESETS, onAdd, className, ...rest },
    ref,
  ) {
    const ctx = useGradientPickerContext();
    const parsed = React.useMemo(
      () =>
        presets
          .map((css) => ({ css, gradient: parseGradient(css) }))
          .filter((p): p is { css: string; gradient: Gradient } => p.gradient !== null),
      [presets],
    );

    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-1.5", className)}
        {...rest}
      >
        {parsed.map(({ css, gradient }) => (
          <button
            key={css}
            type="button"
            onClick={() => ctx.setGradient(gradient)}
            className="size-8 rounded-md border border-border outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
            style={{ background: formatGradient(gradient) }}
            aria-label="Apply gradient preset"
          />
        ))}
        {onAdd && (
          <button
            type="button"
            aria-label="Save current gradient as preset"
            onClick={() => onAdd(ctx.gradient, formatGradient(ctx.gradient))}
            className={cn(
              "inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-dashed border-border text-muted-foreground outline-none transition-colors",
              "hover:border-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>
    );
  },
);

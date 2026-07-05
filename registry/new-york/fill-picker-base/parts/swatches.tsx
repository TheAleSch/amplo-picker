"use client";

import * as React from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Plus } from "lucide-react";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor, parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import { cn } from "@/lib/utils";

// Inline SVG checkerboard so transparent / partially-opaque presets read as
// translucent rather than solid against the popover bg.
const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><rect width='4' height='4' fill='%23ccc'/><rect x='4' y='4' width='4' height='4' fill='%23ccc'/></svg>\")";

export interface SwatchesProps extends React.HTMLAttributes<HTMLDivElement> {
  presets?: string[];
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

// Sentinel RadioGroup value used when the current color doesn't match any
// preset — keeps every Radio unchecked without needing an `undefined` value
// (RadioGroup treats `undefined` as uncontrolled).
const NONE = "__none__";

/**
 * Base UI port of Swatches: a swatch grid is exactly a single-select radio
 * group, so each preset becomes a `Radio.Root` styled as the color tile and
 * the grid itself is `RadioGroup`. This buys keyboard roving-tabindex
 * (arrow keys move focus + selection between swatches) and proper
 * radiogroup/radio ARIA semantics for free, replacing the original's
 * hand-rolled `role="listbox"`/`role="option"` buttons.
 *
 * The "+" add-current-color tile is intentionally *not* a radio option — it
 * performs an action (append a preset) rather than selecting one — so it
 * stays a plain button rendered as a sibling of the RadioGroup.
 */
export const Swatches = React.forwardRef<HTMLDivElement, SwatchesProps>(function Swatches(
  { presets = DEFAULT_PRESETS, onAdd, className, ...rest },
  ref,
) {
  const { color, setColor } = useColorPickerContext();

  const isSamePreset = React.useCallback(
    (preset: OklchColor) => {
      if (Math.abs(preset.l - color.l) >= 1e-3) return false;
      if (Math.abs(preset.c - color.c) >= 1e-3) return false;
      if (Math.abs(preset.alpha - color.alpha) >= 1e-3) return false;
      if (preset.c < 1e-3 || color.c < 1e-3) return true;
      const d = (((preset.h - color.h) % 360) + 360) % 360;
      const wrapped = d > 180 ? 360 - d : d;
      return wrapped < 0.1;
    },
    [color],
  );

  const activeValue = React.useMemo(() => {
    for (const p of presets) {
      const parsed = parseColor(p);
      if (parsed && isSamePreset(parsed)) return p;
    }
    return NONE;
  }, [presets, isSamePreset]);

  return (
    <div
      ref={ref}
      data-slot="color-picker-swatches"
      className={cn("grid grid-cols-10 gap-1", className)}
      {...rest}
    >
      <RadioGroup
        aria-label="Color swatches"
        value={activeValue}
        onValueChange={(value) => setColor(value as string)}
        // "contents" keeps RadioGroup's own wrapping <div> out of the grid
        // box model — its Radio children lay out as direct grid items,
        // matching the original's flat 10-column swatch grid.
        className="contents"
      >
        {presets.map((p, i) => (
          <Radio.Root
            key={`${p}-${i}`}
            value={p}
            aria-label={p}
            className={cn(
              "relative size-5 cursor-pointer overflow-hidden rounded-sm border border-border outline-none transition-transform",
              "focus-visible:ring-2 focus-visible:ring-ring hover:scale-110",
              "data-[checked]:ring-2 data-[checked]:ring-ring",
            )}
            style={{ backgroundImage: CHECKERBOARD, backgroundSize: "8px 8px" }}
          >
            <span aria-hidden className="absolute inset-0" style={{ background: p }} />
          </Radio.Root>
        ))}
      </RadioGroup>
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

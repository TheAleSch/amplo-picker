"use client";

import * as React from "react";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import { Plus } from "lucide-react";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor, parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import { cn } from "@/lib/utils";
import { CHECKERBOARD_SM as CHECKERBOARD } from "@/registry/new-york/color-picker/lib/constants";
import {
  DEFAULT_SWATCH_PRESETS,
  isSameSwatchColor,
} from "@/registry/new-york/color-picker/lib/swatch-presets";

export interface SwatchesProps extends React.HTMLAttributes<HTMLDivElement> {
  presets?: string[];
  onAdd?: (color: OklchColor, hex: string) => void;
}

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
  { presets = DEFAULT_SWATCH_PRESETS, onAdd, className, ...rest },
  ref,
) {
  const { color, setColor } = useColorPickerContext();

  const activeValue = React.useMemo(() => {
    for (const p of presets) {
      const parsed = parseColor(p);
      if (parsed && isSameSwatchColor(parsed, color)) return p;
    }
    return NONE;
  }, [presets, color]);

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
              // before/after pseudo-padding: 20px visual chip, 28px hit area
              // (WCAG 2.5.8). No overflow-hidden — it would clip the inset.
              "relative size-5 cursor-pointer rounded-sm border border-border outline-none transition-transform",
              "before:absolute before:-inset-1 before:content-['']",
              "focus-visible:ring-2 focus-visible:ring-ring hover:scale-110",
              "data-[checked]:ring-2 data-[checked]:ring-ring",
            )}
            style={{ backgroundImage: CHECKERBOARD, backgroundSize: "8px 8px" }}
          >
            <span
              aria-hidden
              // Inner radius = outer minus the 1px border; reusing the outer
              // radius (rounded-[inherit]) curves too early and leaves dark
              // notches at the corners.
              className="absolute inset-0 rounded-[calc(var(--radius-sm)-1px)]"
              style={{ background: p }}
            />
          </Radio.Root>
        ))}
      </RadioGroup>
      {onAdd && (
        <button
          type="button"
          aria-label="Add current color to swatches"
          onClick={() => onAdd(color, formatColor(color, "hex"))}
          className={cn(
            "relative inline-flex size-5 cursor-pointer items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground outline-none transition-colors",
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

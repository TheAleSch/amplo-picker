"use client";

import * as React from "react";
import { Slider } from "@base-ui/react/slider";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor } from "@/registry/new-york/color-picker/lib/color";
import { cn } from "@/lib/utils";

// See Hue: omit `defaultValue` (Slider.Root owns it as a number).
export interface LightnessProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  orientation?: "horizontal" | "vertical";
}

export const Lightness = React.forwardRef<HTMLDivElement, LightnessProps>(function Lightness(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
  const { color, setComponent } = useColorPickerContext();
  const isVertical = orientation === "vertical";

  // Gradient built at the current hue & chroma so users see how lightness
  // changes their color, not a generic black→white ramp.
  const stops = React.useMemo(() => {
    const samples = 8;
    const arr: string[] = [];
    for (let i = 0; i <= samples; i++) {
      arr.push(formatColor({ ...color, l: i / samples, alpha: 1 }, "oklch"));
    }
    return arr.join(", ");
  }, [color]);

  return (
    <Slider.Root
      data-slot="color-picker-lightness"
      value={color.l * 100}
      onValueChange={(v) => setComponent("l", (v as number) / 100)}
      min={0}
      max={100}
      step={1}
      largeStep={10}
      orientation={orientation}
      // Keep the thumb inside the track at min/max — the default
      // center alignment lets it overhang the rounded track ends.
      thumbAlignment="edge"
      className={cn(
        "relative touch-none select-none",
        isVertical ? "h-32 w-3" : "h-3 w-full",
        className,
      )}
      {...rest}
    >
      <Slider.Control
        className={cn(
          "relative h-full w-full rounded-full outline-none",
          // WCAG 2.5.8: widen the pointer target to 24px on the thin axis.
          isVertical
            ? "before:absolute before:-inset-x-1.5 before:content-['']"
            : "before:absolute before:-inset-y-1.5 before:content-['']",
        )}
        style={{
          // Vertical uses `to top` so the min (l=0) renders at the bottom to
          // match Base UI's bottom-anchored vertical thumb.
          background: isVertical
            ? `linear-gradient(to top, ${stops})`
            : `linear-gradient(to right, ${stops})`,
        }}
      >
        <Slider.Thumb
          aria-label="Lightness"
          getAriaValueText={(_, value) => `${Math.round(value)}%`}
          className={cn(
            "absolute size-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
            "outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-popover",
          )}
          style={{ background: formatColor({ ...color, alpha: 1 }, "oklch") }}
        />
      </Slider.Control>
    </Slider.Root>
  );
});

"use client";

import * as React from "react";
import { Slider } from "@base-ui/react/slider";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor } from "@/registry/new-york/color-picker/lib/color";
import { cn } from "@/lib/utils";

export interface LightnessProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Lightness({ orientation = "horizontal", className }: LightnessProps) {
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
      className={cn(
        "relative touch-none select-none",
        isVertical ? "h-32 w-3" : "h-3 w-full",
        className,
      )}
    >
      <Slider.Control
        className="relative h-full w-full rounded-full outline-none"
        style={{
          background: isVertical
            ? `linear-gradient(to bottom, ${stops})`
            : `linear-gradient(to right, ${stops})`,
        }}
      >
        <Slider.Thumb
          // Base UI puts the accessible name on the nested `role="slider"`
          // <input>, not on Slider.Root — so aria-label lives here.
          aria-label="Lightness"
          className={cn(
            "absolute size-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
          )}
          style={{ background: formatColor({ ...color, alpha: 1 }, "oklch") }}
        />
      </Slider.Control>
    </Slider.Root>
  );
}

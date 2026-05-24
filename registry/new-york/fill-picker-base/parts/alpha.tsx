"use client";

import * as React from "react";
import { Slider } from "@base-ui/react/slider";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor } from "@/registry/new-york/color-picker/lib/color";
import { cn } from "@/lib/utils";

export interface AlphaProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

export function Alpha({ orientation = "horizontal", className }: AlphaProps) {
  const { color, setComponent } = useColorPickerContext();
  const isVertical = orientation === "vertical";
  const opaque = formatColor({ ...color, alpha: 1 }, "rgb");
  const transparent = formatColor({ ...color, alpha: 0 }, "rgb");

  return (
    <Slider.Root
      data-slot="color-picker-alpha"
      value={color.alpha * 100}
      onValueChange={(v) => setComponent("alpha", (v as number) / 100)}
      min={0}
      max={100}
      step={1}
      largeStep={10}
      orientation={orientation}
      aria-label="Opacity"
      className={cn(
        "relative touch-none select-none",
        isVertical ? "h-32 w-3" : "h-3 w-full",
        className,
      )}
    >
      <Slider.Control className="relative h-full w-full rounded-full outline-none">
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{ backgroundImage: CHECKERBOARD, backgroundSize: "12px 12px" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: isVertical
                ? `linear-gradient(to bottom, ${transparent}, ${opaque})`
                : `linear-gradient(to right, ${transparent}, ${opaque})`,
            }}
          />
        </div>
        <Slider.Thumb
          className={cn(
            "absolute size-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
          )}
          style={{ background: opaque }}
        />
      </Slider.Control>
    </Slider.Root>
  );
}

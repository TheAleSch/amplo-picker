"use client";

import * as React from "react";
import { Slider } from "@base-ui/react/slider";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { formatColor } from "@/registry/new-york/color-picker/lib/color";
import { cn } from "@/lib/utils";

// See Hue: omit `defaultValue` (Slider.Root owns it as a number).
export interface AlphaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  orientation?: "horizontal" | "vertical";
}

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

export const Alpha = React.forwardRef<HTMLDivElement, AlphaProps>(function Alpha(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
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
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{ backgroundImage: CHECKERBOARD, backgroundSize: "12px 12px" }}
        >
          <div
            className="absolute inset-0"
            style={{
              // Vertical uses `to top` so transparent (alpha 0, the min) sits
              // at the bottom to match Base UI's bottom-anchored vertical thumb.
              background: isVertical
                ? `linear-gradient(to top, ${transparent}, ${opaque})`
                : `linear-gradient(to right, ${transparent}, ${opaque})`,
            }}
          />
        </div>
        <Slider.Thumb
          aria-label="Opacity"
          getAriaValueText={(_, value) => `${Math.round(value)}%`}
          className={cn(
            "absolute size-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
            "outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-popover",
          )}
          style={{ background: opaque }}
        />
      </Slider.Control>
    </Slider.Root>
  );
});

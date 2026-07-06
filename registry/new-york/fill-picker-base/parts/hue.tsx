"use client";

import * as React from "react";
import { Slider } from "@base-ui/react/slider";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import {
  findMaxChroma,
  gamutFromFormat,
  hslHue,
  hsbHue,
} from "@/registry/new-york/color-picker/lib/color";
import { setColorChannel } from "@/registry/new-york/color-picker/lib/channels";
import { cn } from "@/lib/utils";

// `defaultValue` is omitted because Base UI's Slider.Root types it as a number
// (its own controlled/uncontrolled value), which conflicts with the string-ish
// `defaultValue` on React.HTMLAttributes.
export interface HueProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  orientation?: "horizontal" | "vertical";
}

/**
 * Base UI port of the hue slider.
 *
 * The interesting parts that survive the port:
 *   1. We still display the *format-active* hue (HSL/HSB hue ≠ OKLCH hue for
 *      the same color), so the slider position lines up with ChannelInput's H.
 *   2. On OKLCH-driven formats we preserve "saturation" (the area bead's X
 *      position) by rescaling chroma to the new hue's max — green has less
 *      max chroma than red in P3, so absolute chroma would drift out of gamut.
 *
 * Base UI gives us keyboard, ARIA, focus management, and pointer handling for
 * free. We provide the value pipeline and paint the track + thumb.
 */
export const Hue = React.forwardRef<HTMLDivElement, HueProps>(function Hue(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
  const { color, format, setColor } = useColorPickerContext();

  const usesFormatHue = format === "hsl" || format === "hsb";
  const displayedHue = React.useMemo(() => {
    if (format === "hsl") return hslHue(color);
    if (format === "hsb") return hsbHue(color);
    return color.h;
  }, [format, color]);

  const commitHue = React.useCallback(
    (newH: number) => {
      const wrapped = ((newH % 360) + 360) % 360;
      if (usesFormatHue) {
        setColor(setColorChannel(color, format, "h", wrapped));
        return;
      }
      const gamut = gamutFromFormat(format);
      const oldMaxC = findMaxChroma(color.l, color.h, gamut);
      const newMaxC = findMaxChroma(color.l, wrapped, gamut);
      const saturation = oldMaxC > 1e-6 ? color.c / oldMaxC : 0;
      const nextC = saturation * newMaxC;
      setColor({ ...color, h: wrapped, c: nextC });
    },
    [color, format, setColor, usesFormatHue],
  );

  const isVertical = orientation === "vertical";
  // Vertical uses `to top` so the min (hue 0) is painted at the bottom —
  // Base UI's vertical Slider anchors its thumb from the bottom edge
  // (startEdge = "bottom"), so a `to bottom` gradient would read inverted.
  const gradient = isVertical
    ? "linear-gradient(to top, oklch(0.7 0.25 0), oklch(0.7 0.25 60), oklch(0.7 0.25 120), oklch(0.7 0.25 180), oklch(0.7 0.25 240), oklch(0.7 0.25 300), oklch(0.7 0.25 360))"
    : "linear-gradient(to right, oklch(0.7 0.25 0), oklch(0.7 0.25 60), oklch(0.7 0.25 120), oklch(0.7 0.25 180), oklch(0.7 0.25 240), oklch(0.7 0.25 300), oklch(0.7 0.25 360))";

  return (
    <Slider.Root
      data-slot="color-picker-hue"
      value={displayedHue}
      onValueChange={(v) => commitHue(v as number)}
      min={0}
      max={360}
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
        className="relative h-full w-full rounded-full outline-none"
        style={{ background: gradient }}
      >
        <Slider.Thumb
          // aria-label + getAriaValueText go on the Thumb: Base UI renders the
          // role="slider" input inside the Thumb, so the accessible name and
          // value text must live here (not on Slider.Root, which is a group).
          // Focus ring uses `has-[:focus-visible]`: the real role="slider"
          // <input> is a child of this thumb <div>, so the div itself never
          // matches :focus-visible directly. (Base UI's data-focused only
          // appears inside a Field.Root, which we don't use.)
          aria-label="Hue"
          getAriaValueText={(_, value) => `${Math.round(value)} degrees`}
          className={cn(
            "absolute size-4 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
            "outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-popover",
          )}
          style={{ background: `oklch(0.7 0.25 ${displayedHue})` }}
        />
      </Slider.Control>
    </Slider.Root>
  );
});

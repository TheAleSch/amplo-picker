"use client";

import * as React from "react";
import { converter } from "culori";
import { useColorPickerContext } from "../context";
import { findMaxChroma, gamutFromFormat } from "../lib/color";
import { setColorChannel } from "../lib/channels";
import { cn } from "@/lib/utils";

const toHsl = converter("hsl");
const toHsv = converter("hsv");

export interface HueProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

export const Hue = React.forwardRef<HTMLDivElement, HueProps>(function Hue(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
  const { color, format, setColor } = useColorPickerContext();

  // Slider tracks the active format's hue scale so the position matches the
  // value shown in ChannelInput. OKLCH hue ≠ HSL/HSB hue for the same color
  // (red is OKLCH ~29° / HSL 0°), so an OKLCH-driven slider feels broken to
  // users editing in HSL/HSB. For formats without a hue channel (hex, rgb,
  // p3, oklab) we fall back to OKLCH hue.
  const usesFormatHue = format === "hsl" || format === "hsb";
  const displayedHue = React.useMemo(() => {
    if (format === "hsl") {
      const c = toHsl({ mode: "oklch", l: color.l, c: color.c, h: color.h });
      return c?.h ?? color.h;
    }
    if (format === "hsb") {
      const c = toHsv({ mode: "oklch", l: color.l, c: color.c, h: color.h });
      return c?.h ?? color.h;
    }
    return color.h;
  }, [format, color.l, color.c, color.h]);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => trackRef.current as HTMLDivElement);

  // When the hue changes, max chroma at (L, H, gamut) changes too. Preserving
  // absolute chroma would push the color out of the active gamut as the user
  // scrolls into a more constrained hue (e.g. green has less max chroma than
  // red in P3). Preserve "saturation" — the bead's X position in the area —
  // by rescaling chroma to the new hue's max. The bead stays put; the badge
  // stays green.
  const commitHue = React.useCallback(
    (newH: number) => {
      const wrapped = ((newH % 360) + 360) % 360;
      // HSL/HSB: write hue through the active format so the channel input's
      // H value matches the slider exactly (no OKLCH↔HSL hue drift).
      if (usesFormatHue) {
        setColor(setColorChannel(color, format, "h", wrapped));
        return;
      }
      // OKLCH path: rescale chroma to preserve "saturation" — the bead's X
      // position in the area — as max chroma at (L, H, gamut) shifts with
      // hue (e.g. green has less max chroma than red in P3).
      const gamut = gamutFromFormat(format);
      const oldMaxC = findMaxChroma(color.l, color.h, gamut);
      const newMaxC = findMaxChroma(color.l, wrapped, gamut);
      const saturation = oldMaxC > 1e-6 ? color.c / oldMaxC : 0;
      const nextC = saturation * newMaxC;
      setColor({ ...color, h: wrapped, c: nextC });
    },
    [color, format, setColor, usesFormatHue],
  );

  const moveTo = (clientCoord: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio =
      orientation === "horizontal"
        ? (clientCoord - rect.left) / rect.width
        : (clientCoord - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, ratio));
    commitHue(clamped * 360);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    moveTo(orientation === "horizontal" ? e.clientX : e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    moveTo(orientation === "horizontal" ? e.clientX : e.clientY);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 10 : 1;
    let next = displayedHue;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next -= big;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next += big;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 360;
        break;
      case "PageUp":
        next += 25;
        break;
      case "PageDown":
        next -= 25;
        break;
      default:
        return;
    }
    e.preventDefault();
    commitHue(next);
  };

  const pos = (((displayedHue % 360) + 360) % 360) / 360;
  const isVertical = orientation === "vertical";

  return (
    <div
      ref={trackRef}
      data-slot="color-picker-hue"
      role="slider"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(displayedHue)}
      aria-valuetext={`${Math.round(displayedHue)} degrees`}
      aria-orientation={orientation}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "relative cursor-pointer rounded-full outline-none touch-none",
        isVertical ? "h-32 w-3" : "h-3 w-full",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        className,
      )}
      style={{
        background: isVertical
          ? "linear-gradient(to bottom, oklch(0.7 0.18 0), oklch(0.7 0.18 60), oklch(0.7 0.18 120), oklch(0.7 0.18 180), oklch(0.7 0.18 240), oklch(0.7 0.18 300), oklch(0.7 0.18 360))"
          : "linear-gradient(to right, oklch(0.7 0.18 0), oklch(0.7 0.18 60), oklch(0.7 0.18 120), oklch(0.7 0.18 180), oklch(0.7 0.18 240), oklch(0.7 0.18 300), oklch(0.7 0.18 360))",
      }}
      {...rest}
    >
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
        style={
          isVertical
            ? { left: "50%", top: `calc(${pos} * (100% - 16px) + 8px)`, background: `oklch(0.7 0.18 ${displayedHue})` }
            : { left: `calc(${pos} * (100% - 16px) + 8px)`, top: "50%", background: `oklch(0.7 0.18 ${displayedHue})` }
        }
      />
    </div>
  );
});

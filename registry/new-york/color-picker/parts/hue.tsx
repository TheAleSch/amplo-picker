"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { cn } from "@/lib/utils";

export interface HueProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

export const Hue = React.forwardRef<HTMLDivElement, HueProps>(function Hue(
  { orientation = "horizontal", className, ...rest },
  ref,
) {
  const { color, setComponent } = useColorPickerContext();
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => trackRef.current as HTMLDivElement);

  const moveTo = (clientCoord: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio =
      orientation === "horizontal"
        ? (clientCoord - rect.left) / rect.width
        : (clientCoord - rect.top) / rect.height;
    const clamped = Math.max(0, Math.min(1, ratio));
    setComponent("h", clamped * 360);
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
    let next = color.h;
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
    setComponent("h", next);
  };

  const pos = (color.h % 360) / 360;
  const isVertical = orientation === "vertical";

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(color.h)}
      aria-valuetext={`${Math.round(color.h)} degrees`}
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
            ? { left: "50%", top: `${pos * 100}%`, background: `oklch(0.7 0.18 ${color.h})` }
            : { left: `${pos * 100}%`, top: "50%", background: `oklch(0.7 0.18 ${color.h})` }
        }
      />
    </div>
  );
});

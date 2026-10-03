"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { usePointerDrag } from "./pointer-drag";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";
import { CHECKERBOARD_LG } from "../lib/constants";

export interface AlphaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

export const Alpha = React.forwardRef<HTMLDivElement, AlphaProps>(function Alpha(
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
        : // Vertical is bottom-anchored (min at the bottom), matching the
          // Base UI variant and ArrowUp = increase.
          1 - (clientCoord - rect.top) / rect.height;
    setComponent("alpha", Math.max(0, Math.min(1, ratio)));
  };

  const onPointerDown = usePointerDrag((x, y) =>
    moveTo(orientation === "horizontal" ? x : y),
  );
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 0.1 : 0.01;
    let next = color.alpha;
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
        next = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setComponent("alpha", next);
  };

  const isVertical = orientation === "vertical";
  const opaque = formatColor({ ...color, alpha: 1 }, "rgb");
  const transparent = formatColor({ ...color, alpha: 0 }, "rgb");

  return (
    <div
      ref={trackRef}
      data-slot="color-picker-alpha"
      role="slider"
      aria-label="Opacity"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(color.alpha * 100)}
      aria-valuetext={`${Math.round(color.alpha * 100)} percent`}
      aria-orientation={orientation}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "relative cursor-pointer rounded-full outline-none touch-none",
        // WCAG 2.5.8: the visual track stays 12px thin, but a pseudo-element
        // widens the pointer target to 24px on the thin axis.
        isVertical
          ? "h-32 w-3 before:absolute before:-inset-x-1.5 before:content-['']"
          : "h-3 w-full before:absolute before:-inset-y-1.5 before:content-['']",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        className,
      )}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          backgroundImage: CHECKERBOARD_LG,
          backgroundSize: "12px 12px",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: isVertical
              ? `linear-gradient(to top, ${transparent}, ${opaque})`
              : `linear-gradient(to right, ${transparent}, ${opaque})`,
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
        style={
          isVertical
            ? { left: "50%", top: `calc((1 - ${color.alpha}) * (100% - 16px) + 8px)`, background: opaque }
            : { left: `calc(${color.alpha} * (100% - 16px) + 8px)`, top: "50%", background: opaque }
        }
      />
    </div>
  );
});

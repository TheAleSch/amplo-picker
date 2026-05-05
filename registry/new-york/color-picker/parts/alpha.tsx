"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";

export interface AlphaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

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
        : (clientCoord - rect.top) / rect.height;
    setComponent("alpha", Math.max(0, Math.min(1, ratio)));
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
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "relative cursor-pointer rounded-full outline-none touch-none",
        isVertical ? "h-32 w-3" : "h-3 w-full",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        className,
      )}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          backgroundImage: CHECKERBOARD,
          backgroundSize: "12px 12px",
        }}
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
      <div
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
        style={
          isVertical
            ? { left: "50%", top: `${color.alpha * 100}%`, background: opaque }
            : { left: `${color.alpha * 100}%`, top: "50%", background: opaque }
        }
      />
    </div>
  );
});

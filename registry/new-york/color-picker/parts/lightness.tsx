"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";

export interface LightnessProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

export const Lightness = React.forwardRef<HTMLDivElement, LightnessProps>(
  function Lightness({ orientation = "horizontal", className, ...rest }, ref) {
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
      setComponent("l", clamped);
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      moveTo(orientation === "horizontal" ? e.clientX : e.clientY);
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      moveTo(orientation === "horizontal" ? e.clientX : e.clientY);
    };
    const releaseCapture = (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget as HTMLDivElement;
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const big = e.shiftKey ? 0.1 : 0.01;
      let next = color.l;
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
        case "PageUp":
          next += 0.1;
          break;
        case "PageDown":
          next -= 0.1;
          break;
        default:
          return;
      }
      e.preventDefault();
      setComponent("l", next);
    };

    const isVertical = orientation === "vertical";
    // Build the gradient at the current hue & chroma so users see how lightness
    // changes _their_ color, not a generic black→white ramp.
    const stops = React.useMemo(() => {
      const samples = 8;
      const arr: string[] = [];
      for (let i = 0; i <= samples; i++) {
        const l = i / samples;
        arr.push(formatColor({ ...color, l, alpha: 1 }, "oklch"));
      }
      return arr.join(", ");
    }, [color.h, color.c]);

    return (
      <div
        ref={trackRef}
        data-slot="color-picker-lightness"
        role="slider"
        aria-label="Lightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(color.l * 100)}
        aria-valuetext={`${Math.round(color.l * 100)} percent`}
        aria-orientation={orientation}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releaseCapture}
        onPointerCancel={releaseCapture}
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
        style={{
          background: isVertical
            ? `linear-gradient(to bottom, ${stops})`
            : `linear-gradient(to right, ${stops})`,
        }}
        {...rest}
      >
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]"
          style={
            isVertical
              ? {
                  left: "50%",
                  top: `calc(${color.l} * (100% - 16px) + 8px)`,
                  background: formatColor({ ...color, alpha: 1 }, "oklch"),
                }
              : {
                  left: `calc(${color.l} * (100% - 16px) + 8px)`,
                  top: "50%",
                  background: formatColor({ ...color, alpha: 1 }, "oklch"),
                }
          }
        />
      </div>
    );
  },
);

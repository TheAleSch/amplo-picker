"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";

/**
 * OKLCH chroma is unbounded in principle but practically maxes out
 * around ~0.4 for the wide hues; gamut-clamping handles anything
 * higher. Matches the slider/typed range in `lib/channels.ts`.
 */
const CHROMA_MAX = 0.4;

export interface ChromaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> {
  orientation?: "horizontal" | "vertical";
}

export const Chroma = React.forwardRef<HTMLDivElement, ChromaProps>(
  function Chroma({ orientation = "horizontal", className, ...rest }, ref) {
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
      setComponent("c", clamped * CHROMA_MAX);
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
      const big = e.shiftKey ? 0.05 : 0.005;
      let next = color.c;
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
          next = CHROMA_MAX;
          break;
        case "PageUp":
          next += 0.05;
          break;
        case "PageDown":
          next -= 0.05;
          break;
        default:
          return;
      }
      e.preventDefault();
      setComponent("c", Math.max(0, Math.min(CHROMA_MAX, next)));
    };

    const isVertical = orientation === "vertical";
    // Build the gradient at the current hue & lightness so the ramp shows
    // how chroma changes _their_ color, not a generic gray→vivid ramp.
    const stops = React.useMemo(() => {
      const samples = 8;
      const arr: string[] = [];
      for (let i = 0; i <= samples; i++) {
        const c = (i / samples) * CHROMA_MAX;
        arr.push(formatColor({ ...color, c, alpha: 1 }, "oklch"));
      }
      return arr.join(", ");
    }, [color.h, color.l]);

    const ratio = Math.max(0, Math.min(1, color.c / CHROMA_MAX));

    return (
      <div
        ref={trackRef}
        data-slot="color-picker-chroma"
        role="slider"
        aria-label="Chroma"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuetext={`${color.c.toFixed(3)}`}
        aria-orientation={orientation}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={releaseCapture}
        onPointerCancel={releaseCapture}
        onKeyDown={onKeyDown}
        className={cn(
          "relative cursor-pointer rounded-full outline-none touch-none",
          isVertical ? "h-32 w-3" : "h-3 w-full",
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
                  top: `calc(${ratio} * (100% - 16px) + 8px)`,
                  background: formatColor({ ...color, alpha: 1 }, "oklch"),
                }
              : {
                  left: `calc(${ratio} * (100% - 16px) + 8px)`,
                  top: "50%",
                  background: formatColor({ ...color, alpha: 1 }, "oklch"),
                }
          }
        />
      </div>
    );
  },
);

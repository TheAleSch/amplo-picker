"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, type LinearGradient } from "../../lib/gradient";
import { formatColor } from "../../lib/color";

export interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bar height in px. Defaults to 24. */
  height?: number;
}

function buildPreviewGradient(
  g: ReturnType<typeof useGradientPickerContext>["gradient"],
): string {
  // For the bar preview we always render the stops as a horizontal linear
  // gradient regardless of the live gradient type — the bar is the editing
  // surface for stop positions.
  const linear: LinearGradient = {
    type: "linear",
    angle: 90,
    interp: g.interp,
    stops: g.stops,
  };
  return formatGradient(linear);
}

export const Bar = React.forwardRef<HTMLDivElement, BarProps>(function Bar(
  { className, height = 24, ...rest },
  ref,
) {
  const ctx = useGradientPickerContext();
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => trackRef.current as HTMLDivElement);

  const positionFromEvent = React.useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return; // handles handle their own drag
    const pos = positionFromEvent(e.clientX);
    ctx.addStop(pos);
  };

  const startStopDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    ctx.selectStop(id);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dy = ev.clientY - rect.bottom;
      // Drag handle below the bar by more than 24px → remove stop.
      if (dy > 24 && ctx.stops.length > 1) {
        ctx.removeStop(id);
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        return;
      }
      ctx.moveStop(id, positionFromEvent(ev.clientX));
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  const onStopKeyDown =
    (id: string, position: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.moveStop(id, position - step);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.moveStop(id, position + step);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        ctx.removeStop(id);
      }
    };

  return (
    <div
      data-slot="gradient-bar"
      className={cn("relative w-full select-none", className)}
      style={{ height }}
      {...rest}
    >
      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        className="absolute inset-0 rounded-md border border-border"
        style={{
          background: `${buildPreviewGradient(ctx.gradient)}, repeating-conic-gradient(#bbb 0 25%, #fff 0 50%) 0 0/8px 8px`,
        }}
      />
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        return (
          <div
            key={s.id}
            role="slider"
            aria-label={`Stop at ${Math.round(s.position * 100)}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(s.position * 100)}
            aria-current={selected ? "true" : undefined}
            tabIndex={0}
            onPointerDown={startStopDrag(s.id)}
            onFocus={() => ctx.selectStop(s.id)}
            onKeyDown={onStopKeyDown(s.id, s.position)}
            style={{
              left: `${s.position * 100}%`,
              width: height,
              height,
              background: formatColor(s.color, "oklch"),
            }}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow-sm",
              selected && "outline-2 outline-offset-1 outline-ring",
            )}
          />
        );
      })}
    </div>
  );
});

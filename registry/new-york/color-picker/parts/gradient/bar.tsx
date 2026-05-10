"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  formatGradient,
  sampleStopsAt,
  type LinearGradient,
} from "../../lib/gradient";
import { formatColor } from "../../lib/color";

export interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Track height in px. Defaults to 12 to match `<ColorPicker.Hue>`. */
  height?: number;
  /** Handle (stop) diameter in px. Defaults to 16 to match the Hue thumb. */
  handleSize?: number;
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
  { className, height = 12, handleSize = 16, ...rest },
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
    ctx.addStop(pos, sampleStopsAt(ctx.stops, pos));
  };

  const startStopDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    ctx.selectStop(id);

    // Listen on document, not the handle DOM node. moveStop reorders the
    // stops array, and React reconciles the per-stop <div>s in their new
    // order; if we captured/listened on the original handle element, a
    // sibling handle could end up under the pointer and steal the gesture.
    // Document-level listeners + an `id` captured in closure keep the drag
    // bound to the originally-clicked stop regardless of reordering.
    let pendingRemove = false;
    const onMove = (ev: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dy = ev.clientY - rect.bottom;
      // Mark for removal while dragged below the bar by more than 24px,
      // but only commit on release so the user can drag back up to cancel.
      pendingRemove = dy > 24 && ctx.stops.length > 1;
      if (!pendingRemove) ctx.moveStop(id, positionFromEvent(ev.clientX));
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (pendingRemove) ctx.removeStop(id);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
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
        className="absolute inset-0 rounded-full border border-border"
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
              // Match the Hue thumb's positioning math: inset the centerline
              // by handleSize/2 so pos=0/1 sit flush with the track edges.
              left: `calc(${s.position} * (100% - ${handleSize}px) + ${handleSize / 2}px)`,
              width: handleSize,
              height: handleSize,
              background: formatColor(s.color, "oklch"),
            }}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.6)]",
              selected && "outline-2 outline-offset-1 outline-ring",
            )}
          />
        );
      })}
    </div>
  );
});

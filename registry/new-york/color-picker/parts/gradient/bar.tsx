"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  adjustStopsForEndpoints,
  formatGradient,
  projectStopPosition,
  reverseProjectStopPosition,
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
  // surface for stop positions. When the live gradient is a positioned
  // linear with `start`/`end`, mirror the same stop projection used at CSS
  // emit time so the Bar shows the *visible* stop positions.
  const stops =
    g.type === "linear" && g.start && g.end
      ? adjustStopsForEndpoints(g.stops, g.start, g.end)
      : g.stops;
  const linear: LinearGradient = {
    type: "linear",
    angle: 90,
    interp: g.interp,
    stops,
  };
  return formatGradient(linear);
}

export const Bar = React.forwardRef<HTMLDivElement, BarProps>(function Bar(
  { className, height = 12, handleSize = 16, ...rest },
  ref,
) {
  const ctx = useGradientPickerContext();
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  // Cleanup hook for an active drag's document-level listeners. Lets us tear
  // them down on unmount so a mid-drag remove of the Bar doesn't leave them
  // attached to `document` and firing `ctx.moveStop` on a stale context.
  const activeDragCleanupRef = React.useRef<(() => void) | null>(null);
  React.useEffect(
    () => () => {
      activeDragCleanupRef.current?.();
      activeDragCleanupRef.current = null;
    },
    [],
  );
  // Forward the consumer's ref to the outer wrapper (the element that carries
  // `data-slot="gradient-bar"`) so `wrapper.querySelector('[data-slot="gradient-bar"]')`
  // works as expected; pointer math still uses the inner trackRef.
  React.useImperativeHandle(ref, () => wrapperRef.current as HTMLDivElement);

  // When the live gradient is positioned-linear, stop positions are projected
  // onto the CSS gradient line for display + pointer math. Authored values
  // (what's written to `stop.position`) stay 0..1 along the segment.
  const linear = ctx.gradient.type === "linear" ? ctx.gradient : null;
  const start = linear?.start;
  const end = linear?.end;
  const toDisplay = (authored: number) =>
    projectStopPosition(authored, start, end);
  const fromDisplay = (displayed: number) =>
    reverseProjectStopPosition(displayed, start, end);

  const displayedPositionFromEvent = React.useCallback(
    (clientX: number): number => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [],
  );

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return; // handles handle their own drag
    const displayed = displayedPositionFromEvent(e.clientX);
    const authored = Math.max(0, Math.min(1, fromDisplay(displayed)));
    ctx.addStop(authored, sampleStopsAt(ctx.stops, authored));
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
      if (!pendingRemove) {
        const displayed = displayedPositionFromEvent(ev.clientX);
        ctx.moveStop(id, fromDisplay(displayed));
      }
    };
    const cleanup = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      activeDragCleanupRef.current = null;
    };
    const onUp = () => {
      cleanup();
      if (pendingRemove) ctx.removeStop(id);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    activeDragCleanupRef.current = cleanup;
  };

  const startHintDrag =
    (hintStopId: string, prevPos: number, nextPos: number) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      // Hints live in *authored* space (0..1 on the CSS gradient line) —
      // same space the surrounding stops use. Clamp inside the (prev, next)
      // interval so the diamond can't cross either neighbor; CSS midpoint
      // hints outside that range are invalid per spec.
      const onMove = (ev: PointerEvent) => {
        const displayed = displayedPositionFromEvent(ev.clientX);
        const authored = fromDisplay(displayed);
        const eps = 1e-4;
        const clamped = Math.max(
          prevPos + eps,
          Math.min(nextPos - eps, authored),
        );
        ctx.setStopHint(hintStopId, clamped);
      };
      const cleanup = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
        activeDragCleanupRef.current = null;
      };
      const onUp = () => cleanup();
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
      activeDragCleanupRef.current = cleanup;
    };

  const onStopKeyDown =
    (id: string, position: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      // Nudge in *displayed* space so a 1% press visibly moves the stop the
      // same distance on screen regardless of whether the gradient is
      // positioned-linear or angle-only.
      const displayed = toDisplay(position);
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.moveStop(id, fromDisplay(displayed - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.moveStop(id, fromDisplay(displayed + step));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        ctx.removeStop(id);
      }
    };

  return (
    <div
      ref={wrapperRef}
      data-slot="gradient-bar"
      className={cn("group/bar relative w-full select-none", className)}
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
      {ctx.stops.map((s, i) => {
        if (i === 0) return null;
        const prev = ctx.stops[i - 1];
        // Auto midpoint when no hint is set — matches CSS default behavior.
        const authored = s.hint ?? (prev.position + s.position) / 2;
        const displayed = Math.max(0, Math.min(1, toDisplay(authored)));
        const active = s.hint !== undefined;
        return (
          <div
            key={`hint-${s.id}`}
            role="slider"
            aria-label={`Midpoint hint between stops ${i} and ${i + 1}`}
            aria-valuemin={Math.round(toDisplay(prev.position) * 100)}
            aria-valuemax={Math.round(toDisplay(s.position) * 100)}
            aria-valuenow={Math.round(displayed * 100)}
            tabIndex={-1}
            onPointerDown={startHintDrag(s.id, prev.position, s.position)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              ctx.setStopHint(s.id, undefined);
            }}
            style={{
              left: `${displayed * 100}%`,
              width: handleSize * 0.6,
              height: handleSize * 0.6,
            }}
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab rounded-xs border border-white/80 bg-foreground/70 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] transition-opacity",
              active
                ? "opacity-100"
                : "opacity-0 group-hover/bar:opacity-40 hover:opacity-100!",
            )}
          />
        );
      })}
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        const displayed = Math.max(0, Math.min(1, toDisplay(s.position)));
        const displayedPct = Math.round(displayed * 100);
        return (
          <div
            key={s.id}
            role="slider"
            aria-label={`Stop at ${displayedPct}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={displayedPct}
            aria-valuetext={`${displayedPct} percent`}
            aria-orientation="horizontal"
            aria-current={selected ? "true" : undefined}
            tabIndex={0}
            onPointerDown={startStopDrag(s.id)}
            onFocus={() => ctx.selectStop(s.id)}
            onKeyDown={onStopKeyDown(s.id, s.position)}
            style={{
              // Match the Hue thumb's positioning math: inset the centerline
              // by handleSize/2 so pos=0/1 sit flush with the track edges.
              left: `calc(${displayed} * (100% - ${handleSize}px) + ${handleSize / 2}px)`,
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

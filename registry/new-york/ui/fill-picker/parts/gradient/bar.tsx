"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useGradientPickerContext,
  useGradientStopEditor,
} from "../../contexts/gradient";
import {
  adjustStopsForEndpoints,
  formatGradient,
  projectStopPosition,
  reverseProjectStopPosition,
  sampleStopsAt,
  type LinearGradient,
} from "../../lib/gradient";
import { formatColor } from "../../lib/color";
import { focusNeighborIn } from "./stop-list-shared";
import { useLiveAnnounce } from "../use-live-announce";

export interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Track height in px. Defaults to 12 to match `<ColorPicker.Hue>`. */
  height?: number;
  /** Handle (stop) diameter in px. Defaults to 16 to match the Hue thumb. */
  handleSize?: number;
  /**
   * Open the stop-color editor popover when a handle is clicked without
   * being dragged. Drag is still the canonical way to reposition a stop —
   * the click-vs-drag distinction is movement-based, so flicking the
   * handle even a pixel keeps the popover closed. Defaults to `false`.
   */
  editOnClick?: boolean;
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
  { className, height = 12, handleSize = 16, editOnClick = false, ...rest },
  ref,
) {
  // Which stop's editor popover is open (null = none). Only meaningful
  // when `editOnClick` is true.
  const [openStopId, setOpenStopId] = React.useState<string | null>(null);
  const ctx = useGradientPickerContext();
  const stopEditor = useGradientStopEditor();
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [liveText, announce] = useLiveAnnounce();
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

  // A stop added by clicking the track becomes the selected stop, but the
  // click landed on the track — which isn't focusable — so focus stays on
  // <body> and the new stop can't be nudged or deleted from the keyboard.
  // Its handle doesn't exist until the next render, hence the deferral.
  const pendingFocusIdRef = React.useRef<string | null>(null);
  React.useLayoutEffect(() => {
    const id = pendingFocusIdRef.current;
    if (!id) return;
    pendingFocusIdRef.current = null;
    // Matched by walking the handles rather than an attribute selector:
    // stop ids can come from the consumer now, so they aren't guaranteed
    // to be selector-safe.
    const handles = wrapperRef.current?.querySelectorAll<HTMLElement>(
      '[role="slider"]',
    );
    handles?.forEach((h) => {
      if (h.dataset.stopId === id) h.focus();
    });
  });

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return; // handles handle their own drag
    // Canceling pointerdown suppresses the compatibility mousedown, and with
    // it the browser's default focus handling. Without this the layout effect
    // below focuses the new handle and the browser immediately takes it back
    // — clicking a non-focusable element blurs to <body> — so the stop you
    // just placed still wouldn't take Delete or the arrow keys.
    e.preventDefault();
    const displayed = displayedPositionFromEvent(e.clientX);
    // No clamp on the authored value: on a positioned linear, clicks outside
    // the projected [start, end] segment extrapolate (< 0 / > 1 are legal
    // CSS stop positions), so the stop lands where the user clicked instead
    // of stacking on the first/last stop. Plain mode is unaffected —
    // fromDisplay is the identity and `displayed` is already 0..1.
    const authored = fromDisplay(displayed);
    pendingFocusIdRef.current = ctx.addStop(
      authored,
      sampleStopsAt(ctx.stops, authored),
    );
  };

  const startStopDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    // preventDefault keeps the browser from starting a text selection or a
    // native drag mid-gesture, but it also suppresses the focus a pointerdown
    // would normally give the handle. Focus it explicitly: without this a
    // clicked stop looks selected yet keyboard keys (nudge, Delete) go to
    // <body> and do nothing.
    e.preventDefault();
    e.currentTarget.focus();
    ctx.selectStop(id);

    // Listen on document, not the handle DOM node. moveStop reorders the
    // stops array, and React reconciles the per-stop <div>s in their new
    // order; if we captured/listened on the original handle element, a
    // sibling handle could end up under the pointer and steal the gesture.
    // Document-level listeners + an `id` captured in closure keep the drag
    // bound to the originally-clicked stop regardless of reordering.
    let pendingRemove = false;
    // Track pointer movement so pointerUp can tell a tap from a drag —
    // 3px slack absorbs the jitter of a deliberate click.
    const startX = e.clientX;
    const startY = e.clientY;
    // Document-level listeners see every pointer; only the one that started
    // this drag may steer or end it (multi-touch).
    const dragPointerId = e.pointerId;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerId) return;
      // Self-heal a missed release: without pointer capture, letting go of
      // the button outside the browser window never delivers pointerup, so
      // the first re-entry move arrives with no buttons pressed. End the
      // drag instead of letting the stop chase the cursor.
      if (ev.buttons === 0) {
        cleanup();
        if (pendingRemove) ctx.removeStop(id);
        return;
      }
      if (!moved) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dx * dx + dy * dy > 9) moved = true;
      }
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dy = ev.clientY - rect.bottom;
      // Mark for removal while dragged below the bar by more than 24px,
      // but only commit on release so the user can drag back up to cancel.
      pendingRemove = dy > 24 && ctx.stops.length > 1;
      if (!pendingRemove && moved) {
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
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== dragPointerId) return;
      cleanup();
      if (pendingRemove) ctx.removeStop(id);
      else if (!moved && editOnClick) setOpenStopId(id);
    };
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
      // Clamp in displayed space: keyboard nudges stay on the visible track
      // (moveStop itself no longer clamps, to allow extrapolated stops).
      const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.moveStop(id, fromDisplay(clamp01(displayed - step)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.moveStop(id, fromDisplay(clamp01(displayed + step)));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        // A gradient needs at least two stops; `removeStop` refuses below
        // that. The StopList's mouse affordance conveys this by rendering
        // its remove button `disabled` — the Bar handle has no such visual,
        // so announce instead of failing silently.
        if (ctx.stops.length <= 1) {
          announce("Cannot remove the last stop");
          return;
        }
        // Move focus to a neighboring handle *before* removal, mirroring
        // StopList: the focused node is about to unmount, and without this
        // focus falls to <body> and keyboard navigation is lost.
        focusNeighborIn(wrapperRef.current, e.currentTarget, '[role="slider"]');
        ctx.removeStop(id);
        announce("Stop removed");
      }
    };

  return (
    <div
      ref={wrapperRef}
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
        const displayed = Math.max(0, Math.min(1, toDisplay(s.position)));
        const displayedPct = Math.round(displayed * 100);
        const handle = (
          <div
            role="slider"
            data-stop-id={s.id}
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
              // WCAG 2.5.8: small visual dot, ≥24px pointer target.
              "before:absolute before:-inset-1.5 before:content-['']",
              selected && "outline-2 outline-offset-1 outline-ring",
            )}
          />
        );
        // The editor is a slot, not an import: the Bar is shared by both
        // variants, so the dialect-specific editor is injected by the barrel
        // (see `GradientStopEditorRenderer`). Without one — or without
        // `editOnClick` — the handle renders bare.
        if (!editOnClick || !stopEditor)
          return <React.Fragment key={s.id}>{handle}</React.Fragment>;
        return (
          <React.Fragment key={s.id}>
            {stopEditor({
              stopId: s.id,
              open: openStopId === s.id,
              onOpenChange: (o) => setOpenStopId(o ? s.id : null),
              children: handle,
            })}
          </React.Fragment>
        );
      })}
      <span aria-live="polite" className="sr-only">
        {liveText}
      </span>
    </div>
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { useLiveAnnounce } from "../use-live-announce";

export interface PositionPadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const PositionPad = React.forwardRef<HTMLDivElement, PositionPadProps>(
  function PositionPad({ className, size = 32, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);
    // role="application" is silent under keyboard — announce moves politely.
    const [liveText, announce] = useLiveAnnounce();

    if (ctx.gradient.type === "linear") return null;
    const center = ctx.gradient.center;

    const fromEvent = (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return center;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
      };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      ctx.setCenter(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        ctx.setCenter(fromEvent(ev.clientX, ev.clientY));
      const cleanup = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          // pointer may already be released on cancel
        }
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", cleanup);
        target.removeEventListener("pointercancel", cleanup);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", cleanup);
      target.addEventListener("pointercancel", cleanup);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      const clamp = (n: number) => Math.max(0, Math.min(1, n));
      let next: { x: number; y: number };
      if (e.key === "ArrowLeft") {
        next = { x: clamp(center.x - step), y: center.y };
      } else if (e.key === "ArrowRight") {
        next = { x: clamp(center.x + step), y: center.y };
      } else if (e.key === "ArrowUp") {
        next = { x: center.x, y: clamp(center.y - step) };
      } else if (e.key === "ArrowDown") {
        next = { x: center.x, y: clamp(center.y + step) };
      } else {
        return;
      }
      e.preventDefault();
      ctx.setCenter(next);
      announce(
        `x ${Math.round(next.x * 100)}%, y ${Math.round(next.y * 100)}%`,
      );
    };

    return (
      <div
        ref={padRef}
        data-slot="gradient-position-pad"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        role="application"
        aria-label={`Gradient position, x ${Math.round(center.x * 100)}%, y ${Math.round(center.y * 100)}%`}
        aria-roledescription="2D pad for gradient center"
        tabIndex={0}
        style={{ width: size, height: size }}
        className={cn(
          "relative shrink-0 cursor-crosshair rounded-md border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...rest}
      >
        <span aria-live="polite" className="sr-only">
          {liveText}
        </span>
        <div
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-foreground"
          style={{ left: `${center.x * 100}%`, top: `${center.y * 100}%` }}
        />
      </div>
    );
  },
);

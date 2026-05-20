"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface AnglePadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const AnglePad = React.forwardRef<HTMLDivElement, AnglePadProps>(
  function AnglePad({ className, size = 32, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

    if (ctx.gradient.type === "radial") return null;

    const angle =
      ctx.gradient.type === "linear"
        ? ctx.gradient.angle
        : ctx.gradient.startAngle;
    const setAngle =
      ctx.gradient.type === "linear" ? ctx.setAngle : ctx.setStartAngle;

    const fromEvent = (clientX: number, clientY: number): number => {
      const el = padRef.current;
      if (!el) return angle;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return (deg + 360) % 360;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setAngle(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        setAngle(fromEvent(ev.clientX, ev.clientY));
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
      const step = e.shiftKey ? 15 : 1;
      let next = angle;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = angle - step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = angle + step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 359;
      else return;
      e.preventDefault();
      setAngle(((next % 360) + 360) % 360);
    };

    return (
      <div
        ref={padRef}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        role="slider"
        aria-label="Gradient angle"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(angle)}
        aria-valuetext={`${Math.round(angle)} degrees`}
        tabIndex={0}
        data-slot="gradient-angle-pad"
        className={cn(
          "relative shrink-0 cursor-grab rounded-full border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        style={{ width: size, height: size }}
        {...rest}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top -translate-x-1/2 bg-foreground"
          style={{ transform: `translate(-50%, 0) rotate(${angle}deg)` }}
        />
      </div>
    );
  },
);

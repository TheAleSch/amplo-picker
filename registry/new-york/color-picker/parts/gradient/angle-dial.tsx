"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface AngleDialProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const AngleDial = React.forwardRef<HTMLDivElement, AngleDialProps>(
  function AngleDial({ className, size = 56, ...rest }, ref) {
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
      // CSS gradient angle: 0deg = up, increases clockwise.
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return (deg + 360) % 360;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      // Snapshot the element reference up front — React nulls e.currentTarget
      // once the synchronous handler returns, so reading it inside the
      // pointermove / pointerup closures would throw and leak listeners.
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setAngle(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        setAngle(fromEvent(ev.clientX, ev.clientY));
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = parseFloat(e.target.value);
      if (Number.isFinite(n)) setAngle(((n % 360) + 360) % 360);
    };

    return (
      <div className={cn("flex items-center gap-2", className)} {...rest}>
        <div
          ref={padRef}
          onPointerDown={onPointerDown}
          role="slider"
          aria-label="Gradient angle"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(angle)}
          tabIndex={0}
          className="relative shrink-0 cursor-grab rounded-full border border-border bg-muted"
          style={{ width: size, height: size }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top -translate-x-1/2 bg-foreground"
            style={{ transform: `translate(-50%, 0) rotate(${angle}deg)` }}
          />
        </div>
        <input
          type="number"
          min={0}
          max={360}
          step={1}
          value={Math.round(angle)}
          onChange={onInputChange}
          className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs"
          aria-label="Angle in degrees"
        />
      </div>
    );
  },
);

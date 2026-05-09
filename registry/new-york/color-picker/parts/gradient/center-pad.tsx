"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface CenterPadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const CenterPad = React.forwardRef<HTMLDivElement, CenterPadProps>(
  function CenterPad({ className, size = 96, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

    if (ctx.gradient.type === "linear") return null;
    const center = ctx.gradient.center;

    const fromEvent = (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return center;
      const r = el.getBoundingClientRect();
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
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.setCenter({ x: Math.max(0, Math.min(1, center.x - step)), y: center.y });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.setCenter({ x: Math.max(0, Math.min(1, center.x + step)), y: center.y });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        ctx.setCenter({ x: center.x, y: Math.max(0, Math.min(1, center.y - step)) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        ctx.setCenter({ x: center.x, y: Math.max(0, Math.min(1, center.y + step)) });
      }
    };

    return (
      <div
        ref={padRef}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        role="application"
        aria-label="Gradient center"
        aria-roledescription="2D pad for gradient center"
        aria-valuetext={`x ${Math.round(center.x * 100)}%, y ${Math.round(center.y * 100)}%`}
        tabIndex={0}
        className={cn(
          "relative shrink-0 cursor-crosshair rounded-md border border-border bg-muted",
          className,
        )}
        style={{ width: size, height: size }}
        {...rest}
      >
        <div
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-foreground"
          style={{ left: `${center.x * 100}%`, top: `${center.y * 100}%` }}
        />
      </div>
    );
  },
);

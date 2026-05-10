"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient } from "../../lib/gradient";

export interface AreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed height in px. Defaults to 120. Width always fills the container. */
  height?: number;
  /**
   * Pixel radius of the conic "from-angle" dial handle measured from the
   * center handle. Locked on this ring; drag rotates `startAngle`.
   */
  conicDialRadius?: number;
}

interface XY {
  x: number;
  y: number;
}

const HANDLE_PX = 14;

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

/**
 * Convert a CSS gradient angle (0deg = up, increases clockwise) to a unit
 * direction vector in screen coordinates (y goes down).
 *   0deg   → ( 0, -1)   up
 *   90deg  → ( 1,  0)   right
 *   180deg → ( 0,  1)   down
 *   270deg → (-1,  0)   left
 */
function angleToDir(angleDeg: number): XY {
  const r = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(r), y: -Math.cos(r) };
}

/**
 * Inverse of `angleToDir`. Returns a CSS gradient angle in [0, 360) given a
 * non-zero direction vector in screen coordinates.
 */
function dirToAngle(dx: number, dy: number): number {
  // atan2(dx, -dy): 0 = up, increases clockwise — matches AngleDial.
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Project a ray from the box center along `dir` and return the distance to
 * the box edge. Works for any aspect ratio. Caller must ensure |dir| > 0.
 */
function edgeExtent(dir: XY, halfW: number, halfH: number): number {
  const ex = dir.x === 0 ? Infinity : halfW / Math.abs(dir.x);
  const ey = dir.y === 0 ? Infinity : halfH / Math.abs(dir.y);
  return Math.min(ex, ey);
}

/** Snap an angle to the nearest `step` degrees, normalized to [0, 360). */
function snapDeg(deg: number, step: number): number {
  const s = Math.round(deg / step) * step;
  return ((s % 360) + 360) % 360;
}

/**
 * Visual 2D pad that surfaces the *geometry* of the active gradient:
 *
 * - **Linear** — two handles sit on opposite edges, a dashed line runs
 *   through the center connecting them. Drag either to rotate the angle.
 *   CSS `linear-gradient` only persists an angle (the line always passes
 *   through the box center), so handle positions are derived from
 *   `gradient.angle` on each render — they are not a separate persisted
 *   property.
 *
 * - **Radial** — a single center handle bound to `gradient.center`. Shape
 *   (circle/ellipse) and size (closest-side/farthest-corner) stay on
 *   `<GradientPicker.RadialShape>`.
 *
 * - **Conic** — a center handle (`gradient.center`) plus a dial handle
 *   locked on a ring around it. Dragging the dial rotates
 *   `gradient.startAngle`.
 *
 * Shift+drag on any angle handle snaps to 15° increments. Keyboard arrows
 * are intentionally not bound here — focus the existing
 * `<GradientPicker.AngleDial>` / `<GradientPicker.CenterPad>` parts for
 * keyboard editing. This part is a complementary visual control.
 */
export const Area = React.forwardRef<HTMLDivElement, AreaProps>(function Area(
  { className, height = 120, conicDialRadius, style, ...rest },
  ref,
) {
  const ctx = useGradientPickerContext();
  const { gradient } = ctx;
  const padRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

  // Observe the box dimensions so handle geometry stays correct at any width.
  const [dims, setDims] = React.useState<{ w: number; h: number }>({
    w: 0,
    h: height,
  });
  React.useEffect(() => {
    const el = padRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height: h } = entry.contentRect;
      setDims({ w: width, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cssBackground = React.useMemo(
    () => formatGradient(gradient),
    [gradient],
  );

  // Compute handle positions in *box-local* pixels. Center of the box is
  // (w/2, h/2). All handle math lives in this coordinate space so we can
  // reason about it without thinking about page offsets.
  const handles = React.useMemo(() => {
    const { w, h } = dims;
    if (w === 0 || h === 0) return null;
    const cx = w / 2;
    const cy = h / 2;

    if (gradient.type === "linear") {
      const dir = angleToDir(gradient.angle);
      const t = edgeExtent(dir, w / 2, h / 2);
      return {
        a: { x: cx - dir.x * t, y: cy - dir.y * t },
        b: { x: cx + dir.x * t, y: cy + dir.y * t },
        showConnector: true,
      };
    }

    if (gradient.type === "radial") {
      return {
        a: { x: gradient.center.x * w, y: gradient.center.y * h },
        b: null as XY | null,
        showConnector: false,
      };
    }

    // conic
    const a = { x: gradient.center.x * w, y: gradient.center.y * h };
    const dir = angleToDir(gradient.startAngle);
    const dialR = conicDialRadius ?? Math.min(w, h) / 2 - HANDLE_PX;
    return {
      a,
      b: { x: a.x + dir.x * dialR, y: a.y + dir.y * dialR },
      showConnector: true,
    };
  }, [dims, gradient, conicDialRadius]);

  // Drag helpers ------------------------------------------------------------

  const localFromEvent = (clientX: number, clientY: number): XY => {
    const el = padRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  type HandleKind = "linear-a" | "linear-b" | "center" | "conic-dial";

  const handleAt = (kind: HandleKind, p: XY, shiftKey: boolean) => {
    const { w, h } = dims;
    const cx = w / 2;
    const cy = h / 2;

    if (kind === "linear-a" || kind === "linear-b") {
      let deg = dirToAngle(p.x - cx, p.y - cy);
      if (kind === "linear-a") deg = (deg + 180) % 360;
      if (shiftKey) deg = snapDeg(deg, 15);
      ctx.setAngle(deg);
      return;
    }

    if (kind === "center") {
      const nx = Math.max(0, Math.min(1, p.x / w));
      const ny = Math.max(0, Math.min(1, p.y / h));
      ctx.setCenter({ x: nx, y: ny });
      return;
    }

    // conic-dial — rotate around current center, distance is ignored.
    if (gradient.type !== "conic") return;
    const ax = gradient.center.x * w;
    const ay = gradient.center.y * h;
    let deg = dirToAngle(p.x - ax, p.y - ay);
    if (shiftKey) deg = snapDeg(deg, 15);
    ctx.setStartAngle(deg);
  };

  // Keyboard nudge helpers --------------------------------------------------

  const rotate = (current: number, e: React.KeyboardEvent): number | null => {
    const step = e.shiftKey ? 15 : 1;
    let next = current;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = current - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 359;
    else return null;
    return ((next % 360) + 360) % 360;
  };

  const onKeyDownAngle = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type !== "linear") return;
    const next = rotate(gradient.angle, e);
    if (next === null) return;
    e.preventDefault();
    ctx.setAngle(next);
  };

  const onKeyDownConicDial = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type !== "conic") return;
    const next = rotate(gradient.startAngle, e);
    if (next === null) return;
    e.preventDefault();
    ctx.setStartAngle(next);
  };

  const onKeyDownCenter = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type === "linear") return;
    const center = gradient.center;
    const step = e.shiftKey ? 0.05 : 0.01;
    let { x, y } = center;
    if (e.key === "ArrowLeft") x -= step;
    else if (e.key === "ArrowRight") x += step;
    else if (e.key === "ArrowUp") y -= step;
    else if (e.key === "ArrowDown") y += step;
    else if (e.key === "Home") {
      x = 0.5;
      y = 0.5;
    } else return;
    e.preventDefault();
    ctx.setCenter({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  };

  const beginDrag = (kind: HandleKind) => (
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    handleAt(kind, localFromEvent(e.clientX, e.clientY), e.shiftKey);
    const onMove = (ev: PointerEvent) =>
      handleAt(kind, localFromEvent(ev.clientX, ev.clientY), ev.shiftKey);
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

  // Render ------------------------------------------------------------------

  return (
    <div
      ref={padRef}
      data-slot="gradient-area"
      style={{ height, ...style }}
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border bg-muted",
        className,
      )}
      {...rest}
    >
      {/* Transparency checker behind the gradient so alpha is legible. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: CHECKERBOARD }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: cssBackground }}
      />

      {handles && (
        <>
          {handles.showConnector && handles.b && (
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0"
              width={dims.w}
              height={dims.h}
            >
              <line
                x1={handles.a.x}
                y1={handles.a.y}
                x2={handles.b.x}
                y2={handles.b.y}
                stroke="white"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.85}
                style={{
                  filter: "drop-shadow(0 0 1px rgba(0,0,0,0.55))",
                }}
              />
            </svg>
          )}

          {gradient.type === "linear" ? (
            <>
              <Handle
                label="Gradient start"
                position={handles.a}
                onPointerDown={beginDrag("linear-a")}
                onKeyDown={onKeyDownAngle}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(gradient.angle)}
                aria-valuetext={`${Math.round(gradient.angle)} degrees`}
              />
              {handles.b && (
                <Handle
                  label="Gradient end"
                  position={handles.b}
                  onPointerDown={beginDrag("linear-b")}
                  onKeyDown={onKeyDownAngle}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(gradient.angle)}
                  aria-valuetext={`${Math.round(gradient.angle)} degrees`}
                />
              )}
            </>
          ) : (
            <>
              <Handle
                label="Gradient center"
                position={handles.a}
                onPointerDown={beginDrag("center")}
                onKeyDown={onKeyDownCenter}
                role="application"
                aria-roledescription="2D pad for gradient center"
                aria-valuetext={`x ${Math.round(gradient.center.x * 100)}%, y ${Math.round(gradient.center.y * 100)}%`}
              />
              {handles.b && gradient.type === "conic" && (
                <Handle
                  label="Gradient start angle"
                  position={handles.b}
                  onPointerDown={beginDrag("conic-dial")}
                  onKeyDown={onKeyDownConicDial}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(gradient.startAngle)}
                  aria-valuetext={`${Math.round(gradient.startAngle)} degrees`}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
});

interface HandleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  position: XY;
}

function Handle({ label, position, className, style, ...rest }: HandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      tabIndex={0}
      style={{
        left: position.x,
        top: position.y,
        width: HANDLE_PX,
        height: HANDLE_PX,
        ...style,
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full",
        "border-2 border-white bg-foreground/10 shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.35)]",
        "outline-none transition-transform",
        "hover:scale-110 active:cursor-grabbing active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...rest}
    />
  );
}

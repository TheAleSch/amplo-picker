"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, type RadialSizeKeyword } from "../../lib/gradient";
import { formatColor } from "../../lib/color";

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
 * Seed numeric radii from the radial gradient's keyword form (`shape` +
 * `size`) so the edge handle has a sensible starting position before the
 * user has touched it. Returns radii as fractions of the box width/height
 * matching the CSS `<length-percentage>{1,2}` convention.
 *
 * For corner-targeting keywords on ellipse we deliberately approximate by
 * stretching each axis to the appropriate side rather than implementing the
 * exact CSS spec — once the user drags, they own the radii anyway.
 */
function keywordToRadii(
  shape: "circle" | "ellipse",
  size: RadialSizeKeyword,
  center: { x: number; y: number },
  w: number,
  h: number,
): { x: number; y: number } {
  const cx = center.x * w;
  const cy = center.y * h;
  const dxClose = Math.min(cx, w - cx);
  const dxFar = Math.max(cx, w - cx);
  const dyClose = Math.min(cy, h - cy);
  const dyFar = Math.max(cy, h - cy);
  if (shape === "circle") {
    let rPx: number;
    switch (size) {
      case "closest-side":
        rPx = Math.min(dxClose, dyClose);
        break;
      case "closest-corner":
        rPx = Math.hypot(dxClose, dyClose);
        break;
      case "farthest-side":
        rPx = Math.max(dxFar, dyFar);
        break;
      case "farthest-corner":
        rPx = Math.hypot(dxFar, dyFar);
        break;
    }
    return { x: rPx / w, y: rPx / h };
  }
  switch (size) {
    case "closest-side":
      return { x: dxClose / w, y: dyClose / h };
    case "closest-corner":
      // Ellipse closest-corner: stretch each axis to the *closest* side along
      // that axis (approximation — the spec scales to actually touch the
      // closest corner, but visually this is close enough as a seed).
      return { x: dxClose / w, y: dyClose / h };
    case "farthest-side":
      return { x: dxFar / w, y: dyFar / h };
    case "farthest-corner":
      return { x: dxFar / w, y: dyFar / h };
  }
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
      if (gradient.start && gradient.end) {
        // Positioned linear: endpoints can sit anywhere inside the box.
        // Visually clamp by HANDLE_PX/2 so the handle dot stays fully inside
        // the `overflow-hidden` container even when the user drags to a
        // corner. The stored `gradient.start` / `gradient.end` keep the
        // true pointer position — only the rendered handle + dashed line
        // endpoint are inset.
        const inset = HANDLE_PX / 2;
        const clampX = (px: number) => Math.max(inset, Math.min(w - inset, px));
        const clampY = (px: number) => Math.max(inset, Math.min(h - inset, px));
        return {
          a: {
            x: clampX(gradient.start.x * w),
            y: clampY(gradient.start.y * h),
          },
          b: {
            x: clampX(gradient.end.x * w),
            y: clampY(gradient.end.y * h),
          },
          showConnector: true,
        };
      }
      const dir = angleToDir(gradient.angle);
      // Inset the edge by half a handle so the dot stays fully inside the box
      // and doesn't get clipped by `overflow-hidden` on the container. The
      // gradient itself still paints to the true edge — only the handle
      // visualization is inset.
      const inset = HANDLE_PX / 2;
      const t = edgeExtent(
        dir,
        Math.max(0, w / 2 - inset),
        Math.max(0, h / 2 - inset),
      );
      return {
        a: { x: cx - dir.x * t, y: cy - dir.y * t },
        b: { x: cx + dir.x * t, y: cy + dir.y * t },
        showConnector: true,
      };
    }

    if (gradient.type === "radial") {
      const radii =
        gradient.radii ??
        keywordToRadii(gradient.shape, gradient.size, gradient.center, w, h);
      const ax = gradient.center.x * w;
      const ay = gradient.center.y * h;
      return {
        a: { x: ax, y: ay },
        b: { x: ax + radii.x * w, y: ay + radii.y * h } as XY,
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

  type HandleKind =
    | "linear-a"
    | "linear-b"
    | "center"
    | "conic-dial"
    | "radial-edge";

  const handleAt = (kind: HandleKind, p: XY, shiftKey: boolean) => {
    const { w, h } = dims;
    const cx = w / 2;
    const cy = h / 2;

    if (kind === "linear-a" || kind === "linear-b") {
      if (gradient.type !== "linear") return;
      // Free position: drag puts the endpoint exactly where the pointer is.
      // Promote the gradient to "positioned" mode by ensuring both `start`
      // and `end` are populated — seed the other endpoint from the angle if
      // this is the first drag.
      const nx = Math.max(0, Math.min(1, p.x / w));
      const ny = Math.max(0, Math.min(1, p.y / h));
      const ensureOther = (existing: { x: number; y: number } | undefined) => {
        if (existing) return existing;
        // Seed from the current angle so the line keeps its visual direction
        // for the very first drag — no visible jump on promotion.
        const dir = angleToDir(gradient.angle);
        const inset = HANDLE_PX / 2;
        const t = edgeExtent(
          dir,
          Math.max(0, w / 2 - inset),
          Math.max(0, h / 2 - inset),
        );
        // The "other" endpoint is opposite the one being dragged.
        const sign = kind === "linear-a" ? 1 : -1;
        const ox = cx + dir.x * t * sign;
        const oy = cy + dir.y * t * sign;
        return { x: ox / w, y: oy / h };
      };
      if (kind === "linear-a") {
        const other = ensureOther(gradient.end);
        if (!gradient.end) ctx.setLinearEnd(other);
        ctx.setLinearStart({ x: nx, y: ny });
      } else {
        const other = ensureOther(gradient.start);
        if (!gradient.start) ctx.setLinearStart(other);
        ctx.setLinearEnd({ x: nx, y: ny });
      }
      return;
    }

    if (kind === "center") {
      const nx = Math.max(0, Math.min(1, p.x / w));
      const ny = Math.max(0, Math.min(1, p.y / h));
      ctx.setCenter({ x: nx, y: ny });
      return;
    }

    if (kind === "radial-edge") {
      if (gradient.type !== "radial") return;
      const ax = gradient.center.x * w;
      const ay = gradient.center.y * h;
      // Edge handle lives in the +x +y quadrant relative to the center —
      // drags into other quadrants are mirrored via abs() so radii stay
      // strictly non-negative (CSS forbids negative gradient radii).
      const dxPx = Math.abs(p.x - ax);
      const dyPx = Math.abs(p.y - ay);
      // Match the gradient's declared shape by default. `shape === "circle"`
      // means the rendered ellipse must have equal pixel radii on both
      // axes; without this guard a free drag would silently turn a
      // "circle" radial into an ellipse, which contradicts the model.
      // Holding Shift inverts: forces an ellipse on a circle, or a circle
      // on an ellipse.
      const lockToCircle =
        (gradient.shape === "circle") !== shiftKey;
      let rx: number;
      let ry: number;
      if (lockToCircle) {
        // Visual circle: equal pixel radii on both axes. Use the larger
        // pointer distance so the dot follows the cursor along whichever
        // axis the user is most committed to.
        const rPx = Math.max(dxPx, dyPx);
        rx = rPx / w;
        ry = rPx / h;
      } else {
        rx = dxPx / w;
        ry = dyPx / h;
      }
      ctx.setRadii({
        x: Math.max(0, Math.min(2, rx)),
        y: Math.max(0, Math.min(2, ry)),
      });
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

  /**
   * Project a pointer position onto the line a→b and return the parametric
   * position along the segment in [0, 1]. Used by the in-line stop handles
   * so dragging a stop slides it along the visible gradient line, even when
   * the pointer drifts away from the line itself.
   */
  const projectOntoLine = (a: XY, b: XY, p: XY): number => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return 0;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    return Math.max(0, Math.min(1, t));
  };

  const beginStopDrag = (id: string) => (
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!handles || !handles.b) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    ctx.selectStop(id);
    const a = handles.a;
    const b = handles.b;
    const apply = (clientX: number, clientY: number) => {
      const t = projectOntoLine(a, b, localFromEvent(clientX, clientY));
      ctx.moveStop(id, t);
    };
    apply(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
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

  const onKeyDownLinearStop = (
    id: string,
    position: number,
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    let next = position;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next += step;
    else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ctx.removeStop(id);
      return;
    } else return;
    e.preventDefault();
    ctx.moveStop(id, Math.max(0, Math.min(1, next)));
  };

  /**
   * Stack three background layers so a handle dot shows the stop's actual
   * color (alpha intact) while still fully occluding the dashed gradient
   * line behind it: stop-color on top, checkerboard underneath so
   * transparency reads as transparency, and the Handle's own solid
   * `bg-background` at the bottom for the final opacity guarantee.
   */
  const stopSwatchStyle = (color: typeof ctx.stops[number]["color"]) => {
    const css = formatColor(color, "oklch");
    return {
      backgroundImage: `linear-gradient(${css}, ${css}), ${CHECKERBOARD}`,
      backgroundSize: "auto, 6px 6px",
    } as const;
  };

  const onKeyDownAngle = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type !== "linear") return;
    const next = rotate(gradient.angle, e);
    if (next === null) return;
    e.preventDefault();
    ctx.setAngle(next);
  };

  const onKeyDownLinearEndpoint = (
    which: "linear-a" | "linear-b",
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (gradient.type !== "linear") return;
    const point =
      which === "linear-a" ? gradient.start : gradient.end;
    if (!point) {
      // Fall back to angle rotation when this handle hasn't been promoted
      // to free-position mode yet — keeps the angle-only behavior intact.
      onKeyDownAngle(e);
      return;
    }
    const step = e.shiftKey ? 0.05 : 0.01;
    let { x, y } = point;
    if (e.key === "ArrowLeft") x -= step;
    else if (e.key === "ArrowRight") x += step;
    else if (e.key === "ArrowUp") y -= step;
    else if (e.key === "ArrowDown") y += step;
    else return;
    e.preventDefault();
    const next = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    if (which === "linear-a") ctx.setLinearStart(next);
    else ctx.setLinearEnd(next);
  };

  const onKeyDownConicDial = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type !== "conic") return;
    const next = rotate(gradient.startAngle, e);
    if (next === null) return;
    e.preventDefault();
    ctx.setStartAngle(next);
  };

  const onKeyDownRadii = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (gradient.type !== "radial") return;
    const { w, h } = dims;
    if (w === 0 || h === 0) return;
    const current =
      gradient.radii ??
      keywordToRadii(gradient.shape, gradient.size, gradient.center, w, h);
    const step = e.shiftKey ? 0.05 : 0.01;
    let { x, y } = current;
    if (e.key === "ArrowLeft") x -= step;
    else if (e.key === "ArrowRight") x += step;
    else if (e.key === "ArrowUp") y -= step;
    else if (e.key === "ArrowDown") y += step;
    else return;
    e.preventDefault();
    // Same shape-lock convention as the pointer drag: by default the
    // gradient's declared `shape` wins, Shift inverts. When locked to a
    // circle, project both axes back to the dominant pixel radius so the
    // rendered ellipse stays geometrically circular.
    const lockToCircle = (gradient.shape === "circle") !== e.shiftKey;
    if (lockToCircle) {
      const rPx = Math.max(x * w, y * h);
      x = rPx / w;
      y = rPx / h;
    }
    ctx.setRadii({
      x: Math.max(0, Math.min(2, x)),
      y: Math.max(0, Math.min(2, y)),
    });
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
    // Mirror the pointer-drag behavior: lock the keyword-derived radii
    // into explicit numeric values before moving the center so the visible
    // ring size doesn't shift with every arrow press.
    lockRadiiFromKeyword();
    ctx.setCenter({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  };

  /**
   * Snapshot the current keyword-derived radii into explicit numeric radii.
   * Called the first time the user moves a radial center so the visible
   * ring size stays put — CSS extent keywords (`farthest-corner` etc.) are
   * relative to the center, so without this snapshot the gradient appears
   * to grow / shrink as the center is dragged toward / away from corners.
   */
  const lockRadiiFromKeyword = () => {
    if (gradient.type !== "radial") return;
    if (gradient.radii) return;
    if (dims.w === 0 || dims.h === 0) return;
    const seeded = keywordToRadii(
      gradient.shape,
      gradient.size,
      gradient.center,
      dims.w,
      dims.h,
    );
    ctx.setRadii(seeded);
  };

  const beginDrag = (kind: HandleKind) => (
    e: React.PointerEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    if (kind === "center") lockRadiiFromKeyword();
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
                onKeyDown={(e) => onKeyDownLinearEndpoint("linear-a", e)}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(gradient.angle)}
                aria-valuetext={
                  gradient.start
                    ? `start x ${Math.round(gradient.start.x * 100)}%, y ${Math.round(gradient.start.y * 100)}%`
                    : `${Math.round(gradient.angle)} degrees`
                }
                // Endpoint handles are always anchored to the first / last
                // stop, so they render in that stop's color.
                style={
                  ctx.stops[0] ? stopSwatchStyle(ctx.stops[0].color) : undefined
                }
              />
              {handles.b && (
                <Handle
                  label="Gradient end"
                  position={handles.b}
                  onPointerDown={beginDrag("linear-b")}
                  onKeyDown={(e) => onKeyDownLinearEndpoint("linear-b", e)}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(gradient.angle)}
                  aria-valuetext={
                    gradient.end
                      ? `end x ${Math.round(gradient.end.x * 100)}%, y ${Math.round(gradient.end.y * 100)}%`
                      : `${Math.round(gradient.angle)} degrees`
                  }
                  style={(() => {
                    const last = ctx.stops[ctx.stops.length - 1];
                    return last ? stopSwatchStyle(last.color) : undefined;
                  })()}
                />
              )}
              {/* Middle-stop handles: every stop between the first and last
                 lives on the gradient line as a colored dot. Drag projects
                 the pointer onto the a→b segment so the handle can slide
                 even if the user wanders off the line. First and last
                 stops are already represented by the endpoint handles
                 above and are intentionally omitted here. */}
              {handles.b &&
                ctx.stops.length > 2 &&
                ctx.stops.slice(1, -1).map((s) => {
                  const a = handles.a;
                  const b = handles.b as XY;
                  const px = a.x + (b.x - a.x) * s.position;
                  const py = a.y + (b.y - a.y) * s.position;
                  const pct = Math.round(s.position * 100);
                  return (
                    <Handle
                      key={s.id}
                      label={`Gradient stop at ${pct}%`}
                      position={{ x: px, y: py }}
                      onPointerDown={beginStopDrag(s.id)}
                      onKeyDown={(e) =>
                        onKeyDownLinearStop(s.id, s.position, e)
                      }
                      role="slider"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={pct}
                      aria-valuetext={`${pct} percent`}
                      style={stopSwatchStyle(s.color)}
                    />
                  );
                })}
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
              {handles.b && gradient.type === "radial" && (
                <Handle
                  label="Gradient radius"
                  position={handles.b}
                  onPointerDown={beginDrag("radial-edge")}
                  onKeyDown={onKeyDownRadii}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={200}
                  aria-valuenow={Math.round(
                    (gradient.radii?.x ??
                      keywordToRadii(
                        gradient.shape,
                        gradient.size,
                        gradient.center,
                        dims.w,
                        dims.h,
                      ).x) * 100,
                  )}
                  aria-valuetext={(() => {
                    const r =
                      gradient.radii ??
                      keywordToRadii(
                        gradient.shape,
                        gradient.size,
                        gradient.center,
                        dims.w,
                        dims.h,
                      );
                    return `radius x ${Math.round(r.x * 100)}%, y ${Math.round(r.y * 100)}%`;
                  })()}
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
        // Solid background so the dashed gradient line behind the dot is
        // fully hidden by it (a translucent fill would let the line bleed
        // through visibly).
        "border-2 border-white bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.35)]",
        "outline-none transition-transform",
        "hover:scale-110 active:cursor-grabbing active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...rest}
    />
  );
}

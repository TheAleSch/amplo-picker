"use client";

import * as React from "react";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  formatGradient,
  type Gradient,
  type GradientInterp,
  type GradientStop,
  type GradientType,
  type LinearGradient,
  type RadialGradient,
  type RadialSizeKeyword,
  type ConicGradient,
} from "../lib/gradient";
import type { OklchColor } from "../lib/types";

let __idCounter = 0;
const nextId = () => `s${++__idCounter}`;

// ---- Internal types --------------------------------------------------------

interface InternalStop extends GradientStop {
  id: string;
}

// We store gradient config and stops separately so TypeScript always sees
// stops as InternalStop[] without needing to narrow through a discriminated union.
interface InternalState {
  // The gradient without stops — used as a base for type-specific properties.
  // We keep the full gradient object and overlay stops separately.
  gradient: Gradient;
  stops: InternalStop[];
}

// ---- Helpers ---------------------------------------------------------------

function attachIds(g: Gradient): InternalState {
  return {
    gradient: g,
    stops: g.stops.map((s) => ({ ...s, id: nextId() })),
  };
}

function toPublicGradient(s: InternalState): Gradient {
  const stops: GradientStop[] = s.stops.map(({ id: _id, ...rest }) => rest);
  return { ...s.gradient, stops } as Gradient;
}

function sortByPosition(stops: InternalStop[]): InternalStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function defaultsForType(type: GradientType): Gradient {
  if (type === "linear") return DEFAULT_LINEAR;
  if (type === "radial") return DEFAULT_RADIAL;
  return DEFAULT_CONIC;
}

// ---- Public API types -------------------------------------------------------

export interface UseGradientPickerProps {
  value?: Gradient;
  defaultValue?: Gradient;
  onValueChange?: (gradient: Gradient, css: string) => void;
}

export interface GradientPickerState {
  gradient: Gradient;
  stops: InternalStop[];
  selectedStopId: string;
  selectedStop: InternalStop | null;
  setGradient: (next: Gradient) => void;
  setType: (type: GradientType) => void;
  setAngle: (angleDeg: number) => void;
  /**
   * Set the start endpoint of a linear gradient (normalized 0..1 of the
   * gradient box). Promotes the gradient to "positioned" mode — when both
   * `start` and `end` are set, the gradient is treated as a line between
   * them rather than an angle-only construct. `angle` is kept in sync with
   * the derived direction. Passing `undefined` clears the override and
   * returns the gradient to the legacy angle-only behavior.
   */
  setLinearStart: (xy: { x: number; y: number } | undefined) => void;
  /** Set the end endpoint of a linear gradient. See `setLinearStart`. */
  setLinearEnd: (xy: { x: number; y: number } | undefined) => void;
  setStartAngle: (angleDeg: number) => void;
  setCenter: (xy: { x: number; y: number }) => void;
  setInterp: (interp: GradientInterp) => void;
  setRadialShape: (shape: "circle" | "ellipse") => void;
  setRadialSize: (size: RadialSizeKeyword) => void;
  /**
   * Set explicit numeric radii on the active radial gradient. Each value is
   * a 0..1 fraction of the gradient box (x→width, y→height). Passing
   * `undefined` clears the explicit override and falls back to the
   * keyword-based size from `setRadialShape` / `setRadialSize`. Use this
   * for ellipse-shape radials.
   */
  setRadii: (radii: { x: number; y: number } | undefined) => void;
  /**
   * Set the explicit circle radius in absolute pixels. Only meaningful
   * when `shape === "circle"` — produces a CSS `radial-gradient(<px>px
   * at ...)` form, which is the only way to keep the gradient visually
   * circular in any consumer container (the percentage pair form always
   * implies ellipse). Passing `undefined` clears the override.
   */
  setRadiusPx: (px: number | undefined) => void;
  selectStop: (id: string) => void;
  addStop: (position: number, color?: OklchColor) => string;
  removeStop: (id: string) => void;
  moveStop: (id: string, position: number) => void;
  setStopColor: (id: string, color: OklchColor) => void;
  setStopHint: (id: string, hint: number | undefined) => void;
  reverseStops: () => void;
}

// ---- Hook ------------------------------------------------------------------

export function useGradientPicker(
  props: UseGradientPickerProps = {},
): GradientPickerState {
  const { value, defaultValue, onValueChange } = props;
  const isControlled = value !== undefined;

  const [internal, setInternal] = React.useState<InternalState>(() =>
    attachIds(value ?? defaultValue ?? DEFAULT_LINEAR),
  );
  const [selectedStopId, setSelectedStopId] = React.useState<string>(
    () => internal.stops[0]?.id ?? "",
  );

  // Track the last gradient we emitted upward so the controlled-sync effect can
  // ignore echoes. Seed with the initial controlled value so the *first* sync
  // is treated as an echo of our own initial state — without this, the very
  // first render would unconditionally rebuild internal state and re-emit.
  const lastEmittedRef = React.useRef<Gradient | null>(value ?? null);

  // stateRef mirrors `internal` so setters can compute the next state +
  // synchronously emit the cleaned gradient without going through an effect.
  // We update it both inside `apply` (so chained setters within one event
  // handler see the latest) and after every commit (so the controlled-sync
  // effect can write to internal without us missing the change).
  const stateRef = React.useRef(internal);
  React.useEffect(() => {
    stateRef.current = internal;
  });

  // Latest-callback ref so a fresh arrow each render doesn't re-create our
  // setters via deps.
  const onValueChangeRef = React.useRef(onValueChange);
  React.useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });

  // Sync controlled value into internal state, preserving stop ids when possible.
  React.useEffect(() => {
    if (!isControlled || !value) return;
    if (value === lastEmittedRef.current) return;
    setInternal((prev) => {
      const next: InternalState =
        prev.gradient.type === value.type &&
        prev.stops.length === value.stops.length &&
        prev.stops.every((s, i) => s.position === value.stops[i].position)
          ? {
              gradient: value,
              stops: prev.stops.map((s, i) => ({ ...value.stops[i], id: s.id })),
            }
          : attachIds(value);
      stateRef.current = next;
      return next;
    });
  }, [isControlled, value]);

  // Apply a state transition + emit in one shot. Read-modify-write through
  // stateRef so chained calls in one event handler each see the previous
  // result. Returning `prev` (or null) is a no-op signal.
  const apply = React.useCallback(
    (compute: (prev: InternalState) => InternalState | null) => {
      const prev = stateRef.current;
      const next = compute(prev);
      if (next === null || next === prev) return;
      stateRef.current = next;
      setInternal(next);
      const clean = toPublicGradient(next);
      lastEmittedRef.current = clean;
      onValueChangeRef.current?.(clean, formatGradient(clean));
    },
    [],
  );

  // ---- Gradient-level setters ----------------------------------------------

  const setGradient = React.useCallback(
    (next: Gradient) => {
      apply(() => attachIds(next));
      setSelectedStopId((prev) => stateRef.current.stops[0]?.id ?? prev);
    },
    [apply],
  );

  const setType = React.useCallback(
    (type: GradientType) =>
      apply((prev) => {
        if (prev.gradient.type === type) return prev;
        const fallback = defaultsForType(type);
        return {
          gradient: { ...fallback, interp: prev.gradient.interp } as Gradient,
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setAngle = React.useCallback(
    (angleDeg: number) =>
      apply((prev) => {
        if (prev.gradient.type !== "linear") return prev;
        const cur = prev.gradient as LinearGradient;
        // Setting an angle directly clears any free-position endpoints — the
        // angle-only model can't represent both. Callers that want to
        // preserve positioned mode should `setLinearStart` / `setLinearEnd`
        // (which keep `angle` in sync with the derived direction).
        const { start: _s, end: _e, ...rest } = cur;
        const next: LinearGradient = { ...rest, angle: angleDeg };
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const recomputeAngle = (
    start: { x: number; y: number } | undefined,
    end: { x: number; y: number } | undefined,
    fallback: number,
  ): number => {
    if (!start || !end) return fallback;
    const dx = end.x - start.x;
    const dy = -(end.y - start.y); // y axis is down in box coords
    if (dx === 0 && dy === 0) return fallback;
    const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
    return ((deg % 360) + 360) % 360;
  };

  const setLinearStart = React.useCallback(
    (xy: { x: number; y: number } | undefined) =>
      apply((prev) => {
        if (prev.gradient.type !== "linear") return prev;
        const cur = prev.gradient as LinearGradient;
        const next: LinearGradient = xy
          ? {
              ...cur,
              start: { x: clamp01(xy.x), y: clamp01(xy.y) },
              angle: recomputeAngle(
                { x: clamp01(xy.x), y: clamp01(xy.y) },
                cur.end,
                cur.angle,
              ),
            }
          : (() => {
              const { start: _drop, ...rest } = cur;
              return rest as LinearGradient;
            })();
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const setLinearEnd = React.useCallback(
    (xy: { x: number; y: number } | undefined) =>
      apply((prev) => {
        if (prev.gradient.type !== "linear") return prev;
        const cur = prev.gradient as LinearGradient;
        const next: LinearGradient = xy
          ? {
              ...cur,
              end: { x: clamp01(xy.x), y: clamp01(xy.y) },
              angle: recomputeAngle(
                cur.start,
                { x: clamp01(xy.x), y: clamp01(xy.y) },
                cur.angle,
              ),
            }
          : (() => {
              const { end: _drop, ...rest } = cur;
              return rest as LinearGradient;
            })();
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const setStartAngle = React.useCallback(
    (angleDeg: number) =>
      apply((prev) => {
        if (prev.gradient.type !== "conic") return prev;
        return {
          gradient: { ...(prev.gradient as ConicGradient), startAngle: angleDeg },
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setCenter = React.useCallback(
    (xy: { x: number; y: number }) =>
      apply((prev) => {
        if (prev.gradient.type === "linear") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient | ConicGradient), center: xy },
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setInterp = React.useCallback(
    (interp: GradientInterp) =>
      apply((prev) => ({
        gradient: { ...prev.gradient, interp } as Gradient,
        stops: prev.stops,
      })),
    [apply],
  );

  const setRadialShape = React.useCallback(
    (shape: "circle" | "ellipse") =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient), shape },
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setRadialSize = React.useCallback(
    (size: RadialSizeKeyword) =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient), size },
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setRadii = React.useCallback(
    (radii: { x: number; y: number } | undefined) =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        const base = prev.gradient as RadialGradient;
        // Setting `radii` is the ellipse path — clear `radiusPx` in the same
        // commit so the two never coexist (only one can win at emit time,
        // and keeping a stale value around would be confusing for callers
        // that read state directly).
        const { radii: _dropRadii, radiusPx: _dropPx, ...rest } = base;
        const next: RadialGradient = radii
          ? {
              ...rest,
              radii: { x: Math.max(0, radii.x), y: Math.max(0, radii.y) },
            }
          : (rest as RadialGradient);
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const setRadiusPx = React.useCallback(
    (px: number | undefined) =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        const base = prev.gradient as RadialGradient;
        // Setting `radiusPx` is the circle path — clear `radii` so the
        // ellipse override never lingers, and so emit logic doesn't have to
        // tiebreak.
        const { radii: _dropRadii, radiusPx: _dropPx, ...rest } = base;
        const next: RadialGradient =
          px !== undefined
            ? { ...rest, radiusPx: Math.max(0, px) }
            : (rest as RadialGradient);
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  // ---- Stop setters --------------------------------------------------------

  const selectStop = React.useCallback((id: string) => setSelectedStopId(id), []);

  const addStop = React.useCallback(
    (position: number, color?: OklchColor): string => {
      const id = nextId();
      const fallback: OklchColor = { l: 0.5, c: 0, h: 0, alpha: 1 };
      apply((prev) => ({
        gradient: prev.gradient,
        stops: sortByPosition([
          ...prev.stops,
          { id, position, color: color ?? fallback },
        ]),
      }));
      setSelectedStopId(id);
      return id;
    },
    [apply],
  );

  const removeStop = React.useCallback(
    (id: string) => {
      let nextSelId: string | null = null;
      apply((prev) => {
        if (prev.stops.length <= 1) return prev;
        const idx = prev.stops.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const filtered = prev.stops.filter((s) => s.id !== id);
        nextSelId = filtered[Math.min(idx, filtered.length - 1)].id;
        return { gradient: prev.gradient, stops: filtered };
      });
      if (nextSelId !== null) setSelectedStopId(nextSelId);
    },
    [apply],
  );

  const moveStop = React.useCallback(
    (id: string, position: number) => {
      const clamped = Math.max(0, Math.min(1, position));
      apply((prev) => {
        // Move the target stop to the end before sorting so that in a position
        // tie it sorts after existing stops at that position (stable sort).
        const others = prev.stops.filter((s) => s.id !== id);
        const moved = prev.stops.find((s) => s.id === id);
        if (!moved) return prev;
        return {
          gradient: prev.gradient,
          stops: sortByPosition([...others, { ...moved, position: clamped }]),
        };
      });
    },
    [apply],
  );

  const setStopColor = React.useCallback(
    (id: string, color: OklchColor) =>
      apply((prev) => ({
        gradient: prev.gradient,
        stops: prev.stops.map((s) => (s.id === id ? { ...s, color } : s)),
      })),
    [apply],
  );

  const setStopHint = React.useCallback(
    (id: string, hint: number | undefined) =>
      apply((prev) => ({
        gradient: prev.gradient,
        stops: prev.stops.map((s) => (s.id === id ? { ...s, hint } : s)),
      })),
    [apply],
  );

  const reverseStops = React.useCallback(
    () =>
      apply((prev) => {
        if (prev.stops.length < 2) return prev;
        // Mirror each stop's position around 0.5 so the visual order flips
        // while ids stay attached to their colors. Re-sort to keep the
        // invariant that `stops` is position-ascending.
        const flipped = prev.stops.map((s) => ({
          ...s,
          position: 1 - s.position,
          hint: s.hint === undefined ? undefined : 1 - s.hint,
        }));
        return { gradient: prev.gradient, stops: sortByPosition(flipped) };
      }),
    [apply],
  );

  // ---- Derived values ------------------------------------------------------

  const selectedStop = React.useMemo(
    () => internal.stops.find((s) => s.id === selectedStopId) ?? null,
    [internal.stops, selectedStopId],
  );

  const cleanGradient = React.useMemo(() => toPublicGradient(internal), [internal]);

  return {
    gradient: cleanGradient,
    stops: internal.stops,
    selectedStopId,
    selectedStop,
    setGradient,
    setType,
    setAngle,
    setLinearStart,
    setLinearEnd,
    setStartAngle,
    setCenter,
    setInterp,
    setRadialShape,
    setRadialSize,
    setRadii,
    setRadiusPx,
    selectStop,
    addStop,
    removeStop,
    moveStop,
    setStopColor,
    setStopHint,
    reverseStops,
  };
}

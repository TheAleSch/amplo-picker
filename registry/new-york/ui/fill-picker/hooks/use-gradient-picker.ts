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
import type { ColorFormat, OklchColor } from "../lib/types";

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
  // Sort on entry. `formatStops` emits stops in array order and CSS requires
  // non-decreasing positions, so an out-of-order (but perfectly type-legal)
  // stop array arriving via `defaultValue`, a controlled `value`, or
  // `setGradient` would emit CSS the browser silently clamps into a flat
  // ramp. The mutating setters (addStop / moveStop / reverseStops) already
  // route through `sortByPosition` for exactly this reason — the entry points
  // did not. `gradient.stops` is never read for stop data (toPublicGradient
  // always rebuilds it from `stops`), so sorting the id-bearing array is
  // sufficient.
  const used = new Set<string>();
  return {
    gradient: g,
    stops: [...g.stops]
      .sort((a, b) => a.position - b.position)
      .map((s) => {
        // Honor a consumer-supplied id so controlled reconciliation can match
        // on identity. Duplicates would defeat the point (and could collide
        // with a generated id), so anything already taken falls back.
        const id = s.id && !used.has(s.id) ? s.id : nextId();
        used.add(id);
        return { ...s, id };
      }),
  };
}

/**
 * True when the caller is tracking stops by id — i.e. every stop of the
 * gradient they handed us carries one. Partial id sets don't count: the
 * identity match is all-or-nothing, so half-tagged stops would silently fall
 * back to position matching anyway.
 */
function hasStopIds(g: Gradient): boolean {
  return g.stops.length > 0 && g.stops.every((s) => !!s.id);
}

/**
 * `withIds` echoes ids back out. Off by default so a caller who never opted
 * into `GradientStop.id` keeps receiving exactly the object shape they always
 * have. Once they *have* opted in, stripping ids would defeat the feature for
 * the common `onValueChange={g => setG(g)}` pattern: the stored gradient would
 * come back untagged on the next render and fall straight back to position
 * matching. Stops added inside the picker are echoed too — a half-tagged set
 * is the same as none.
 */
function toPublicGradient(s: InternalState, withIds: boolean): Gradient {
  const stops: GradientStop[] = withIds
    ? s.stops.map((stop) => ({ ...stop }))
    : s.stops.map(({ id: _id, ...rest }) => rest);
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
  /**
   * Initial display format applied to every stop on mount. Each stop
   * tracks its **own** format from then on — changing format in one
   * stop's popover (or in `<GradientPicker.StopColor>`'s FormatSwitcher,
   * which is bound to the selected stop) only updates that stop's row
   * text. Defaults to `oklch` (lossless across the full P3/Rec.2020
   * gamut stop colors can occupy).
   */
  defaultStopColorFormat?: ColorFormat;
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
  /**
   * Toggle the `repeating` flag on the active gradient. When true,
   * `formatGradient` emits `repeating-<type>-gradient(...)`. Stops are
   * unaffected — the stop ramp simply tiles instead of stretching to fill
   * the box.
   */
  setRepeating: (repeating: boolean) => void;
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
  /**
   * Latest reported width of the visual gradient box (px). Set by
   * `<GradientPicker.Area>` via its `ResizeObserver`. Used by parts that
   * want to display radius as a percentage of the picker box (e.g. the
   * radius input on `<GradientPicker.RadiusInput>`) — they read this to
   * convert between the absolute-px storage and a friendlier % display.
   * `null` when no Area is currently mounted.
   */
  containerWidth: number | null;
  setContainerWidth: (width: number | null) => void;
  selectStop: (id: string) => void;
  addStop: (position: number, color?: OklchColor) => string;
  removeStop: (id: string) => void;
  moveStop: (id: string, position: number) => void;
  setStopColor: (id: string, color: OklchColor) => void;
  setStopHint: (id: string, hint: number | undefined) => void;
  reverseStops: () => void;
  /**
   * Per-stop display format. Each row tracks its own — changing format
   * in one stop's popover (or in `<GradientPicker.StopColor>`'s
   * FormatSwitcher, which is bound to the selected stop) only updates
   * that stop. Stops without an explicit entry fall back to
   * `defaultStopColorFormat` (default `oklch`).
   */
  getStopColorFormat: (id: string) => ColorFormat;
  setStopColorFormat: (id: string, format: ColorFormat) => void;
}

// ---- Hook ------------------------------------------------------------------

export function useGradientPicker(
  props: UseGradientPickerProps = {},
): GradientPickerState {
  const { value, defaultValue, onValueChange, defaultStopColorFormat } = props;
  const isControlled = value !== undefined;
  const fallbackFormat: ColorFormat = defaultStopColorFormat ?? "oklch";
  const [stopColorFormats, setStopColorFormats] = React.useState<
    Record<string, ColorFormat>
  >({});
  const getStopColorFormat = React.useCallback(
    (id: string): ColorFormat => stopColorFormats[id] ?? fallbackFormat,
    [stopColorFormats, fallbackFormat],
  );
  const setStopColorFormat = React.useCallback(
    (id: string, format: ColorFormat) =>
      setStopColorFormats((prev) =>
        prev[id] === format ? prev : { ...prev, [id]: format },
      ),
    [],
  );

  const [internal, setInternal] = React.useState<InternalState>(() =>
    attachIds(value ?? defaultValue ?? DEFAULT_LINEAR),
  );

  // Whether the caller opted into id tracking. Seeded from whatever gradient
  // we started with and re-derived whenever they hand us a new one wholesale;
  // it has to be a ref rather than derived state because the emit path inside
  // `apply` needs it for mutations (addStop, moveStop, …) that happen between
  // controlled syncs.
  const idTrackedRef = React.useRef(
    hasStopIds(value ?? defaultValue ?? DEFAULT_LINEAR),
  );
  const [selectedStopId, setSelectedStopId] = React.useState<string>(
    () => internal.stops[0]?.id ?? "",
  );

  // Track the last gradient we emitted upward so the controlled-sync path can
  // ignore echoes. Seed with the initial controlled value so the *first* sync
  // is treated as an echo of our own initial state.
  const lastEmittedRef = React.useRef<Gradient | null>(value ?? null);

  // stateRef mirrors `internal` so setters can compute the next state +
  // synchronously emit the cleaned gradient without going through an effect.
  // Assigned during render (refs are not state; idempotent under Strict Mode)
  // and re-assigned inside `apply` so chained setters in one event handler each
  // see the previous result.
  const stateRef = React.useRef(internal);
  stateRef.current = internal;

  // Latest-callback ref so a fresh arrow each render doesn't re-create setters.
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  // Per-shape override stashes. The radial gradient can carry either an
  // ellipse override (`radii`) or a circle override (`radiusPx`), never
  // both at once — `setRadii` / `setRadiusPx` cross-clear. But emit logic
  // in `formatGradient` checks the override fields before the `shape`
  // flag, so a stale override left over from the previous shape would
  // silently keep drawing the old ending shape. We stash whichever
  // override belongs to the shape we're leaving, strip both off the
  // gradient, then restore the target shape's stash. Toggling back gives
  // the user their last numeric value instead of nothing.
  const radiiStashRef = React.useRef<{ x: number; y: number } | undefined>(
    undefined,
  );
  const radiusPxStashRef = React.useRef<number | undefined>(undefined);

  // Sync controlled value during render (the "adjusting state during render"
  // pattern from React docs) instead of an effect. An effect would commit a
  // render with stale `internal`, then schedule a second render — children
  // would see one frame with the previous gradient. Doing the reconcile here
  // means the same render that observes a new `value` also renders with the
  // reconciled internal state.
  const [prevControlledValue, setPrevControlledValue] = React.useState<
    Gradient | undefined
  >(value);
  if (isControlled && value !== prevControlledValue) {
    setPrevControlledValue(value);
    if (value !== lastEmittedRef.current) {
      const prev = stateRef.current;
      // `prev.stops` is always position-sorted (attachIds and every mutating
      // setter sort), so the incoming array must be sorted the same way
      // before the element-wise compare. Without this, a controlled consumer
      // who keeps their stops in insertion order rather than position order
      // fails the match on *every* update and gets fresh ids each time —
      // which orphans `selectedStopId` and any per-stop color format.
      //
      // Without ids, stops are re-paired by index, so two sharing a position
      // are disambiguated only by array order: swap two coincident stops and
      // the ids stay put while the colors move between them. That is
      // long-standing behavior (unchanged by the sort) and is pinned by the
      // `stop identity with duplicate positions` tests. Consumers who need
      // exactness opt into `GradientStop.id` and take the identity path
      // below.
      const incoming = [...value.stops].sort(
        (a, b) => a.position - b.position,
      );
      // Identity path: when every incoming stop carries an id and that set is
      // exactly what we hold, pair on the id. This is the only way to follow
      // stops through a reorder that position+index cannot describe — two
      // stops sharing a position, most obviously.
      const prevIds = new Set(prev.stops.map((s) => s.id));
      const sameLength = prev.stops.length === incoming.length;
      // Ids, when supplied, are authoritative: a changed id set means the
      // consumer is describing different stops, even if the positions happen
      // to line up. Falling back to the position path there would ignore the
      // identity the consumer just handed us.
      const allHaveIds = incoming.length > 0 && incoming.every((s) => !!s.id);
      // Duplicated ids can't identify anything — treat them as un-tagged
      // rather than aliasing two stops onto one id.
      const uniqueIds =
        allHaveIds && new Set(incoming.map((s) => s.id)).size === incoming.length;
      const byId =
        uniqueIds && sameLength && incoming.every((s) => prevIds.has(s.id!));
      const sameShape = uniqueIds
        ? byId
        : sameLength &&
          prev.stops.every((s, i) => s.position === incoming[i].position);
      idTrackedRef.current = uniqueIds;
      const structuralMatch = prev.gradient.type === value.type && sameShape;
      const next: InternalState = structuralMatch
        ? {
            gradient: value,
            stops: byId
              ? incoming.map((s) => ({ ...s, id: s.id as string }))
              : prev.stops.map((s, i) => ({ ...incoming[i], id: s.id })),
          }
        : attachIds(value);
      if (!structuralMatch) {
        radiiStashRef.current = undefined;
        radiusPxStashRef.current = undefined;
      }
      stateRef.current = next;
      setInternal(next);
    }
  }

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
      const clean = toPublicGradient(next, idTrackedRef.current);
      lastEmittedRef.current = clean;
      onValueChangeRef.current?.(clean, formatGradient(clean));
    },
    [],
  );

  // ---- Gradient-level setters ----------------------------------------------

  const setGradient = React.useCallback(
    (next: Gradient) => {
      // Wholesale gradient replacement invalidates per-shape stashes — the
      // user is handing us a brand-new gradient, not toggling the current one.
      radiiStashRef.current = undefined;
      radiusPxStashRef.current = undefined;
      idTrackedRef.current = hasStopIds(next);
      apply(() => attachIds(next));
      setSelectedStopId((prev) => stateRef.current.stops[0]?.id ?? prev);
    },
    [apply],
  );

  const setType = React.useCallback(
    (type: GradientType) =>
      apply((prev) => {
        if (prev.gradient.type === type) return prev;
        radiiStashRef.current = undefined;
        radiusPxStashRef.current = undefined;
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
          gradient: {
            ...(prev.gradient as RadialGradient | ConicGradient),
            center: { x: clamp01(xy.x), y: clamp01(xy.y) },
          },
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

  const setRepeating = React.useCallback(
    (repeating: boolean) =>
      apply((prev) => {
        const cur = prev.gradient;
        // Strip the flag entirely when toggled off so the gradient stays
        // structurally identical to one that never had it — keeps equality
        // checks and serialization minimal.
        if (!repeating) {
          if (!cur.repeating) return prev;
          const { repeating: _drop, ...rest } = cur;
          return { gradient: rest as Gradient, stops: prev.stops };
        }
        if (cur.repeating) return prev;
        return {
          gradient: { ...cur, repeating: true } as Gradient,
          stops: prev.stops,
        };
      }),
    [apply],
  );

  const setRadialShape = React.useCallback(
    (shape: "circle" | "ellipse") =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        const cur = prev.gradient as RadialGradient;
        if (cur.shape === shape) return prev;
        if (cur.shape === "circle") {
          radiusPxStashRef.current = cur.radiusPx;
        } else {
          radiiStashRef.current = cur.radii;
        }
        const { radii: _r, radiusPx: _px, ...rest } = cur;
        const next: RadialGradient =
          shape === "circle"
            ? {
                ...rest,
                shape,
                ...(radiusPxStashRef.current !== undefined
                  ? { radiusPx: radiusPxStashRef.current }
                  : {}),
              }
            : {
                ...rest,
                shape,
                ...(radiiStashRef.current
                  ? { radii: radiiStashRef.current }
                  : {}),
              };
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const setRadialSize = React.useCallback(
    (size: RadialSizeKeyword) =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        const base = prev.gradient as RadialGradient;
        // The keyword form and the explicit `radii` / `radiusPx` overrides
        // are mutually exclusive at emit time — `formatGradient` reads the
        // overrides first and never falls through to `shape size`. Picking
        // a size keyword is the user explicitly opting back into the
        // keyword path, so drop the numeric overrides (and the stash) in
        // the same commit. Without this, the dropdown changes the model
        // field but the rendered CSS doesn't move.
        radiiStashRef.current = undefined;
        radiusPxStashRef.current = undefined;
        const { radii: _r, radiusPx: _px, ...rest } = base;
        return {
          gradient: { ...rest, size } as RadialGradient,
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
        // Setting `radii` is the ellipse path. Three jobs:
        //   1. Clear `radiusPx` so the two override fields never coexist.
        //   2. Enforce `shape: "ellipse"` — `formatGradient` emits
        //      `ellipse <rx> <ry>` regardless of `shape` when `radii` is
        //      present, so anything else would desync the model from CSS
        //      (and from the ShapeSwitcher / radius input UI).
        //   3. If the previous shape was circle, stash its `radiusPx` so the
        //      user can flip back via ShapeSwitcher without losing it (the
        //      stash matches `setRadialShape`'s own preservation behavior).
        if (base.shape === "circle" && base.radiusPx !== undefined) {
          radiusPxStashRef.current = base.radiusPx;
        }
        const { radii: _dropRadii, radiusPx: _dropPx, ...rest } = base;
        const next: RadialGradient = radii
          ? {
              ...rest,
              shape: "ellipse",
              radii: { x: Math.max(0, radii.x), y: Math.max(0, radii.y) },
            }
          : ({ ...rest, shape: "ellipse" } as RadialGradient);
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  const [containerWidth, setContainerWidth] =
    React.useState<number | null>(null);

  const setRadiusPx = React.useCallback(
    (px: number | undefined) =>
      apply((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        const base = prev.gradient as RadialGradient;
        // Setting `radiusPx` is the circle path. Mirror `setRadii`:
        // clear `radii`, enforce `shape: "circle"` (so the model can't
        // disagree with CSS / the radius input), and stash any previous
        // ellipse radii so ShapeSwitcher → ellipse restores them.
        if (base.shape === "ellipse" && base.radii) {
          radiiStashRef.current = base.radii;
        }
        const { radii: _dropRadii, radiusPx: _dropPx, ...rest } = base;
        const next: RadialGradient =
          px !== undefined
            ? { ...rest, shape: "circle", radiusPx: Math.max(0, px) }
            : ({ ...rest, shape: "circle" } as RadialGradient);
        return { gradient: next, stops: prev.stops };
      }),
    [apply],
  );

  // ---- Stop setters --------------------------------------------------------

  const selectStop = React.useCallback(
    (id: string) => setSelectedStopId(id),
    [setSelectedStopId],
  );

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
    [apply, setSelectedStopId],
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
    [apply, setSelectedStopId],
  );

  const moveStop = React.useCallback(
    (id: string, position: number) => {
      // Intentionally unclamped: on a positioned linear gradient, authored
      // positions outside 0..1 extrapolate beyond the [start, end] segment
      // (legal CSS). UI inputs clamp their own *displayed* coordinates.
      apply((prev) => {
        // Move the target stop to the end before sorting so that in a position
        // tie it sorts after existing stops at that position (stable sort).
        const others = prev.stops.filter((s) => s.id !== id);
        const moved = prev.stops.find((s) => s.id === id);
        if (!moved) return prev;
        return {
          gradient: prev.gradient,
          stops: sortByPosition([...others, { ...moved, position }]),
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
        // while ids stay attached to their colors. A hint lives on the stop
        // that *follows* its segment, so after the flip the mirrored hint
        // must move to the segment's other stop (the one that follows in
        // the new order) — keeping it in place would strand it on a stop
        // that now leads, where formatStops silently drops it.
        const movedHints = new Map<string, number>();
        prev.stops.forEach((s, i) => {
          if (s.hint !== undefined && i > 0) {
            movedHints.set(prev.stops[i - 1].id, 1 - s.hint);
          }
        });
        const flipped = prev.stops.map((s) => ({
          ...s,
          position: 1 - s.position,
          hint: movedHints.get(s.id),
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

  const cleanGradient = React.useMemo(
    () => toPublicGradient(internal, idTrackedRef.current),
    [internal],
  );

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
    setRepeating,
    setRadialShape,
    setRadialSize,
    setRadii,
    setRadiusPx,
    containerWidth,
    setContainerWidth,
    selectStop,
    addStop,
    removeStop,
    moveStop,
    setStopColor,
    setStopHint,
    reverseStops,
    getStopColorFormat,
    setStopColorFormat,
  };
}

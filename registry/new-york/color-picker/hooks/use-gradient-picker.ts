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
  setStartAngle: (angleDeg: number) => void;
  setCenter: (xy: { x: number; y: number }) => void;
  setInterp: (interp: GradientInterp) => void;
  setRadialShape: (shape: "circle" | "ellipse") => void;
  setRadialSize: (size: "closest-side" | "farthest-corner") => void;
  selectStop: (id: string) => void;
  addStop: (position: number, color?: OklchColor) => string;
  removeStop: (id: string) => void;
  moveStop: (id: string, position: number) => void;
  setStopColor: (id: string, color: OklchColor) => void;
  setStopHint: (id: string, hint: number | undefined) => void;
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
  // ignore echoes (parent re-renders with the same gradient we just sent).
  // Without this, every emit triggers a controlled-sync that builds a new
  // internal state object, which re-triggers the emit effect → infinite loop.
  const lastEmittedRef = React.useRef<Gradient | null>(null);

  // Sync controlled value into internal state, preserving stop ids when possible.
  React.useEffect(() => {
    if (!isControlled || !value) return;
    if (value === lastEmittedRef.current) return;
    setInternal((prev) => {
      if (
        prev.gradient.type === value.type &&
        prev.stops.length === value.stops.length &&
        prev.stops.every((s, i) => s.position === value.stops[i].position)
      ) {
        return {
          gradient: value,
          stops: prev.stops.map((s, i) => ({ ...value.stops[i], id: s.id })),
        };
      }
      return attachIds(value);
    });
  }, [isControlled, value]);

  // Emit onValueChange whenever internal state changes (but not on first render).
  // Decoupled from setters so StrictMode double-invocation of updaters doesn't
  // fire the callback twice.
  const isFirstRenderRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!onValueChange) return;
    const clean = toPublicGradient(internal);
    lastEmittedRef.current = clean;
    onValueChange(clean, formatGradient(clean));
  }, [internal, onValueChange]);

  // ---- Gradient-level setters ----------------------------------------------

  const setGradient = React.useCallback(
    (next: Gradient) => {
      const internalNext = attachIds(next);
      setInternal(internalNext);
      setSelectedStopId(internalNext.stops[0]?.id ?? "");
    },
    [],
  );

  const setType = React.useCallback(
    (type: GradientType) => {
      setInternal((prev) => {
        if (prev.gradient.type === type) return prev;
        const fallback = defaultsForType(type);
        const next: InternalState = {
          gradient: { ...fallback, interp: prev.gradient.interp } as Gradient,
          stops: prev.stops,
        };
        return next;
      });
    },
    [],
  );

  const setAngle = React.useCallback(
    (angleDeg: number) => {
      setInternal((prev) => {
        if (prev.gradient.type !== "linear") return prev;
        return {
          gradient: { ...(prev.gradient as LinearGradient), angle: angleDeg },
          stops: prev.stops,
        };
      });
    },
    [],
  );

  const setStartAngle = React.useCallback(
    (angleDeg: number) => {
      setInternal((prev) => {
        if (prev.gradient.type !== "conic") return prev;
        return {
          gradient: { ...(prev.gradient as ConicGradient), startAngle: angleDeg },
          stops: prev.stops,
        };
      });
    },
    [],
  );

  const setCenter = React.useCallback(
    (xy: { x: number; y: number }) => {
      setInternal((prev) => {
        if (prev.gradient.type === "linear") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient | ConicGradient), center: xy },
          stops: prev.stops,
        };
      });
    },
    [],
  );

  const setInterp = React.useCallback(
    (interp: GradientInterp) => {
      setInternal((prev) => {
        return {
          gradient: { ...prev.gradient, interp } as Gradient,
          stops: prev.stops,
        };
      });
    },
    [],
  );

  const setRadialShape = React.useCallback(
    (shape: "circle" | "ellipse") => {
      setInternal((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient), shape },
          stops: prev.stops,
        };
      });
    },
    [],
  );

  const setRadialSize = React.useCallback(
    (size: "closest-side" | "farthest-corner") => {
      setInternal((prev) => {
        if (prev.gradient.type !== "radial") return prev;
        return {
          gradient: { ...(prev.gradient as RadialGradient), size },
          stops: prev.stops,
        };
      });
    },
    [],
  );

  // ---- Stop setters --------------------------------------------------------

  const selectStop = React.useCallback((id: string) => setSelectedStopId(id), []);

  const addStop = React.useCallback(
    (position: number, color?: OklchColor): string => {
      const id = nextId();
      const fallback: OklchColor = { l: 0.5, c: 0, h: 0, alpha: 1 };
      setInternal((prev) => {
        return {
          gradient: prev.gradient,
          stops: sortByPosition([
            ...prev.stops,
            { id, position, color: color ?? fallback },
          ]),
        };
      });
      setSelectedStopId(id);
      return id;
    },
    [],
  );

  const removeStop = React.useCallback(
    (id: string) => {
      let nextSelId: string | null = null;
      setInternal((prev) => {
        if (prev.stops.length <= 1) return prev;
        const idx = prev.stops.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const filtered = prev.stops.filter((s) => s.id !== id);
        nextSelId = filtered[Math.min(idx, filtered.length - 1)].id;
        return { gradient: prev.gradient, stops: filtered };
      });
      if (nextSelId !== null) setSelectedStopId(nextSelId);
    },
    [],
  );

  const moveStop = React.useCallback(
    (id: string, position: number) => {
      const clamped = Math.max(0, Math.min(1, position));
      setInternal((prev) => {
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
    [],
  );

  const setStopColor = React.useCallback(
    (id: string, color: OklchColor) => {
      setInternal((prev) => {
        return {
          gradient: prev.gradient,
          stops: prev.stops.map((s) => (s.id === id ? { ...s, color } : s)),
        };
      });
    },
    [],
  );

  const setStopHint = React.useCallback(
    (id: string, hint: number | undefined) => {
      setInternal((prev) => {
        return {
          gradient: prev.gradient,
          stops: prev.stops.map((s) => (s.id === id ? { ...s, hint } : s)),
        };
      });
    },
    [],
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
    setStartAngle,
    setCenter,
    setInterp,
    setRadialShape,
    setRadialSize,
    selectStop,
    addStop,
    removeStop,
    moveStop,
    setStopColor,
    setStopHint,
  };
}

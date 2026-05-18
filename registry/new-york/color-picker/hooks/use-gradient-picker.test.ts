import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGradientPicker } from "./use-gradient-picker";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type Gradient,
  type LinearGradient,
  type RadialGradient,
} from "../lib/gradient";

describe("useGradientPicker", () => {
  it("defaults to a linear gradient when no value is provided", () => {
    const { result } = renderHook(() => useGradientPicker({}));
    expect(result.current.gradient.type).toBe("linear");
    expect(result.current.gradient.stops).toHaveLength(2);
    expect(result.current.selectedStopId).toBe(result.current.stops[0].id);
  });

  it("addStop inserts a stop at the requested position", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    act(() => {
      result.current.addStop(0.5, { l: 0.5, c: 0.1, h: 200, alpha: 1 });
    });
    expect(result.current.stops).toHaveLength(3);
    expect(result.current.stops[1].position).toBeCloseTo(0.5);
    expect(result.current.selectedStopId).toBe(result.current.stops[1].id);
  });

  it("removeStop removes by id and reselects a neighbor", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const firstId = result.current.stops[0].id;
    act(() => {
      result.current.removeStop(firstId);
    });
    expect(result.current.stops).toHaveLength(1);
    expect(result.current.selectedStopId).toBe(result.current.stops[0].id);
  });

  it("removeStop is a no-op when only one stop remains", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: { ...DEFAULT_LINEAR, stops: [DEFAULT_LINEAR.stops[0]] },
      }),
    );
    const onlyId = result.current.stops[0].id;
    act(() => {
      result.current.removeStop(onlyId);
    });
    expect(result.current.stops).toHaveLength(1);
  });

  it("moveStop preserves selection by id (not by index)", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const firstId = result.current.stops[0].id;
    act(() => {
      result.current.selectStop(firstId);
    });
    act(() => {
      result.current.moveStop(firstId, 1.0);
    });
    expect(result.current.selectedStopId).toBe(firstId);
    expect(result.current.stops[result.current.stops.length - 1].id).toBe(firstId);
  });

  it("setType switches type while preserving stops", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const stopsBefore = result.current.stops.map((s) => s.position);
    act(() => {
      result.current.setType("radial");
    });
    expect(result.current.gradient.type).toBe("radial");
    expect(result.current.stops.map((s) => s.position)).toEqual(stopsBefore);
  });

  it("setType to conic preserves stops and uses default startAngle / center", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    act(() => {
      result.current.setType("conic");
    });
    expect(result.current.gradient.type).toBe("conic");
    expect((result.current.gradient as Extract<Gradient, { type: "conic" }>).startAngle).toBe(0);
  });

  it("reverseStops mirrors stop positions around 0.5 and keeps ids attached to colors", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: {
          ...DEFAULT_LINEAR,
          stops: [
            { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
            { color: { l: 0.5, c: 0.2, h: 200, alpha: 1 }, position: 0.3 },
            { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
          ],
        },
      }),
    );
    const ids = result.current.stops.map((s) => s.id);
    const colorsByOriginalId = new Map(
      result.current.stops.map((s) => [s.id, s.color]),
    );
    act(() => {
      result.current.reverseStops();
    });
    const positionsAfter = result.current.stops.map((s) => s.position);
    expect(positionsAfter).toEqual([0, 0.7, 1]);
    // Each original id still points at the same color it had.
    for (const s of result.current.stops) {
      expect(s.color).toEqual(colorsByOriginalId.get(s.id));
    }
    expect(new Set(result.current.stops.map((s) => s.id))).toEqual(new Set(ids));
  });

  describe("setRadialShape", () => {
    const asRadial = (g: Gradient) => g as RadialGradient;

    it("toggling ellipse → circle drops the ellipse `radii` override", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      // Start on ellipse with an explicit radii override (the picker's
      // ellipse path produces this state).
      act(() => {
        result.current.setRadialShape("ellipse");
        result.current.setRadii({ x: 0.6, y: 0.3 });
      });
      expect(asRadial(result.current.gradient).radii).toEqual({ x: 0.6, y: 0.3 });
      act(() => {
        result.current.setRadialShape("circle");
      });
      const g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      // Critical: the ellipse override must not survive the shape flip,
      // otherwise emit falls into the `radii` branch and keeps drawing an
      // ellipse despite shape === "circle".
      expect(g.radii).toBeUndefined();
    });

    it("toggling circle → ellipse drops the circle `radiusPx` override", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("circle");
        result.current.setRadiusPx(120);
      });
      expect(asRadial(result.current.gradient).radiusPx).toBe(120);
      act(() => {
        result.current.setRadialShape("ellipse");
      });
      const g = asRadial(result.current.gradient);
      expect(g.shape).toBe("ellipse");
      expect(g.radiusPx).toBeUndefined();
    });

    it("toggling away and back restores the previous override per shape", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("ellipse");
        result.current.setRadii({ x: 0.6, y: 0.3 });
      });
      act(() => {
        result.current.setRadialShape("circle");
        result.current.setRadiusPx(80);
      });
      let g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      expect(g.radiusPx).toBe(80);
      expect(g.radii).toBeUndefined();
      // Toggling back to ellipse must restore the prior ellipse radii (not
      // leave the user with a cleared override they can't recover from the
      // UI — the px input is hidden on ellipse).
      act(() => {
        result.current.setRadialShape("ellipse");
      });
      g = asRadial(result.current.gradient);
      expect(g.shape).toBe("ellipse");
      expect(g.radii).toEqual({ x: 0.6, y: 0.3 });
      expect(g.radiusPx).toBeUndefined();
      // And back to circle restores radiusPx.
      act(() => {
        result.current.setRadialShape("circle");
      });
      g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      expect(g.radiusPx).toBe(80);
      expect(g.radii).toBeUndefined();
    });

    it("setType to non-radial clears stashes so a later radial starts fresh", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("circle");
        result.current.setRadiusPx(200);
      });
      act(() => {
        result.current.setType("linear");
      });
      act(() => {
        result.current.setType("radial");
      });
      // Fresh radial defaults to ellipse with no overrides. Toggling to
      // circle should NOT pull the old 200px stash from before the type
      // round-trip.
      act(() => {
        result.current.setRadialShape("circle");
      });
      const g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      expect(g.radiusPx).toBeUndefined();
    });
  });

  it("onValueChange emits a clean Gradient (no internal ids)", () => {
    let emitted: Gradient | null = null;
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: DEFAULT_LINEAR,
        onValueChange: (g) => {
          emitted = g;
        },
      }),
    );
    act(() => {
      result.current.setAngle(45);
    });
    expect(emitted).not.toBeNull();
    expect((emitted as unknown as LinearGradient).angle).toBe(45);
    for (const s of (emitted as unknown as LinearGradient).stops) {
      expect((s as unknown as { id?: string }).id).toBeUndefined();
    }
  });
});

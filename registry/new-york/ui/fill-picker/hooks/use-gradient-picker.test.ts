import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGradientPicker } from "./use-gradient-picker";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
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

    it("setCenter does not clear an explicit `radiusPx` (move-gradient flow)", () => {
      // Repro for: shape=circle, user types r=55%, then drags the gradient
      // by its center handle on the Area. After release, `r` was going
      // back to "auto" because something was clearing radiusPx.
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("circle");
        result.current.setRadiusPx(120);
      });
      expect(asRadial(result.current.gradient).radiusPx).toBe(120);
      act(() => {
        result.current.setCenter({ x: 0.6, y: 0.4 });
      });
      const g = asRadial(result.current.gradient);
      expect(g.center).toEqual({ x: 0.6, y: 0.4 });
      // Critical: moving the center must not erase the user's explicit
      // radius — that override lives independent of the center.
      expect(g.radiusPx).toBe(120);
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

    // Regression: Shift-drag / Shift-keyboard on the radial-edge overlay
    // handle flips which setter the overlay calls (setRadiusPx vs setRadii),
    // but the shape field used to stay put — leaving e.g. {shape:"circle",
    // radii:{...}} where formatGradient emits an ellipse and the
    // RadiusInput (circle-only) shows stale data. The setters now enforce
    // their implied shape and stash the displaced value for round-trip.
    it("setRadii from shape=circle flips shape to ellipse and stashes radiusPx", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("circle");
        result.current.setRadiusPx(140);
      });
      // Simulate a Shift-drag on the overlay from a circle state.
      act(() => {
        result.current.setRadii({ x: 0.4, y: 0.7 });
      });
      let g = asRadial(result.current.gradient);
      expect(g.shape).toBe("ellipse");
      expect(g.radii).toEqual({ x: 0.4, y: 0.7 });
      expect(g.radiusPx).toBeUndefined();
      // Flipping back via the ShapeSwitcher must restore the user's
      // pre-Shift-drag circle radius (it was stashed during setRadii).
      act(() => {
        result.current.setRadialShape("circle");
      });
      g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      expect(g.radiusPx).toBe(140);
    });

    it("setRadiusPx from shape=ellipse flips shape to circle and stashes radii", () => {
      const { result } = renderHook(() =>
        useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
      );
      act(() => {
        result.current.setRadialShape("ellipse");
        result.current.setRadii({ x: 0.6, y: 0.2 });
      });
      // Simulate a Shift-drag on the overlay from an ellipse state.
      act(() => {
        result.current.setRadiusPx(90);
      });
      let g = asRadial(result.current.gradient);
      expect(g.shape).toBe("circle");
      expect(g.radiusPx).toBe(90);
      expect(g.radii).toBeUndefined();
      act(() => {
        result.current.setRadialShape("ellipse");
      });
      g = asRadial(result.current.gradient);
      expect(g.shape).toBe("ellipse");
      expect(g.radii).toEqual({ x: 0.6, y: 0.2 });
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

describe("setCenter clamps to the gradient box (2026-07-12 audit C-8)", () => {
  it("clamps out-of-box centers like setLinearStart/End do", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_RADIAL }),
    );
    act(() => {
      result.current.setCenter({ x: 1.7, y: -0.3 });
    });
    const g = result.current.gradient;
    expect(g.type).toBe("radial");
    if (g.type === "radial") {
      expect(g.center).toEqual({ x: 1, y: 0 });
    }
  });
});

describe("reverseStops midpoint hints (2026-07-12 audit T-4)", () => {
  it("re-attaches mirrored hints to the stop that follows in the new order", () => {
    const white = { l: 1, c: 0, h: 0, alpha: 1 };
    const black = { l: 0, c: 0, h: 0, alpha: 1 };
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: {
          ...DEFAULT_LINEAR,
          stops: [
            { color: white, position: 0 },
            // Hint at 10% belongs to the white→black segment, stored on the
            // following stop per the lib convention.
            { color: black, position: 1, hint: 0.1 },
          ],
        },
      }),
    );
    act(() => result.current.reverseStops());
    const stops = result.current.stops;
    // Order flipped: black now first, white last.
    expect(stops[0].color.l).toBe(0);
    expect(stops[1].color.l).toBe(1);
    // The mirrored hint (0.9) must live on the *following* stop of the
    // black→white segment — the white stop — or formatStops drops it.
    expect(stops[0].hint).toBeUndefined();
    expect(stops[1].hint).toBeCloseTo(0.9, 6);
  });
});

describe("removeStop unknown id (2026-07-12 audit T-5)", () => {
  it("is a no-op for an id that does not exist", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_LINEAR }),
    );
    const before = result.current.stops;
    act(() => result.current.removeStop("no-such-id"));
    expect(result.current.stops).toEqual(before);
  });
});

// I-2 (2026-07-25 adversarial review): attachIds — behind the initial seed,
// setGradient, and the controlled structural-mismatch sync — kept the caller's
// array order, while formatGradient emits in array order and CSS requires
// non-decreasing positions. An out-of-order (but type-legal) gradient emitted
// CSS the browser silently clamps into a flat ramp.
describe("stop ordering at the entry points", () => {
  const scrambled: Gradient = {
    ...DEFAULT_LINEAR,
    stops: [
      { position: 1, color: { l: 0.5, c: 0.2, h: 260, alpha: 1 } },
      { position: 0.25, color: { l: 0.7, c: 0.2, h: 120, alpha: 1 } },
      { position: 0, color: { l: 0.6, c: 0.2, h: 30, alpha: 1 } },
    ],
  };

  const positions = (stops: readonly { position: number }[]) =>
    stops.map((s) => s.position);

  const isNonDecreasing = (xs: number[]) =>
    xs.every((x, i) => i === 0 || xs[i - 1] <= x);

  it("sorts an out-of-order defaultValue", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: scrambled }),
    );
    expect(positions(result.current.stops)).toEqual([0, 0.25, 1]);
  });

  it("sorts an out-of-order controlled value", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ value: scrambled }),
    );
    expect(positions(result.current.stops)).toEqual([0, 0.25, 1]);
  });

  it("sorts an out-of-order setGradient", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_LINEAR }),
    );
    act(() => {
      result.current.setGradient(scrambled);
    });
    expect(positions(result.current.stops)).toEqual([0, 0.25, 1]);
  });

  it("emits CSS whose stop percentages never decrease", () => {
    const emitted: string[] = [];
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: DEFAULT_LINEAR,
        onValueChange: (_g, css) => emitted.push(css),
      }),
    );
    act(() => {
      result.current.setGradient(scrambled);
    });
    const css = emitted.at(-1)!;
    const percents = [...css.matchAll(/(-?[\d.]+)%/g)].map((m) =>
      Number(m[1]),
    );
    expect(percents.length).toBeGreaterThan(0);
    expect(isNonDecreasing(percents)).toBe(true);
  });

  it("selects the lowest-positioned stop, not the array-first one", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: scrambled }),
    );
    expect(result.current.selectedStop?.position).toBe(0);
  });

  it("keeps ordering stable through a later color edit", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: scrambled }),
    );
    const midId = result.current.stops[1].id;
    act(() => {
      result.current.setStopColor(midId, { l: 0.4, c: 0.1, h: 200, alpha: 1 });
    });
    expect(positions(result.current.stops)).toEqual([0, 0.25, 1]);
  });
});

// T-11 (2026-07-25 adversarial review): neither endpoint setter was ever
// called, so the clamp01 guards and the atan2 angle recomputation were
// unverified.
describe("setLinearStart / setLinearEnd", () => {
  it("clamps out-of-range coordinates into 0..1", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_LINEAR }),
    );
    act(() => {
      result.current.setLinearStart({ x: -3, y: 42 });
      result.current.setLinearEnd({ x: 1.5, y: -0.2 });
    });
    const g = result.current.gradient as LinearGradient;
    expect(g.start).toEqual({ x: 0, y: 1 });
    expect(g.end).toEqual({ x: 1, y: 0 });
  });

  it("recomputes the angle from the endpoint direction", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_LINEAR }),
    );
    act(() => {
      // Straight down the box: CSS 0deg points up, so down is 180deg.
      result.current.setLinearStart({ x: 0.5, y: 0 });
      result.current.setLinearEnd({ x: 0.5, y: 1 });
    });
    expect((result.current.gradient as LinearGradient).angle).toBeCloseTo(180, 3);

    act(() => {
      // Left-to-right is 90deg.
      result.current.setLinearStart({ x: 0, y: 0.5 });
      result.current.setLinearEnd({ x: 1, y: 0.5 });
    });
    expect((result.current.gradient as LinearGradient).angle).toBeCloseTo(90, 3);
  });

  it("clears the positioned override when passed undefined", () => {
    const { result } = renderHook(() =>
      useGradientPicker({ defaultValue: DEFAULT_LINEAR }),
    );
    act(() => {
      result.current.setLinearStart({ x: 0, y: 0 });
      result.current.setLinearEnd({ x: 1, y: 1 });
    });
    expect((result.current.gradient as LinearGradient).start).toBeDefined();
    act(() => {
      result.current.setLinearStart(undefined);
    });
    expect((result.current.gradient as LinearGradient).start).toBeUndefined();
  });
});

// R2-1 (2026-07-25 adversarial review, round 2): sorting stops on entry made
// the controlled structural-match compare a sorted prev against the caller's
// raw array order. A consumer holding stops in insertion order then failed the
// match on every update, minting fresh ids each time — which orphaned
// selectedStopId (selectedStop went null) and any per-stop color format.
describe("controlled sync keeps stop identity stable", () => {
  const unsorted: LinearGradient = {
    ...DEFAULT_LINEAR,
    stops: [
      { position: 0.7, color: { l: 0.5, c: 0.2, h: 260, alpha: 1 } },
      { position: 0.2, color: { l: 0.6, c: 0.2, h: 30, alpha: 1 } },
    ],
  };

  /** An update that touches nothing about the stops. */
  const unrelatedEdit = (g: LinearGradient): LinearGradient => ({
    ...g,
    interp: g.interp === "oklch" ? "oklab" : "oklch",
  });

  it("preserves ids across an unrelated update to an unsorted controlled value", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: unsorted } },
    );
    const before = result.current.stops.map((s) => s.id);
    rerender({ value: unrelatedEdit(unsorted) });
    expect(result.current.stops.map((s) => s.id)).toEqual(before);
  });

  it("keeps the selection resolvable across that update", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: unsorted } },
    );
    const selected = result.current.selectedStopId;
    rerender({ value: unrelatedEdit(unsorted) });
    expect(result.current.selectedStopId).toBe(selected);
    expect(result.current.selectedStop).not.toBeNull();
  });

  it("keeps per-stop color formats attached across that update", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: unsorted } },
    );
    const id = result.current.stops[0].id;
    act(() => {
      result.current.setStopColorFormat(id, "hsl");
    });
    rerender({ value: unrelatedEdit(unsorted) });
    expect(result.current.getStopColorFormat(id)).toBe("hsl");
  });

  it("still re-keys when the stop set genuinely changes shape", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: unsorted } },
    );
    const before = result.current.stops.map((s) => s.id);
    rerender({
      value: {
        ...unsorted,
        stops: [
          ...unsorted.stops,
          { position: 0.9, color: { l: 0.4, c: 0.1, h: 10, alpha: 1 } },
        ],
      },
    });
    expect(result.current.stops).toHaveLength(3);
    expect(result.current.stops.map((s) => s.id)).not.toEqual(before);
  });

  it("still sorts the stops it stores from an unsorted controlled value", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: unsorted } },
    );
    rerender({ value: unrelatedEdit(unsorted) });
    expect(result.current.stops.map((s) => s.position)).toEqual([0.2, 0.7]);
  });
});

// R3-1 (2026-07-25 adversarial review, round 3): documents — rather than
// asserts as desirable — how stops sharing a position behave on a controlled
// reorder *when the consumer supplies no ids*. Index is then the only
// disambiguator, so the colors move between the existing ids. Verified
// identical on the pre-review baseline (d2cba69~1), so this is long-standing
// behavior, not a consequence of sorting stops on entry. The opt-in fix is
// `GradientStop.id` — see "controlled stop identity" below.
describe("stop identity with duplicate positions", () => {
  const gray = { l: 0.9, c: 0, h: 0, alpha: 1 };
  const warm = { l: 0.6, c: 0.2, h: 30, alpha: 1 };
  const cool = { l: 0.5, c: 0.2, h: 260, alpha: 1 };

  const at = (stops: LinearGradient["stops"]): LinearGradient => ({
    ...DEFAULT_LINEAR,
    stops,
  });

  it("keeps ids by index when two coincident stops are swapped", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      {
        initialProps: {
          value: at([
            { position: 0, color: gray },
            { position: 0.5, color: warm },
            { position: 0.5, color: cool },
          ]) as Gradient,
        },
      },
    );
    const ids = result.current.stops.map((s) => s.id);

    rerender({
      value: at([
        { position: 0, color: gray },
        { position: 0.5, color: cool },
        { position: 0.5, color: warm },
      ]) as Gradient,
    });

    // Ids are stable…
    expect(result.current.stops.map((s) => s.id)).toEqual(ids);
    // …and the colors moved between them, following array order.
    expect(result.current.stops[1].color.h).toBeCloseTo(cool.h, 0);
    expect(result.current.stops[2].color.h).toBeCloseTo(warm.h, 0);
  });

  it("does not drop or duplicate a stop when positions collide", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        value: at([
          { position: 0.5, color: warm },
          { position: 0.5, color: cool },
          { position: 0.5, color: gray },
        ]) as Gradient,
      }),
    );
    expect(result.current.stops).toHaveLength(3);
    expect(new Set(result.current.stops.map((s) => s.id)).size).toBe(3);
  });
});

// Opt-in stop identity: `GradientStop.id` lets a controlled consumer tell the
// picker which stop is which, so reconciliation follows identity instead of
// position+index. This closes R3-1 above — the duplicate-position reorder that
// index pairing cannot describe.
describe("controlled stop identity via GradientStop.id", () => {
  const warm = { l: 0.6, c: 0.2, h: 30, alpha: 1 };
  const cool = { l: 0.5, c: 0.2, h: 260, alpha: 1 };
  const gray = { l: 0.9, c: 0, h: 0, alpha: 1 };

  const withIds = (
    stops: Array<{ id: string; position: number; color: typeof warm }>,
  ): Gradient => ({ ...DEFAULT_LINEAR, stops }) as Gradient;

  it("adopts consumer ids instead of generating its own", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        value: withIds([
          { id: "a", position: 0, color: warm },
          { id: "b", position: 1, color: cool },
        ]),
      }),
    );
    expect(result.current.stops.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("follows the right stop through a duplicate-position reorder", () => {
    const first = withIds([
      { id: "top", position: 0, color: gray },
      { id: "warm", position: 0.5, color: warm },
      { id: "cool", position: 0.5, color: cool },
    ]);
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: first } },
    );

    // Swap the two coincident stops in the consumer's array.
    rerender({
      value: withIds([
        { id: "top", position: 0, color: gray },
        { id: "cool", position: 0.5, color: cool },
        { id: "warm", position: 0.5, color: warm },
      ]),
    });

    // Each id still carries its own color — the defect R3-1 documents for the
    // id-less path, where the colors swap between ids instead.
    const byId = Object.fromEntries(
      result.current.stops.map((s) => [s.id, Math.round(s.color.h)]),
    );
    expect(byId.warm).toBeCloseTo(30, 0);
    expect(byId.cool).toBeCloseTo(260, 0);
  });

  it("keeps selection and per-stop format attached to the same stop across a reorder", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      {
        initialProps: {
          value: withIds([
            { id: "warm", position: 0.5, color: warm },
            { id: "cool", position: 0.5, color: cool },
          ]),
        },
      },
    );
    act(() => {
      result.current.selectStop("cool");
      result.current.setStopColorFormat("cool", "hsl");
    });

    rerender({
      value: withIds([
        { id: "cool", position: 0.5, color: cool },
        { id: "warm", position: 0.5, color: warm },
      ]),
    });

    expect(result.current.selectedStopId).toBe("cool");
    expect(result.current.selectedStop?.color.h).toBeCloseTo(260, 0);
    expect(result.current.getStopColorFormat("cool")).toBe("hsl");
  });

  it("falls back to a generated id when consumer ids collide", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        value: withIds([
          { id: "dup", position: 0, color: warm },
          { id: "dup", position: 1, color: cool },
        ]),
      }),
    );
    const ids = result.current.stops.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe("dup");
  });

  it("re-keys when the incoming id set is genuinely different", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      {
        initialProps: {
          value: withIds([
            { id: "a", position: 0, color: warm },
            { id: "b", position: 1, color: cool },
          ]),
        },
      },
    );
    rerender({
      value: withIds([
        { id: "x", position: 0, color: warm },
        { id: "y", position: 1, color: cool },
      ]),
    });
    expect(result.current.stops.map((s) => s.id)).toEqual(["x", "y"]);
  });

  it("leaves id-less gradients on the existing position+index path", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) => useGradientPicker({ value }),
      { initialProps: { value: DEFAULT_LINEAR } },
    );
    const before = result.current.stops.map((s) => s.id);
    const edited: LinearGradient = { ...DEFAULT_LINEAR, interp: "oklab" };
    rerender({ value: edited });
    expect(result.current.stops.map((s) => s.id)).toEqual(before);
  });
});

// The round-trip that makes ids actually useful: the picker echoes ids back
// through onValueChange, so the ordinary `onValueChange={g => setG(g)}` pattern
// keeps identity instead of losing the tags on the first update and silently
// falling back to position matching.
describe("stop ids round-trip through onValueChange", () => {
  const warm = { l: 0.6, c: 0.2, h: 30, alpha: 1 };
  const cool = { l: 0.5, c: 0.2, h: 260, alpha: 1 };

  const tagged: Gradient = {
    ...DEFAULT_LINEAR,
    stops: [
      { id: "warm", position: 0, color: warm },
      { id: "cool", position: 1, color: cool },
    ],
  } as Gradient;

  it("emits ids when the caller opted in", () => {
    const seen: Gradient[] = [];
    const { result } = renderHook(() =>
      useGradientPicker({ value: tagged, onValueChange: (g) => seen.push(g) }),
    );
    act(() => {
      result.current.setStopColor("warm", { ...warm, h: 90 });
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].stops.map((s) => s.id)).toEqual(["warm", "cool"]);
  });

  it("omits ids entirely when the caller never opted in", () => {
    const seen: Gradient[] = [];
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: DEFAULT_LINEAR,
        onValueChange: (g) => seen.push(g),
      }),
    );
    act(() => {
      result.current.setStopColor(result.current.stops[0].id, {
        ...warm,
        h: 90,
      });
    });
    expect(seen).toHaveLength(1);
    for (const s of seen[0].stops) {
      expect(s).not.toHaveProperty("id");
    }
  });

  it("tags stops added inside the picker so the set never goes half-tagged", () => {
    const seen: Gradient[] = [];
    const { result } = renderHook(() =>
      useGradientPicker({ value: tagged, onValueChange: (g) => seen.push(g) }),
    );
    act(() => {
      result.current.addStop(0.5, { l: 0.7, c: 0.1, h: 150, alpha: 1 });
    });
    const emitted = seen.at(-1)!;
    expect(emitted.stops).toHaveLength(3);
    for (const s of emitted.stops) expect(typeof s.id).toBe("string");
    expect(new Set(emitted.stops.map((s) => s.id)).size).toBe(3);
  });

  it("survives a full store-what-was-emitted cycle", () => {
    // The pattern the echo exists for: whatever the picker emits becomes the
    // next `value`. Identity must hold across repeated cycles.
    let current: Gradient = tagged;
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) =>
        useGradientPicker({
          value,
          onValueChange: (g) => {
            current = g;
          },
        }),
      { initialProps: { value: current } },
    );

    for (const hue of [90, 200, 310]) {
      act(() => {
        result.current.setStopColor("warm", { ...warm, h: hue });
      });
      rerender({ value: current });
      expect(result.current.stops.map((s) => s.id)).toEqual(["warm", "cool"]);
      expect(
        result.current.stops.find((s) => s.id === "warm")!.color.h,
      ).toBeCloseTo(hue, 0);
    }
  });

  it("keeps identity through a reorder after a store-what-was-emitted cycle", () => {
    let current: Gradient = {
      ...DEFAULT_LINEAR,
      stops: [
        { id: "warm", position: 0.5, color: warm },
        { id: "cool", position: 0.5, color: cool },
      ],
    } as Gradient;
    const { result, rerender } = renderHook(
      ({ value }: { value: Gradient }) =>
        useGradientPicker({
          value,
          onValueChange: (g) => {
            current = g;
          },
        }),
      { initialProps: { value: current } },
    );
    act(() => {
      result.current.selectStop("cool");
    });
    act(() => {
      result.current.setStopColor("cool", { ...cool, h: 300 });
    });
    rerender({ value: current });

    // Now reorder the stored (id-bearing) stops, as an external edit would.
    rerender({
      value: { ...current, stops: [...current.stops].reverse() } as Gradient,
    });
    expect(result.current.selectedStopId).toBe("cool");
    expect(
      result.current.stops.find((s) => s.id === "cool")!.color.h,
    ).toBeCloseTo(300, 0);
  });
});

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGradientPicker } from "./use-gradient-picker";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type Gradient,
  type LinearGradient,
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

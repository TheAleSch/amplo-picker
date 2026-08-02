import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFillPicker } from "./use-fill-picker";
import { DEFAULT_LINEAR } from "../lib/gradient";

describe("useFillPicker", () => {
  it("defaults to color mode with a black color", () => {
    const { result } = renderHook(() => useFillPicker({}));
    expect(result.current.mode).toBe("color");
    expect(result.current.fill.kind).toBe("color");
  });

  it("setMode 'gradient' switches to a default linear gradient", () => {
    const { result } = renderHook(() => useFillPicker({}));
    act(() => result.current.setMode("gradient"));
    expect(result.current.mode).toBe("gradient");
    expect(result.current.fill.kind).toBe("gradient");
  });

  it("setMode 'color' restores the last color when switching back", () => {
    const { result } = renderHook(() =>
      useFillPicker({
        defaultValue: { kind: "color", color: { l: 0.5, c: 0.1, h: 200, alpha: 1 } },
      }),
    );
    act(() => result.current.setMode("gradient"));
    act(() => result.current.setMode("color"));
    expect(result.current.fill.kind).toBe("color");
    expect((result.current.fill as { kind: "color"; color: { l: number } }).color.l).toBe(0.5);
  });

  it("emits onValueChange with the formatted CSS", () => {
    let lastCss = "";
    const { result } = renderHook(() =>
      useFillPicker({
        onValueChange: (_f, css) => {
          lastCss = css;
        },
      }),
    );
    act(() => result.current.setFill({ kind: "gradient", gradient: DEFAULT_LINEAR }));
    expect(lastCss).toContain("linear-gradient");
  });
});

describe("useFillPicker (2026-07-12 audit T-7)", () => {
  it("emits the exact formatted CSS for a gradient fill", () => {
    let lastCss = "";
    const { result } = renderHook(() =>
      useFillPicker({
        onValueChange: (_f, css) => {
          lastCss = css;
        },
      }),
    );
    act(() =>
      result.current.setFill({ kind: "gradient", gradient: DEFAULT_LINEAR }),
    );
    expect(lastCss).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("controlled mode: value prop drives the fill, setFill only emits", () => {
    const red = { kind: "color" as const, color: { l: 0.6, c: 0.2, h: 30, alpha: 1 } };
    const blue = { kind: "color" as const, color: { l: 0.6, c: 0.2, h: 240, alpha: 1 } };
    let emitted: unknown = null;
    const { result, rerender } = renderHook(
      ({ value }: { value: typeof red }) =>
        useFillPicker({ value, onValueChange: (f) => (emitted = f) }),
      { initialProps: { value: red } },
    );
    expect(result.current.fill).toEqual(red);
    // setFill on a controlled hook must not mutate displayed state...
    act(() => result.current.setFill(blue));
    expect(emitted).toEqual(blue);
    expect(result.current.fill).toEqual(red);
    // ...until the parent passes the new value back down.
    rerender({ value: blue });
    expect(result.current.fill).toEqual(blue);
  });
});

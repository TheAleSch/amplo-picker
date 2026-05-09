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

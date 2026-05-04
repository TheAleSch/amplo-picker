import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColorPicker } from "./use-color-picker";

describe("useColorPicker", () => {
  it("initializes from defaultValue string", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "#ff0000" }));
    expect(result.current.color.l).toBeGreaterThan(0.5);
    expect(result.current.color.alpha).toBe(1);
    expect(result.current.formatted).toMatch(/^#ff0000/i);
  });

  it("falls back to opaque black when no defaultValue", () => {
    const { result } = renderHook(() => useColorPicker({}));
    expect(result.current.color.l).toBeLessThan(0.1);
  });

  it("setColor accepts string and updates state", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "#000" }));
    act(() => {
      result.current.setColor("oklch(0.7 0.15 30)");
    });
    expect(result.current.color.l).toBeCloseTo(0.7, 2);
    expect(result.current.color.h).toBeCloseTo(30, 1);
  });

  it("setComponent clamps to valid ranges", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "oklch(0.5 0.1 100)" }));
    act(() => result.current.setComponent("l", 2));
    expect(result.current.color.l).toBe(1);
    act(() => result.current.setComponent("l", -1));
    expect(result.current.color.l).toBe(0);
    act(() => result.current.setComponent("alpha", 1.5));
    expect(result.current.color.alpha).toBe(1);
    act(() => result.current.setComponent("h", 720));
    expect(result.current.color.h).toBe(0); // wraps modulo 360
  });

  it("adjustComponent applies delta with wrap for hue", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "oklch(0.5 0.1 350)" }));
    act(() => result.current.adjustComponent("h", 20));
    expect(result.current.color.h).toBeCloseTo(10, 1);
  });

  it("setFromString returns false for garbage and preserves state", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "#ff0000" }));
    const before = result.current.color.l;
    let ok = true;
    act(() => {
      ok = result.current.setFromString("not a color");
    });
    expect(ok).toBe(false);
    expect(result.current.color.l).toBe(before);
  });

  it("format change updates `formatted` output without changing canonical color", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "#ff0000", defaultFormat: "hex" }));
    const lBefore = result.current.color.l;
    act(() => result.current.setFormat("oklch"));
    expect(result.current.color.l).toBeCloseTo(lBefore, 6);
    expect(result.current.formatted).toMatch(/^oklch\(/);
  });

  it("computes gamut info for OOG OKLCH input", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "oklch(0.7 0.4 30)" })
    );
    expect(result.current.gamut.inSrgb).toBe(false);
  });

  it("computes WCAG contrast against backgroundColor", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "#fff", backgroundColor: "#000" })
    );
    expect(result.current.contrast.wcag).toBeCloseTo(21, 0);
    expect(result.current.contrast.wcagLevel.aaaNormal).toBe(true);
  });

  it("controlled mode: value prop overrides internal state", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useColorPicker({ value }),
      { initialProps: { value: "#000" } }
    );
    expect(result.current.color.l).toBeLessThan(0.1);
    rerender({ value: "#fff" });
    expect(result.current.color.l).toBeCloseTo(1, 1);
  });
});

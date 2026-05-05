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

  it("exposes formatStrings record with all formats", () => {
    const { result } = renderHook(() => useColorPicker({ defaultValue: "oklch(0.7 0.18 30)" }));
    const fs = result.current.formatStrings;
    expect(Object.keys(fs).sort()).toEqual(
      ["hex", "hsb", "hsl", "oklab", "oklch", "p3", "rgb"].sort(),
    );
    expect(fs.oklch).toMatch(/^oklch\(/);
    expect(fs.hex).toMatch(/^#/);
  });

  it("onValueChange receives canonical color, active formatted, and full formats record", () => {
    let captured: { color: any; formatted: string; formats: Record<string, string> } | null = null;
    const { result } = renderHook(() =>
      useColorPicker({
        defaultValue: "#000",
        defaultFormat: "hex",
        onValueChange: (color, formatted, formats) => {
          captured = { color, formatted, formats };
        },
      }),
    );
    act(() => result.current.setColor("oklch(0.7 0.15 30)"));
    expect(captured).not.toBeNull();
    expect(captured!.color.h).toBeCloseTo(30, 1);
    expect(captured!.formatted).toMatch(/^#/); // active = hex
    expect(captured!.formats.oklch).toMatch(/^oklch\(/);
    expect(captured!.formats.hex).toMatch(/^#/);
  });

  it("preserves hue across achromatic round-trips in controlled mode (chroma → 0)", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useColorPicker({ value }),
      { initialProps: { value: "oklch(0.7 0.18 240)" } },
    );
    expect(result.current.color.h).toBeCloseTo(240, 1);
    // Round-trip through a gray hex: would normally collapse hue to 0.
    rerender({ value: "#808080" });
    expect(result.current.color.h).toBeCloseTo(240, 1);
  });

  it("preserves hue when controlled value goes to pure black or white", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useColorPicker({ value }),
      { initialProps: { value: "oklch(0.6 0.2 120)" } },
    );
    expect(result.current.color.h).toBeCloseTo(120, 1);
    rerender({ value: "#000000" });
    expect(result.current.color.h).toBeCloseTo(120, 1);
    rerender({ value: "#ffffff" });
    expect(result.current.color.h).toBeCloseTo(120, 1);
  });

  it("object-controlled mode: setColor with achromatic OklchColor preserves the hue caller passes", () => {
    let captured: any = null;
    const { result, rerender } = renderHook(
      ({ value }: { value: any }) =>
        useColorPicker({ value, onValueChange: (c) => (captured = c) }),
      { initialProps: { value: { l: 0.7, c: 0.18, h: 240, alpha: 1 } } },
    );
    // Simulate the area-drag pattern: spread color, change l/c only.
    act(() => {
      result.current.setColor({ ...result.current.color, c: 0.001, l: 0.5 });
    });
    expect(captured.h).toBeCloseTo(240, 1); // hue from spread, untouched
    rerender({ value: captured });
    expect(result.current.color.h).toBeCloseTo(240, 1);
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

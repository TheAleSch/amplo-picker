import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColorPicker } from "./use-color-picker";
import type { OklchColor } from "../lib/types";

describe("useColorPicker", () => {
  it("initializes from defaultValue string", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "#ff0000", defaultFormat: "hex" }),
    );
    expect(result.current.color.l).toBeGreaterThan(0.5);
    expect(result.current.color.alpha).toBe(1);
    expect(result.current.formatted).toMatch(/^#FF0000/i);
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

  it("uncontrolled: setFromString to gray keeps last chromatic hue", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "oklch(0.7 0.18 240)" }),
    );
    act(() => {
      result.current.setFromString("#808080");
    });
    // Re-saturating from the parsed gray must stay in the blue family, not
    // snap to red — the parse defaulted h to 0.
    act(() => {
      result.current.setComponent("c", 0.15);
    });
    expect(result.current.color.h).toBeCloseTo(240, 1);
  });

  it("uncontrolled: string setColor to gray keeps last chromatic hue", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "oklch(0.7 0.18 240)" }),
    );
    act(() => {
      result.current.setColor("#808080");
    });
    expect(result.current.color.h).toBeCloseTo(240, 1);
  });

  it("string-controlled: authored OKLCH hue on an achromatic color wins over the remembered hue", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useColorPicker({ value }),
      { initialProps: { value: "oklch(0.7 0.18 240)" } },
    );
    // OKLCH can encode hue at zero chroma — the string authored 90, so the
    // hue substitution must not overwrite it with the prior 240.
    rerender({ value: "oklch(0.5 0 90)" });
    expect(result.current.color.h).toBeCloseTo(90, 1);
    // Same for black with an authored hue.
    rerender({ value: "oklch(0 0 180)" });
    expect(result.current.color.h).toBeCloseTo(180, 1);
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

describe("setFormat gamut clamp (2026-07-12 audit T-2)", () => {
  it("clamps out-of-gamut state into the new format's gamut, pinning hue", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "oklch(0.7 0.4 30)", defaultFormat: "oklch" }),
    );
    expect(result.current.gamut.inSrgb).toBe(false);
    const hueBefore = result.current.color.h;
    act(() => result.current.setFormat("hex"));
    expect(result.current.gamut.inSrgb).toBe(true);
    // Chroma is the only lossy axis: hue must survive the clamp exactly.
    expect(result.current.color.h).toBeCloseTo(hueBefore, 6);
    expect(result.current.color.c).toBeLessThan(0.4);
  });

  it("does not touch state when already inside the new gamut", () => {
    const { result } = renderHook(() =>
      useColorPicker({ defaultValue: "#336699", defaultFormat: "hex" }),
    );
    const before = result.current.color;
    act(() => result.current.setFormat("rgb"));
    expect(result.current.color).toEqual(before);
  });
});

// T-2/T-3 (2026-07-25 adversarial review): the `isControlledStringInput` gate
// on hue substitution was only ever tested from the string-controlled side,
// and the HUE_EPS achromatic threshold was never probed at its boundary.
// Dropping the gate — which would silently revert explicit hue writes on
// achromatic colors — kept the whole suite green.
describe("hue substitution is gated to string-controlled input", () => {
  it("honours an explicit hue write on an uncontrolled achromatic color", () => {
    const { result } = renderHook(() =>
      // Exactly achromatic: c === 0, so isAchromatic() is true and the
      // remembered hue would win if the gate were dropped.
      useColorPicker({ defaultValue: { l: 0.5, c: 0, h: 0, alpha: 1 } }),
    );
    act(() => result.current.setComponent("h", 200));
    expect(result.current.color.h).toBe(200);
  });

  it("honours an explicit hue write on uncontrolled black and white", () => {
    for (const l of [0, 1]) {
      const { result } = renderHook(() =>
        useColorPicker({ defaultValue: { l, c: 0, h: 0, alpha: 1 } }),
      );
      act(() => result.current.setComponent("h", 137));
      expect(result.current.color.h).toBe(137);
    }
  });

  it("honours an explicit hue write on an object-controlled achromatic color", () => {
    let current = { l: 0.5, c: 0, h: 0, alpha: 1 };
    const { result, rerender } = renderHook(() =>
      useColorPicker({
        value: current,
        onValueChange: (c) => {
          current = c;
        },
      }),
    );
    act(() => result.current.setComponent("h", 200));
    rerender();
    expect(result.current.color.h).toBe(200);
  });

  it("still restores the remembered hue for a string-controlled achromatic value", () => {
    // The behavior the gate exists to protect — kept green alongside the
    // cases above so a fix to one can't silently undo the other.
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useColorPicker({ value }),
      { initialProps: { value: "oklch(0.6 0.2 275)" } },
    );
    expect(result.current.color.h).toBeCloseTo(275, 0);
    rerender({ value: "#000" });
    expect(result.current.color.h).toBeCloseTo(275, 0);
  });
});

describe("achromatic threshold (HUE_EPS) boundary", () => {
  // HUE_EPS is 1e-4 with inclusive comparisons (`<=` / `>=`). It is observable
  // through whether `lastGoodHueRef` updates: an achromatic color must NOT
  // overwrite the remembered hue. So drive an intermediate color that sits
  // exactly at the threshold, then land on a hue-less string (hex gray) and
  // read back which hue was restored.
  const REMEMBERED = 275;
  const INTERMEDIATE_HUE = 10;

  const hueAfterPassingThrough = (intermediate: OklchColor) => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | OklchColor }) => useColorPicker({ value }),
      {
        initialProps: {
          value: { l: 0.6, c: 0.2, h: REMEMBERED, alpha: 1 } as
            | string
            | OklchColor,
        },
      },
    );
    rerender({ value: intermediate });
    // Hex gray parses with no hue, so the substitution path runs and reveals
    // whichever hue the ref is currently holding.
    rerender({ value: "#808080" });
    return result.current.color.h;
  };

  it("treats chroma exactly at the epsilon as achromatic", () => {
    expect(
      hueAfterPassingThrough({
        l: 0.5,
        c: 1e-4,
        h: INTERMEDIATE_HUE,
        alpha: 1,
      }),
    ).toBeCloseTo(REMEMBERED, 0);
  });

  it("treats lightness at either epsilon edge as achromatic", () => {
    expect(
      hueAfterPassingThrough({ l: 1e-4, c: 0.2, h: INTERMEDIATE_HUE, alpha: 1 }),
    ).toBeCloseTo(REMEMBERED, 0);
    expect(
      hueAfterPassingThrough({
        l: 1 - 1e-4,
        c: 0.2,
        h: INTERMEDIATE_HUE,
        alpha: 1,
      }),
    ).toBeCloseTo(REMEMBERED, 0);
  });

  it("treats chroma above the epsilon as chromatic, updating the remembered hue", () => {
    expect(
      hueAfterPassingThrough({
        l: 0.5,
        c: 0.01,
        h: INTERMEDIATE_HUE,
        alpha: 1,
      }),
    ).toBeCloseTo(INTERMEDIATE_HUE, 0);
  });
});

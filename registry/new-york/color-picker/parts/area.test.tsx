import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Area } from "./area";
import { useColorPickerContext } from "../context";

// A-1 (2026-07-12 audit): role="application" has no implicit value semantics,
// so keyboard adjustments were silent to screen readers. The area must expose
// a polite live region that re-announces the value text after a change.
describe("Area screen-reader announcements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the new value in a polite live region after a keyboard move", () => {
    vi.useFakeTimers();
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Area />
      </Root>,
    );
    const area = screen.getByRole("application");
    const live = area.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();

    act(() => {
      area.focus();
      fireEvent.keyDown(area, { key: "ArrowUp" });
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(live!.textContent).toMatch(/Lightness \d+ percent/);
  });
});

// T-1 (2026-07-25 adversarial review): CLAUDE.md marks the hue re-pin after
// toGamut as "never drop this", but nothing exercised it through <Area>.
// lib/color.test.ts documents the drift and the re-pin strategy by
// reimplementing it inline against raw toGamut — it never touches this file.
//
// Note on what is and isn't reachable here: with a bounded gamut, `sampleAt`
// warps X to `findMaxChroma`, so every sample is in-gamut by construction and
// toGamut is a near-identity (measured chroma delta ~1e-15). The one thing it
// *does* change is the hue representation at the seam — it can hand back 360
// where the user picked 0. The re-pin is what keeps that from leaking into
// state, and that is what the first test below pins.
describe("Area hue pinning after gamut clamp", () => {
  function ColorProbe({ onColor }: { onColor: (h: number) => void }) {
    const { color } = useColorPickerContext();
    onColor(color.h);
    return null;
  }

  const renderProbed = (defaultValue: string) => {
    const hues: number[] = [];
    render(
      // defaultFormat="hex" makes the Area's default gamut sRGB, so every
      // pick runs through toGamut.
      <Root defaultValue={defaultValue} defaultFormat="hex">
        <Area />
        <ColorProbe onColor={(h) => hues.push(h)} />
      </Root>,
    );
    return { area: screen.getByRole("application"), hues };
  };

  it("keeps hue 0 as 0 instead of letting toGamut hand back 360", () => {
    // At l≈0.07 / h=0, toGamut returns the seam as 360. Without the re-pin
    // that representation flip lands in state: same color, but every hue
    // readout and slider position jumps to the opposite end.
    const { area, hues } = renderProbed("oklch(0.07 0.027 0)");
    act(() => {
      area.focus();
      fireEvent.keyDown(area, { key: "End" }); // chroma to the gamut surface
    });
    expect(hues.at(-1)).toBe(0);
    for (const h of hues) expect(h).toBeLessThan(180);
  });

  it("holds hue fixed across a long lightness-only keyboard drag", () => {
    const { area, hues } = renderProbed("oklch(0.65 0.4 30)");
    act(() => {
      area.focus();
      fireEvent.keyDown(area, { key: "End" });
    });
    const hueAtBoundary = hues.at(-1)!;
    act(() => {
      for (let i = 0; i < 20; i++) {
        fireEvent.keyDown(area, { key: "ArrowDown" });
        fireEvent.keyDown(area, { key: "ArrowUp" });
      }
    });
    // The user-visible property: lightness keys must never walk the hue.
    expect(hues.at(-1)!).toBeCloseTo(hueAtBoundary, 6);
  });
});

import { describe, expect, it } from "vitest";

import { colorChannels, setColorChannel, setHueFromSlider } from "./channels";
import { findMaxChroma, gamutFromFormat, hslHue, parseColor } from "./color";
import type { OklchColor } from "./types";

const wide: OklchColor = { l: 0.7, c: 0.55, h: 30, alpha: 1 };

describe("setColorChannel — oklch chroma is unbounded above", () => {
  it("preserves chroma edits beyond 0.5 (no display-gamut clamp at edit time)", () => {
    const next = setColorChannel(wide, "oklch", "c", 0.555);
    expect(next.c).toBeCloseTo(0.555, 6);
  });

  it("still floors chroma at 0", () => {
    const next = setColorChannel(wide, "oklch", "c", -0.1);
    expect(next.c).toBe(0);
  });

  it("leaves lightness and hue untouched when editing chroma", () => {
    const next = setColorChannel(wide, "oklch", "c", 1.2);
    expect(next.l).toBe(wide.l);
    expect(next.h).toBe(wide.h);
    expect(next.c).toBeCloseTo(1.2, 6);
  });
});

describe("colorChannels — descriptor bounds never clamp legal edits", () => {
  // The Base UI NumberField enforces descriptor min/max on step/scrub, so a
  // descriptor max below a legal value silently destroys wide-gamut edits.
  it("OKLCH C descriptor does not bound wide-gamut chroma below its value", () => {
    const c = colorChannels(wide, "oklch").find((ch) => ch.key === "c")!;
    expect(c.value).toBeCloseTo(0.55, 6);
    expect(c.max).toBeGreaterThan(c.value);
    // setColorChannel accepts any chroma ≥ 0 — the descriptor must too.
    expect(c.max).toBe(Infinity);
  });

  it("OKLab a/b descriptors match the engine clamp of ±0.5", () => {
    const chs = colorChannels(wide, "oklab");
    for (const key of ["a", "b"]) {
      const ch = chs.find((d) => d.key === key)!;
      expect(ch.min).toBe(-0.5);
      expect(ch.max).toBe(0.5);
    }
  });
});

describe("setColorChannel — hue survives achromatic intermediates", () => {
  // hsl(240 50% 50%) — a saturated blue with a well-defined hue.
  const blue = parseColor("hsl(240 50% 50%)")!;

  it("keeps the stored hue when an edit lands on gray", () => {
    const gray = setColorChannel(blue, "hsl", "s", 0);
    expect(gray.c).toBeCloseTo(0, 3);
    expect(gray.h).toBeCloseTo(blue.h, 1);
  });

  it("round-trips hue through s → 0 → 50 instead of snapping to red", () => {
    const gray = setColorChannel(blue, "hsl", "s", 0);
    const back = setColorChannel(gray, "hsl", "s", 50);
    // Hue must come back near the original blue (small probe error is fine),
    // not the arbitrary hue the unstable near-zero-chroma decompose yields.
    expect(Math.abs(back.h - blue.h)).toBeLessThan(5);
  });

  it("preserves hue when RGB edits produce an achromatic color", () => {
    // Drive the blue to gray by equalizing channels one at a time. The
    // intermediate edits are real color changes, so hue legitimately drifts
    // with them — the invariant is that the final edit onto gray keeps the
    // hue of the last chromatic color instead of destroying it.
    let c = setColorChannel(blue, "rgb", "r", 128);
    c = setColorChannel(c, "rgb", "g", 128);
    const lastChromaticHue = c.h;
    c = setColorChannel(c, "rgb", "b", 128);
    expect(c.c).toBeCloseTo(0, 3);
    expect(c.h).toBeCloseTo(lastChromaticHue, 1);
  });

  it("shows the fallback hue (not 0) in the H channel field for gray", () => {
    // Compare in HSL's own hue scale: the field showed ~240 for the blue and
    // should keep showing ~240 for the gray, not snap to 0 or a garbage hue.
    const blueH = colorChannels(blue, "hsl").find((ch) => ch.key === "h")!;
    const gray = setColorChannel(blue, "hsl", "s", 0);
    const grayH = colorChannels(gray, "hsl").find((ch) => ch.key === "h")!;
    // The OKLCH hue line curves ~11° in HSL space between s=50 and the
    // achromatic limit, so allow that curvature — what matters is that the
    // field stays in the blue family instead of snapping to 0 or garbage.
    expect(Math.abs(grayH.value - blueH.value)).toBeLessThan(15);
  });
});

describe("setColorChannel writers (2026-07-12 audit T-8)", () => {
  const base = parseColor("oklch(0.6 0.15 200)")!;

  it("alpha writes are display-percent (0–100) mapped to 0–1 and clamped", () => {
    expect(setColorChannel(base, "rgb", "alpha", 50).alpha).toBeCloseTo(0.5, 6);
    expect(setColorChannel(base, "oklch", "alpha", 150).alpha).toBe(1);
    expect(setColorChannel(base, "hsl", "alpha", -10).alpha).toBe(0);
  });

  it("rgb writer maps 0–255 display units", () => {
    const next = setColorChannel(base, "rgb", "r", 255);
    const rgb = colorChannels(next, "rgb").find((c) => c.key === "r")!;
    expect(rgb.value).toBe(255);
  });

  it("hsl saturation write round-trips through the display scale", () => {
    const next = setColorChannel(base, "hsl", "s", 80);
    const s = colorChannels(next, "hsl").find((c) => c.key === "s")!;
    expect(Math.abs(s.value - 80)).toBeLessThanOrEqual(1);
  });

  it("hsb brightness write round-trips through the display scale", () => {
    const next = setColorChannel(base, "hsb", "b", 90);
    const b = colorChannels(next, "hsb").find((c) => c.key === "b")!;
    expect(Math.abs(b.value - 90)).toBeLessThanOrEqual(1);
  });

  it("p3 channel write clamps to 0–1 and round-trips", () => {
    const next = setColorChannel(base, "p3", "g", 0.75);
    const g = colorChannels(next, "p3").find((c) => c.key === "g")!;
    expect(g.value).toBeCloseTo(0.75, 2);
    expect(setColorChannel(base, "p3", "g", 1.5)).toEqual(
      setColorChannel(base, "p3", "g", 1),
    );
  });

  it("oklab a/b writes clamp to the engine bound of ±0.5", () => {
    const next = setColorChannel(base, "oklab", "a", 0.9);
    const a = colorChannels(next, "oklab").find((c) => c.key === "a")!;
    expect(a.value).toBeLessThanOrEqual(0.5);
  });
});

// T-6 (2026-07-25 adversarial review): no test ever wrote a direct "h"
// channel for any format, so the wrap(value, 360) on hue edits — and the
// per-format clamps on over-range values — were entirely unverified.
describe("setColorChannel — direct hue writes wrap into [0, 360)", () => {
  const base: OklchColor = { l: 0.6, c: 0.15, h: 120, alpha: 1 };

  it("wraps an over-360 oklch hue", () => {
    expect(setColorChannel(base, "oklch", "h", 400).h).toBeCloseTo(40, 6);
  });

  it("wraps a negative oklch hue", () => {
    expect(setColorChannel(base, "oklch", "h", -30).h).toBeCloseTo(330, 6);
  });

  it("maps 360 to 0 rather than leaving it at the exclusive bound", () => {
    expect(setColorChannel(base, "oklch", "h", 360).h).toBeCloseTo(0, 6);
  });

  // Honest scope note: this asserts the *observable* contract for hsl/hsb —
  // an out-of-range hue lands on the equivalent in-range angle. It does NOT
  // discriminate the wrap(value, 360) call on those two branches: culori's
  // HSL/HSV→OKLCH conversion is trig-based and already periodic, so removing
  // the wrap there leaves this green (verified by mutation). The wrap is
  // defensive on the hsl/hsb paths; it is load-bearing on the oklch path,
  // which the cases above do discriminate.
  it("normalizes out-of-range hue on the hsl and hsb scales", () => {
    for (const format of ["hsl", "hsb"] as const) {
      const readBackHue = (color: OklchColor) =>
        colorChannels(color, format).find((c) => c.key === "h")!.value;

      expect(readBackHue(setColorChannel(base, format, "h", 400))).toBeCloseTo(
        40,
        1,
      );
      expect(readBackHue(setColorChannel(base, format, "h", -30))).toBeCloseTo(
        330,
        1,
      );
      // 360 must land on 0, not sit on the exclusive upper bound.
      expect(readBackHue(setColorChannel(base, format, "h", 360))).toBeCloseTo(
        0,
        1,
      );
    }
  });
});

describe("setColorChannel — over-range values are clamped, not stored raw", () => {
  const base: OklchColor = { l: 0.6, c: 0.15, h: 120, alpha: 1 };

  it("clamps an rgb channel above 255", () => {
    const next = setColorChannel(base, "rgb", "r", 400);
    const back = colorChannels(next, "rgb").find((c) => c.key === "r")!;
    expect(back.value).toBeLessThanOrEqual(255);
    expect(back.value).toBeCloseTo(255, 0);
  });

  it("clamps an hsl saturation above 100", () => {
    const next = setColorChannel(base, "hsl", "s", 150);
    const back = colorChannels(next, "hsl").find((c) => c.key === "s")!;
    expect(back.value).toBeLessThanOrEqual(100);
  });

  it("clamps a negative rgb channel to 0", () => {
    const next = setColorChannel(base, "rgb", "g", -50);
    const back = colorChannels(next, "rgb").find((c) => c.key === "g")!;
    expect(back.value).toBeGreaterThanOrEqual(0);
    expect(back.value).toBeCloseTo(0, 0);
  });
});

// M-4 (2026-07-25 adversarial review): the chroma-preserving hue math was
// copy-pasted into both <ColorPicker.Hue> variants. It now lives here, so it
// gets tested once, directly.
describe("setHueFromSlider", () => {
  const base: OklchColor = { l: 0.6, c: 0.12, h: 30, alpha: 0.5 };

  it("wraps out-of-range hues", () => {
    expect(setHueFromSlider(base, 400, "oklch").h).toBeCloseTo(40, 6);
    expect(setHueFromSlider(base, -30, "oklch").h).toBeCloseTo(330, 6);
    expect(setHueFromSlider(base, 360, "oklch").h).toBeCloseTo(0, 6);
  });

  it("preserves saturation (chroma as a fraction of max) rather than absolute chroma", () => {
    const gamut = gamutFromFormat("oklch");
    const beforeRatio = base.c / findMaxChroma(base.l, base.h, gamut);
    const next = setHueFromSlider(base, 140, "oklch");
    const afterRatio = next.c / findMaxChroma(next.l, next.h, gamut);
    expect(afterRatio).toBeCloseTo(beforeRatio, 3);
    // Green has materially less max chroma than orange, so preserving the
    // ratio must have *changed* the absolute chroma — otherwise this test
    // would pass against a plain `{...color, h}` implementation.
    expect(next.c).not.toBeCloseTo(base.c, 3);
  });

  it("leaves lightness and alpha untouched", () => {
    const next = setHueFromSlider(base, 200, "oklch");
    expect(next.l).toBeCloseTo(base.l, 6);
    expect(next.alpha).toBeCloseTo(base.alpha, 6);
  });

  it("writes through the format's own hue scale for hsl and hsb", () => {
    // The distinguishing property: on HSL the requested slider value must
    // land as the HSL hue, which is *not* the OKLCH hue for the same color.
    const next = setHueFromSlider(base, 240, "hsl");
    expect(hslHue(next)).toBeCloseTo(240, 1);
    expect(next.h).not.toBeCloseTo(240, 1);
  });

  it("does not divide by zero for an achromatic color", () => {
    const gray: OklchColor = { l: 0.5, c: 0, h: 0, alpha: 1 };
    const next = setHueFromSlider(gray, 120, "oklch");
    expect(Number.isFinite(next.c)).toBe(true);
    expect(next.c).toBe(0);
    expect(next.h).toBeCloseTo(120, 6);
  });
});

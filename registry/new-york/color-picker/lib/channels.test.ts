import { describe, expect, it } from "vitest";

import { colorChannels, setColorChannel } from "./channels";
import { parseColor } from "./color";
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

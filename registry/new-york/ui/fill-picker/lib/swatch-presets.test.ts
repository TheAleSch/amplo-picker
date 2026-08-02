import { describe, expect, it } from "vitest";

import { DEFAULT_SWATCH_PRESETS, isSameSwatchColor } from "./swatch-presets";
import { parseColor } from "./color";
import type { OklchColor } from "./types";

// T-10 (2026-07-25 adversarial review): isSameSwatchColor carries real
// branching — per-channel epsilons, an achromatic bypass, and hue-wrap
// distance — and had zero test references anywhere in the repo. Inverting the
// hue threshold or dropping the achromatic bypass stayed green.
describe("isSameSwatchColor", () => {
  const base: OklchColor = { l: 0.7, c: 0.18, h: 30, alpha: 1 };

  it("matches an identical color", () => {
    expect(isSameSwatchColor(base, { ...base })).toBe(true);
  });

  it("rejects a different hue at the same lightness and chroma", () => {
    expect(isSameSwatchColor(base, { ...base, h: 90 })).toBe(false);
  });

  it("rejects differences in lightness, chroma, or alpha", () => {
    expect(isSameSwatchColor(base, { ...base, l: 0.75 })).toBe(false);
    expect(isSameSwatchColor(base, { ...base, c: 0.25 })).toBe(false);
    expect(isSameSwatchColor(base, { ...base, alpha: 0.5 })).toBe(false);
  });

  it("ignores hue entirely when either side is achromatic", () => {
    // The whole point of the bypass: a gray swatch must light up against the
    // current gray whatever hue that gray happens to have drifted to.
    const swatch: OklchColor = { l: 0.5, c: 0, h: 0, alpha: 1 };
    const driftedGray: OklchColor = { l: 0.5, c: 0, h: 274.3, alpha: 1 };
    expect(isSameSwatchColor(swatch, driftedGray)).toBe(true);
  });

  it("treats hue as circular across the 0/360 seam", () => {
    // 359.95 and 0.02 are 0.07 apart the short way — inside the 0.1
    // threshold. A non-wrapping `Math.abs(a - b)` would read them as ~360
    // apart and report no match.
    const near360: OklchColor = { ...base, h: 359.95 };
    const near0: OklchColor = { ...base, h: 0.02 };
    expect(isSameSwatchColor(near360, near0)).toBe(true);

    // …but a genuinely distant pair straddling the seam must still fail.
    expect(isSameSwatchColor({ ...base, h: 350 }, { ...base, h: 10 })).toBe(
      false,
    );
  });

  it("matches every shipped preset against its own parsed color", () => {
    for (const css of DEFAULT_SWATCH_PRESETS) {
      const parsed = parseColor(css);
      expect(parsed, `${css} should parse`).not.toBeNull();
      expect(isSameSwatchColor(parsed!, parsed!), css).toBe(true);
    }
  });
});

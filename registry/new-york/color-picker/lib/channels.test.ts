import { describe, expect, it } from "vitest";

import { setColorChannel } from "./channels";
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

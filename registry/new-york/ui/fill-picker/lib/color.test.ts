import { describe, expect, it } from "vitest";
import { converter } from "culori";
import type { OklchColor } from "./types";
import {
  parseColor,
  formatColor,
  formatAll,
  gamutInfo,
  gamutSignedDistance,
  toGamut,
  contrast,
  apcaContrast,
  isValidColor,
  findMaxChroma,
  findCusp,
  gamutFromFormat,
  hslHue,
  hsbHue,
  parseColorDetailed,
} from "./color";

const toOklch = converter("oklch");

describe("parseColor", () => {
  it("parses #fff to white in OKLCH", () => {
    const c = parseColor("#fff");
    expect(c).not.toBeNull();
    expect(c!.l).toBeCloseTo(1, 2);
    expect(c!.c).toBeCloseTo(0, 2);
    expect(c!.alpha).toBe(1);
  });

  it("parses rgb() with alpha", () => {
    const c = parseColor("rgb(255 0 0 / 0.5)");
    expect(c!.alpha).toBeCloseTo(0.5, 2);
    expect(c!.l).toBeGreaterThan(0.5);
    expect(c!.c).toBeGreaterThan(0.1);
  });

  it("parses oklch()", () => {
    const c = parseColor("oklch(0.7 0.15 30)");
    expect(c!.l).toBeCloseTo(0.7, 2);
    expect(c!.c).toBeCloseTo(0.15, 2);
    expect(c!.h).toBeCloseTo(30, 1);
  });

  it("parses display-p3", () => {
    const c = parseColor("color(display-p3 1 0 0)");
    expect(c).not.toBeNull();
    // Pure P3 red is outside sRGB; must lie outside sRGB gamut
    expect(gamutInfo(c!).inSrgb).toBe(false);
    expect(gamutInfo(c!).inP3).toBe(true);
  });

  it("returns null for garbage", () => {
    expect(parseColor("not a color")).toBeNull();
    expect(parseColor("")).toBeNull();
  });

  it("handles achromatic hue as 0 not NaN", () => {
    const c = parseColor("#808080");
    expect(Number.isNaN(c!.h)).toBe(false);
  });
});

describe("formatColor round-trip", () => {
  const cases: Array<[string, string]> = [
    ["hex", "#ff0000"],
    ["rgb", "rgb(255 0 0)"],
    ["oklch", "oklch(0.7 0.15 30)"],
  ];

  for (const [format, input] of cases) {
    it(`${format}: parse + format produces parseable output`, () => {
      const parsed = parseColor(input);
      const out = formatColor(parsed!, format as never);
      const reparsed = parseColor(out);
      expect(reparsed).not.toBeNull();
      expect(reparsed!.l).toBeCloseTo(parsed!.l, 2);
    });
  }

  it("hex omits alpha when alpha=1, includes when <1", () => {
    const opaque = formatColor({ l: 1, c: 0, h: 0, alpha: 1 }, "hex");
    expect(opaque).not.toMatch(/^#[0-9a-f]{8}$/i);
    const alpha = formatColor({ l: 1, c: 0, h: 0, alpha: 0.5 }, "hex");
    expect(alpha).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it("p3 output uses color(display-p3 ...) syntax", () => {
    const out = formatColor({ l: 0.7, c: 0.2, h: 30, alpha: 1 }, "p3");
    expect(out).toMatch(/^color\(display-p3 /);
  });

  it("oklch preserves hue for chromatic colors", () => {
    const c = parseColor("oklch(0.7 0.15 200)")!;
    const out = formatColor(c, "oklch");
    const back = parseColor(out)!;
    expect(back.h).toBeCloseTo(200, 1);
  });
});

describe("gamutInfo", () => {
  it("flags pure sRGB red as in all gamuts", () => {
    const c = parseColor("#ff0000")!;
    const g = gamutInfo(c);
    expect(g.inSrgb).toBe(true);
    expect(g.inP3).toBe(true);
    expect(g.inRec2020).toBe(true);
  });

  it("flags pure P3 red as outside sRGB but inside P3", () => {
    const c = parseColor("color(display-p3 1 0 0)")!;
    const g = gamutInfo(c);
    expect(g.inSrgb).toBe(false);
    expect(g.inP3).toBe(true);
  });
});

describe("toGamut", () => {
  it("returns same color when already in gamut", () => {
    const c = parseColor("#808080")!;
    const mapped = toGamut(c, "srgb");
    expect(mapped.l).toBeCloseTo(c.l, 3);
    expect(mapped.c).toBeCloseTo(c.c, 3);
  });

  it("reduces chroma for OOG colors, preserving hue + lightness", () => {
    const oog = parseColor("oklch(0.7 0.4 30)")!;
    const mapped = toGamut(oog, "srgb");
    expect(mapped.c).toBeLessThan(oog.c);
    expect(mapped.l).toBeCloseTo(oog.l, 1);
    // Hue may shift slightly per CSS Color 4 algo but should be close
    expect(Math.abs(mapped.h - oog.h)).toBeLessThan(5);
    expect(gamutInfo(mapped).inSrgb).toBe(true);
  });
});

describe("contrast (WCAG 2.1)", () => {
  it("white on black = 21:1", () => {
    const fg = parseColor("#fff")!;
    const bg = parseColor("#000")!;
    expect(contrast(fg, bg).wcag).toBeCloseTo(21, 0);
  });

  it("identical colors = 1:1", () => {
    const c = parseColor("#888")!;
    expect(contrast(c, c).wcag).toBeCloseTo(1, 1);
  });

  it("AA normal text passes at 4.5:1", () => {
    const fg = parseColor("#595959")!;
    const bg = parseColor("#fff")!;
    const r = contrast(fg, bg);
    expect(r.wcagLevel.aaNormal).toBe(true);
  });

  it("treats alpha by compositing fg over bg", () => {
    const transparentBlack = { l: 0, c: 0, h: 0, alpha: 0 };
    const white = parseColor("#fff")!;
    // fully transparent fg vs white bg should yield ~1:1 (visually identical)
    expect(contrast(transparentBlack, white).wcag).toBeCloseTo(1, 0);
  });
});

describe("apcaContrast", () => {
  it("returns negative Lc for light text on dark bg", () => {
    const fg = parseColor("#fff")!;
    const bg = parseColor("#000")!;
    const lc = apcaContrast(fg, bg);
    expect(lc).toBeLessThan(0);
    expect(Math.abs(lc)).toBeGreaterThan(100);
  });

  it("returns positive Lc for dark text on light bg", () => {
    const fg = parseColor("#000")!;
    const bg = parseColor("#fff")!;
    const lc = apcaContrast(fg, bg);
    expect(lc).toBeGreaterThan(100);
  });
});

describe("formatAll", () => {
  it("returns a string for every supported format", () => {
    const c = parseColor("oklch(0.7 0.18 30)")!;
    const out = formatAll(c);
    expect(Object.keys(out).sort()).toEqual(
      ["hex", "hsb", "hsl", "oklab", "oklch", "p3", "rgb"].sort(),
    );
    for (const v of Object.values(out)) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });

  it("oklch round-trips losslessly even when sRGB-targeted formats are gamut-clipped", () => {
    const c = parseColor("oklch(0.5 0.3 250)")!; // out of sRGB
    const out = formatAll(c);
    const back = parseColor(out.oklch)!;
    expect(back.l).toBeCloseTo(c.l, 3);
    expect(back.c).toBeCloseTo(c.c, 3);
    expect(back.h).toBeCloseTo(c.h, 1);
  });
});

describe("gamutSignedDistance", () => {
  it("is negative for clearly in-gamut colors and positive for OOG ones", () => {
    const safe = parseColor("oklch(0.7 0.05 30)")!; // muted, in sRGB
    const wild = parseColor("oklch(0.7 0.4 30)")!; // way past Rec.2020
    expect(gamutSignedDistance(safe, "srgb")).toBeLessThan(0);
    expect(gamutSignedDistance(safe, "p3")).toBeLessThan(0);
    expect(gamutSignedDistance(safe, "rec2020")).toBeLessThan(0);
    expect(gamutSignedDistance(wild, "srgb")).toBeGreaterThan(0);
    expect(gamutSignedDistance(wild, "p3")).toBeGreaterThan(0);
    expect(gamutSignedDistance(wild, "rec2020")).toBeGreaterThan(0);
  });

  it("widens monotonically across sRGB → P3 → Rec.2020", () => {
    // For any single OKLCH color, signed distance should never grow as we
    // move to a wider gamut — the color can only get more interior (or stay
    // on the boundary). Check across a sweep of chromas at red-ish hue.
    const eps = 1e-2;
    for (const c of [0.05, 0.15, 0.25, 0.35]) {
      const ok = parseColor(`oklch(0.65 ${c} 30)`)!;
      const dSrgb = gamutSignedDistance(ok, "srgb");
      const dP3 = gamutSignedDistance(ok, "p3");
      const dRec = gamutSignedDistance(ok, "rec2020");
      expect(dP3).toBeLessThanOrEqual(dSrgb + eps);
      expect(dRec).toBeLessThanOrEqual(dP3 + eps);
    }
  });
});

describe("findMaxChroma", () => {
  it("returns 0 at the lightness extremes (black and white have no chroma)", () => {
    expect(findMaxChroma(0, 30, "srgb")).toBe(0);
    expect(findMaxChroma(1, 30, "srgb")).toBe(0);
    expect(findMaxChroma(0, 30, "p3")).toBe(0);
    expect(findMaxChroma(1, 30, "rec2020")).toBe(0);
  });

  it("widens roughly monotonically across sRGB → P3 → Rec.2020", () => {
    // Strict ordering (P3 ⊂ Rec.2020 chromaticity-wise) holds in 2D, but at
    // narrow OKLCH hue slices near a primary corner the per-hue boundaries
    // can flip by ~1% due to differing primary placements in OKLab. eps is
    // sized to absorb that without losing the macro signal.
    const eps = 5e-3;
    for (const l of [0.3, 0.5, 0.7]) {
      for (const h of [0, 30, 120, 220, 320]) {
        const cSrgb = findMaxChroma(l, h, "srgb");
        const cP3 = findMaxChroma(l, h, "p3");
        const cRec = findMaxChroma(l, h, "rec2020");
        expect(cP3).toBeGreaterThanOrEqual(cSrgb - eps);
        expect(cRec).toBeGreaterThanOrEqual(cP3 - eps);
      }
    }
  });

  it("lands on the gamut boundary — signed distance ≈ 0 at the result", () => {
    for (const gamut of ["srgb", "p3", "rec2020"] as const) {
      const c = findMaxChroma(0.6, 30, gamut);
      expect(c).toBeGreaterThan(0);
      const sd = gamutSignedDistance({ l: 0.6, c, h: 30, alpha: 1 }, gamut);
      // Bisection epsilon allows a small tolerance on each side.
      expect(Math.abs(sd)).toBeLessThan(5e-3);
    }
  });

  it("matches the empirical sRGB max chroma for fully-saturated red", () => {
    // sRGB pure red is roughly oklch(0.628 0.258 29.23). Max chroma at that
    // (L, H) should be at least the value culori reports.
    const c = findMaxChroma(0.628, 29.23, "srgb");
    expect(c).toBeGreaterThan(0.24);
    expect(c).toBeLessThan(0.27);
  });

  it("returns chroma values that culori-based gamutInfo confirms are in-gamut", () => {
    // Regression: with eps=1e-4 + epsilon-overshoot, the bead landing at X=1
    // in OKLCH/Rec.2020 mode could sit ~1e-3 outside Rec.2020 by culori's
    // own check, lighting the OUT OF GAMUT badge. The marginal-chroma trim
    // keeps the result safely inside whichever gamut culori reports.
    for (const gamut of ["srgb", "p3", "rec2020"] as const) {
      for (const l of [0.15, 0.3, 0.5, 0.7, 0.85]) {
        for (const h of [0, 30, 60, 120, 180, 220, 280, 320]) {
          const c = findMaxChroma(l, h, gamut);
          if (c <= 0) continue;
          const info = gamutInfo({ l, c, h, alpha: 1 });
          if (gamut === "srgb") expect(info.inSrgb, `srgb (${l},${h})`).toBe(true);
          if (gamut === "p3") expect(info.inP3, `p3 (${l},${h})`).toBe(true);
          if (gamut === "rec2020") expect(info.inRec2020, `rec2020 (${l},${h})`).toBe(true);
        }
      }
    }
  });
});

describe("findCusp", () => {
  it("returns the L of max chroma for sRGB red near the published value", () => {
    // sRGB red's OKLCH cusp is around L ≈ 0.628, C ≈ 0.258.
    const cusp = findCusp(29.23, "srgb");
    expect(cusp.l).toBeGreaterThan(0.6);
    expect(cusp.l).toBeLessThan(0.66);
    expect(cusp.c).toBeGreaterThan(0.24);
    expect(cusp.c).toBeLessThan(0.27);
  });

  it("widens the cusp chroma as the gamut grows", () => {
    for (const h of [0, 60, 120, 220, 320]) {
      const cuspS = findCusp(h, "srgb");
      const cuspP = findCusp(h, "p3");
      const cuspR = findCusp(h, "rec2020");
      // 5e-3 absorbs the per-hue OKLab/primary mismatch noted in findMaxChroma.
      expect(cuspP.c).toBeGreaterThanOrEqual(cuspS.c - 5e-3);
      expect(cuspR.c).toBeGreaterThanOrEqual(cuspP.c - 5e-3);
    }
  });

  it("cusp lightness sits well inside (0,1) — never at the achromatic ends", () => {
    for (const h of [0, 30, 60, 120, 180, 220, 280, 320]) {
      const cusp = findCusp(h, "p3");
      expect(cusp.l).toBeGreaterThan(0.3);
      expect(cusp.l).toBeLessThan(0.95);
    }
  });
});

describe("toGamut + hue stability under drag feedback", () => {
  it("documents that toGamut alone can drift hue at the gamut boundary", () => {
    // Repeatedly take {chroma=0.4, hue=30} OOG sRGB → toGamut("srgb") →
    // feed result back as the next chromatic input. Without the area's
    // hue-pinning fix, h walks away from 30. This test pins the drift so
    // anyone changing toGamut's internals sees the consequence.
    let h = 30;
    for (let i = 0; i < 20; i++) {
      const mapped = toGamut({ l: 0.65, c: 0.4, h, alpha: 1 }, "srgb");
      h = mapped.h;
    }
    // Drift is small per step but accumulates. We just want to know it's
    // non-zero — the area picker compensates by re-pinning the user's hue.
    expect(Math.abs(h - 30)).toBeGreaterThan(0);
    // And not catastrophic.
    expect(Math.abs(h - 30)).toBeLessThan(5);
  });

  it("hue can be preserved by re-pinning after toGamut (the area's strategy)", () => {
    let next = { l: 0.65, c: 0.4, h: 30, alpha: 1 };
    for (let i = 0; i < 100; i++) {
      const targetHue = next.h;
      next = { ...toGamut(next, "srgb"), h: targetHue };
    }
    expect(next.h).toBe(30);
  });
});

describe("isValidColor", () => {
  it("accepts CSS Color 4 syntax", () => {
    expect(isValidColor("oklch(0.7 0.1 30)")).toBe(true);
    expect(isValidColor("color(display-p3 1 0 0)")).toBe(true);
    expect(isValidColor("rgb(255 0 0 / 0.5)")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidColor("not a color")).toBe(false);
    expect(isValidColor("rgb(999 999 999)")).toBe(true); // culori is permissive; clamp at format time
  });
});

// T-8/T-9/T-4 (2026-07-25 adversarial review): the APCA implementation was
// asserted only directionally (`toBeLessThan(0)`, `Math.abs > 100`), so
// scaling SAPC or inverting the near-equal-luminance branch stayed green.
// gamutFromFormat / hslHue / hsbHue and the GAMUT_EPSILON tolerance had no
// direct coverage at all.
describe("apcaContrast — reference values", () => {
  const black = parseColor("#000")!;
  const white = parseColor("#fff")!;

  it("matches the published Lc for black text on white", () => {
    // APCA reference: #000 on #fff → Lc 106.04
    expect(apcaContrast(black, white)).toBeCloseTo(106.04, 1);
  });

  it("matches the published Lc for white text on black", () => {
    // APCA reference: #fff on #000 → Lc -107.88 (polarity is signed)
    expect(apcaContrast(white, black)).toBeCloseTo(-107.88, 1);
  });

  it("returns exactly 0 when the two luminances are identical", () => {
    // Exercises the deltaYmin branch — an inverted comparison here would
    // leak a small nonzero Lc for a genuinely invisible pair.
    const gray = parseColor("#888")!;
    expect(apcaContrast(gray, gray)).toBe(0);
  });

  it("keeps light-on-dark negative and dark-on-light positive", () => {
    const lighter = parseColor("#888")!;
    const darker = parseColor("#555")!;
    expect(apcaContrast(lighter, darker)).toBeLessThan(0);
    expect(apcaContrast(darker, lighter)).toBeGreaterThan(0);
  });
});

describe("gamutFromFormat", () => {
  it("maps each format to its render gamut", () => {
    expect(gamutFromFormat("hex")).toBe("srgb");
    expect(gamutFromFormat("rgb")).toBe("srgb");
    expect(gamutFromFormat("hsl")).toBe("srgb");
    expect(gamutFromFormat("hsb")).toBe("srgb");
    expect(gamutFromFormat("p3")).toBe("p3");
    // Documented in CLAUDE.md: the unbounded formats still get a (wide)
    // bounded surface rather than "none".
    expect(gamutFromFormat("oklch")).toBe("rec2020");
    expect(gamutFromFormat("oklab")).toBe("rec2020");
  });
});

describe("hslHue / hsbHue", () => {
  it("reports the format's own hue scale, not the OKLCH hue", () => {
    const red = parseColor("#f00")!;
    // Pure red is HSL/HSB hue 0 but OKLCH hue ~29 — the sliders depend on
    // this distinction to line up with the channel inputs.
    expect(hslHue(red)).toBeCloseTo(0, 3);
    expect(hsbHue(red)).toBeCloseTo(0, 3);
    expect(red.h).toBeGreaterThan(20);

    const blue = parseColor("#00f")!;
    expect(hslHue(blue)).toBeCloseTo(240, 1);
    expect(hsbHue(blue)).toBeCloseTo(240, 1);
  });
});

describe("gamut epsilon tolerance", () => {
  // GAMUT_EPSILON (1e-4) exists so float noise at the boundary doesn't make
  // the badge flicker. Probe it directly: build colors that overshoot an sRGB
  // channel by a known amount and check which side of the tolerance they land
  // on. This pins the constant's magnitude — an epsilon of 0 fails the first
  // case, and a looser 1e-2 fails the second.
  const overshootRed = (over: number): OklchColor => {
    const o = toOklch({ mode: "rgb", r: 1 + over, g: 0.2, b: 0.2 })!;
    return { l: o.l!, c: o.c!, h: o.h ?? 0, alpha: 1 };
  };

  it("absorbs an overshoot smaller than the epsilon", () => {
    expect(gamutInfo(overshootRed(2e-5)).inSrgb).toBe(true);
    expect(gamutInfo(overshootRed(9e-5)).inSrgb).toBe(true);
  });

  it("reports an overshoot larger than the epsilon as out of gamut", () => {
    expect(gamutInfo(overshootRed(2e-4)).inSrgb).toBe(false);
    expect(gamutInfo(overshootRed(1e-3)).inSrgb).toBe(false);
  });

  it("still classifies obviously wide colors correctly", () => {
    const wayOut = parseColor("color(display-p3 0 1 0)")!;
    expect(gamutInfo(wayOut).inSrgb).toBe(false);
    expect(gamutInfo(wayOut).inP3).toBe(true);
    expect(gamutInfo(parseColor("#f00")!).inSrgb).toBe(true);
  });
});

describe("parseColorDetailed — hue is wrapped into [0, 360)", () => {
  it("wraps an over-360 authored hue", () => {
    expect(parseColorDetailed("oklch(0.5 0.1 720)")!.color.h).toBeCloseTo(0, 6);
    expect(parseColorDetailed("oklch(0.5 0.1 400)")!.color.h).toBeCloseTo(40, 6);
  });

  it("wraps a negative authored hue", () => {
    expect(parseColorDetailed("oklch(0.5 0.1 -30)")!.color.h).toBeCloseTo(330, 6);
  });
});

describe("formatColor — exact, rounded output per format", () => {
  const red = parseColor("#ff0000")!;
  const gray = parseColor("#808080")!;

  it("serializes in-gamut sRGB red exactly (no strict-gamut chroma nudge)", () => {
    // culori's own gamut test is strict, so red's OKLCH round-trip (a
    // channel at ±1e-14) used to be chroma-reduced to hsl(0.03 99.98% …).
    expect(formatColor(red, "rgb")).toBe("rgb(255, 0, 0)");
    expect(formatColor(parseColor("#008197")!, "hex")).toBe("#008197");
  });

  it("rounds hsl to 2 decimals and never emits exponent notation", () => {
    expect(formatColor(red, "hsl")).toBe("hsl(0 100% 50%)");
    expect(formatColor(gray, "hsl")).toBe("hsl(0 0% 50.2%)");
    expect(formatColor({ ...red, alpha: 0.5 }, "hsl")).toBe(
      "hsl(0 100% 50% / 0.5)",
    );
  });

  it("emits hsb as culori's color(--hsv …) with rounded channels", () => {
    expect(formatColor(red, "hsb")).toBe("color(--hsv 0 1 1)");
    expect(formatColor(gray, "hsb")).toBe("color(--hsv 0 0 0.502)");
    expect(formatColor({ ...red, alpha: 0.5 }, "hsb")).toBe(
      "color(--hsv 0 1 1 / 0.5)",
    );
  });

  it("rounds oklab to 4 decimals", () => {
    expect(formatColor(red, "oklab")).toBe("oklab(0.628 0.2249 0.1258)");
    expect(formatColor(gray, "oklab")).toBe("oklab(0.5999 0 0)");
    expect(formatColor({ ...red, alpha: 0.5 }, "oklab")).toBe(
      "oklab(0.628 0.2249 0.1258 / 0.5)",
    );
  });

  it("rounds display-p3 to 4 decimals", () => {
    expect(formatColor(red, "p3")).toBe("color(display-p3 0.9175 0.2003 0.1386)");
    expect(formatColor(gray, "p3")).toBe("color(display-p3 0.502 0.502 0.502)");
    expect(formatColor({ ...red, alpha: 0.5 }, "p3")).toBe(
      "color(display-p3 0.9175 0.2003 0.1386 / 0.5)",
    );
  });

  // A string-controlled parent echoes `formatted` straight back into
  // `value`. Rounding must be a projection: one re-parse may quantize, but
  // a second format → parse → format cycle has to be a fixed point, or the
  // echo would creep on every re-render / blur-commit.
  it("is stable under a format → parse → format echo in every format", () => {
    const samples: OklchColor[] = [
      red,
      gray,
      { l: 0.62, c: 0.11, h: 212.7, alpha: 1 },
      { l: 0.83, c: 0.04, h: 95.3, alpha: 0.42 },
      { l: 0.31, c: 0.002, h: 300, alpha: 1 },
    ];
    for (const sample of samples) {
      for (const f of ["hex", "rgb", "hsl", "hsb", "oklch", "oklab", "p3"] as const) {
        const once = formatColor(parseColor(formatColor(sample, f))!, f);
        const twice = formatColor(parseColor(once)!, f);
        expect(twice, `${f} ${JSON.stringify(sample)}`).toBe(once);
      }
    }
  });

  it("round-trips every format through parseColor", () => {
    const c: OklchColor = { l: 0.62, c: 0.11, h: 212.7, alpha: 0.5 };
    for (const f of ["hex", "rgb", "hsl", "hsb", "oklch", "oklab", "p3"] as const) {
      const back = parseColor(formatColor(c, f));
      expect(back, f).not.toBeNull();
      expect(back!.l, f).toBeCloseTo(c.l, 2);
      expect(back!.h, f).toBeCloseTo(c.h, 0);
    }
  });
});

describe("hslHue / hsbHue — achromatic colors", () => {
  // An achromatic color has no HSL/HSV hue of its own; culori returns float
  // noise (e.g. 330 for any mid-gray). The slider must instead track the
  // stored OKLCH hue, read on the format's own scale.
  it("tracks the stored OKLCH hue instead of float noise", () => {
    const at = (h: number): OklchColor => ({ l: 0.5, c: 0, h, alpha: 1 });
    expect(hslHue(at(120))).not.toBeCloseTo(hslHue(at(250)), 0);
    expect(hsbHue(at(120))).not.toBeCloseTo(hsbHue(at(250)), 0);
    // Same reading as a mildly saturated color on that OKLCH hue.
    const probe: OklchColor = { l: 0.6, c: 0.08, h: 120, alpha: 1 };
    expect(hslHue(at(120))).toBeCloseTo(hslHue(probe), 6);
    expect(hsbHue(at(120))).toBeCloseTo(hsbHue(probe), 6);
  });
});

describe("parseColorDetailed — hueMissing on wide-gamut grays", () => {
  // A neutral display-p3 color converts to OKLCH with float-noise chroma
  // (~1e-16) and a garbage finite hue (180). That hue must be reported as
  // missing, or a string-controlled p3 echo of a gray drops the remembered
  // hue and snaps the picker to 180°.
  it("flags a p3 gray's noise hue as missing", () => {
    for (const s of [
      "color(display-p3 0.4447 0.4447 0.4447)",
      "color(display-p3 0.4446959407612438 0.4446959407612437 0.44469594076124364)",
      "color(display-p3 1 1 1)",
    ]) {
      expect(parseColorDetailed(s)!.hueMissing, s).toBe(true);
    }
  });

  it("still treats an OKLCH-authored hue at zero chroma as present", () => {
    const p = parseColorDetailed("oklch(0.5 0 90)")!;
    expect(p.hueMissing).toBe(false);
    expect(p.color.h).toBe(90);
  });

  it("keeps a chromatic p3 color's hue", () => {
    expect(parseColorDetailed("color(display-p3 0.5 0.45 0.45)")!.hueMissing).toBe(false);
  });
});

// Round-2 review (2026-10-02): the in-gamut early return let near-black
// colors reach HSL/HSV with channel slack, yielding saturation in the
// millions, and wrapping after rounding reintroduced float noise in hue.
describe("formatColor near black", () => {
  it("keeps hsl/hsb saturation in range and hue free of float noise", () => {
    const a = formatColor({ l: 0.006054718750540909, c: 0.00399657324828557, h: 188.39, alpha: 1 }, "hsl");
    const b = formatColor({ l: 0.0001, c: 0.0005, h: 259.8, alpha: 1 }, "hsb");
    // Hue is the first number; at most 2 decimals.
    expect(a).toMatch(/^hsl\(\d+(\.\d{1,2})? /);
    expect(b).toMatch(/^color\(--hsv \d+(\.\d{1,2})? /);
    const sat = parseFloat(a.split(" ")[1]);
    expect(sat).toBeLessThanOrEqual(100);
    const hsvS = parseFloat(b.replace("color(--hsv ", "").split(" ")[1]);
    expect(hsvS).toBeLessThanOrEqual(1);
  });
});

// Round-3 review (2026-10-02): near white, HSL saturation divides by
// 1 - |2L - 1| ≈ 0, so 1e-7 of conversion noise read as 50%.
describe("formatColor at the white/black poles", () => {
  it.each(["#fff", "#000", "#808080"])("formats %s as achromatic", (hex) => {
    const c = parseColor(hex)!;
    expect(formatColor(c, "hsl")).toMatch(/^hsl\(0 0% /);
    expect(formatColor(c, "hsb")).toMatch(/^color\(--hsv 0 0 /);
  });
});

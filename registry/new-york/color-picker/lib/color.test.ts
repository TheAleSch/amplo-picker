import { describe, expect, it } from "vitest";
import {
  parseColor,
  formatColor,
  formatAll,
  gamutInfo,
  toGamut,
  contrast,
  apcaContrast,
  isValidColor,
} from "./color";

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

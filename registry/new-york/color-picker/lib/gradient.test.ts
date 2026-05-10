import { describe, it, expect } from "vitest";
import {
  formatGradient,
  parseGradient,
  parseFill,
  formatFill,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type LinearGradient,
  type Fill,
} from "./gradient";

describe("formatGradient", () => {
  it("emits a linear gradient with `in oklch` and degree angle", () => {
    expect(formatGradient(DEFAULT_LINEAR)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits stop hints between adjacent stops", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      stops: [
        { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
        { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1, hint: 0.3 },
      ],
    };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0) 0%, 30%, oklch(0 0 0) 100%)",
    );
  });

  it("emits a radial gradient with shape, size, center", () => {
    expect(formatGradient(DEFAULT_RADIAL)).toBe(
      "radial-gradient(circle farthest-corner at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits explicit numeric radii when radii is set, overriding keywords", () => {
    expect(
      formatGradient({ ...DEFAULT_RADIAL, radii: { x: 0.48, y: 0.3 } }),
    ).toBe(
      "radial-gradient(48% 30% at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits a conic gradient with start angle and center", () => {
    expect(formatGradient(DEFAULT_CONIC)).toBe(
      "conic-gradient(from 0deg at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("respects custom interpolation space", () => {
    const g: LinearGradient = { ...DEFAULT_LINEAR, interp: "hsl-longer" };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in hsl longer hue 90deg, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits alpha when stop alpha < 1", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      stops: [
        { color: { l: 1, c: 0, h: 0, alpha: 0.5 }, position: 0 },
        { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
      ],
    };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0 / 0.5) 0%, oklch(0 0 0) 100%)",
    );
  });
});

describe("parseGradient", () => {
  it("round-trips a default linear gradient", () => {
    const css = formatGradient(DEFAULT_LINEAR);
    const parsed = parseGradient(css);
    expect(parsed).toEqual(DEFAULT_LINEAR);
  });

  it("round-trips a radial gradient", () => {
    const css = formatGradient(DEFAULT_RADIAL);
    expect(parseGradient(css)).toEqual(DEFAULT_RADIAL);
  });

  it("round-trips a radial gradient with explicit numeric radii", () => {
    // When numeric radii are emitted, the `circle`/`ellipse` keyword is
    // intentionally dropped from the CSS — `circle <length-percentage>{2}`
    // is invalid syntax. On re-parse, shape falls back to the CSS default
    // (`ellipse`), which is the expected behavior; the explicit radii are
    // the source of truth for visual sizing.
    const g = { ...DEFAULT_RADIAL, shape: "ellipse" as const, radii: { x: 0.6, y: 0.25 } };
    expect(parseGradient(formatGradient(g))).toEqual(g);
  });

  it("does not attach a radii field when CSS only carries keywords", () => {
    const parsed = parseGradient(formatGradient(DEFAULT_RADIAL));
    expect(parsed).toEqual(DEFAULT_RADIAL);
    expect((parsed as { radii?: unknown }).radii).toBeUndefined();
  });

  it("round-trips all four radial extent keywords", () => {
    for (const size of [
      "closest-side",
      "closest-corner",
      "farthest-side",
      "farthest-corner",
    ] as const) {
      const g = { ...DEFAULT_RADIAL, size };
      expect(parseGradient(formatGradient(g))).toEqual(g);
    }
  });

  it("round-trips a conic gradient", () => {
    const css = formatGradient(DEFAULT_CONIC);
    expect(parseGradient(css)).toEqual(DEFAULT_CONIC);
  });

  it("returns null for non-gradient input", () => {
    expect(parseGradient("oklch(0.5 0.1 30)")).toBeNull();
    expect(parseGradient("not a gradient")).toBeNull();
  });

  it("parses hex stops as OKLCH", () => {
    const parsed = parseGradient("linear-gradient(90deg, #ffffff 0%, #000000 100%)");
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("linear");
    expect(parsed!.stops).toHaveLength(2);
    expect(parsed!.stops[0].position).toBe(0);
    expect(parsed!.stops[1].position).toBe(1);
  });
});

describe("Fill helpers", () => {
  it("formats a color fill as a CSS color string", () => {
    const fill: Fill = { kind: "color", color: { l: 0.7, c: 0.18, h: 30, alpha: 1 } };
    expect(formatFill(fill)).toBe("oklch(0.7 0.18 30)");
  });

  it("formats a gradient fill via formatGradient", () => {
    const fill: Fill = { kind: "gradient", gradient: DEFAULT_LINEAR };
    expect(formatFill(fill)).toBe(formatGradient(DEFAULT_LINEAR));
  });

  it("parses a CSS color into a color fill", () => {
    const f = parseFill("oklch(0.7 0.18 30)");
    expect(f).not.toBeNull();
    expect(f!.kind).toBe("color");
  });

  it("parses a CSS gradient into a gradient fill", () => {
    const f = parseFill(formatGradient(DEFAULT_LINEAR));
    expect(f).not.toBeNull();
    expect(f!.kind).toBe("gradient");
  });

  it("returns null for nonsense", () => {
    expect(parseFill("xxx")).toBeNull();
  });
});

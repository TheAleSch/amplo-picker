import { describe, it, expect } from "vitest";
import {
  formatGradient,
  parseGradient,
  parseFill,
  formatFill,
  projectStopPosition,
  reverseProjectStopPosition,
  sampleStopsAt,
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

  it("emits explicit numeric radii for ellipse, overriding keywords", () => {
    expect(
      formatGradient({
        ...DEFAULT_RADIAL,
        shape: "ellipse",
        radii: { x: 0.48, y: 0.3 },
      }),
    ).toBe(
      "radial-gradient(48% 30% at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits a single <px> length when shape=circle and radiusPx is set", () => {
    expect(
      formatGradient({ ...DEFAULT_RADIAL, shape: "circle", radiusPx: 268 }),
    ).toBe(
      "radial-gradient(268px at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("prefers radiusPx over radii when both are set on a circle", () => {
    // radiusPx wins, radii is ignored on emit. (UI setters keep them
    // mutually exclusive, but the format function tolerates both.)
    expect(
      formatGradient({
        ...DEFAULT_RADIAL,
        shape: "circle",
        radiusPx: 100,
        radii: { x: 0.5, y: 0.5 },
      }),
    ).toBe(
      "radial-gradient(100px at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
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

describe("projectStopPosition / reverseProjectStopPosition", () => {
  it("round-trips authored positions through project → reverse", () => {
    const start = { x: 0.25, y: 0.5 };
    const end = { x: 0.75, y: 0.5 };
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const displayed = projectStopPosition(p, start, end);
      const back = reverseProjectStopPosition(displayed, start, end);
      expect(back).toBeCloseTo(p, 6);
    }
  });

  it("returns identity when either endpoint is missing", () => {
    expect(projectStopPosition(0.3, undefined, undefined)).toBe(0.3);
    expect(projectStopPosition(0.3, { x: 0, y: 0 }, undefined)).toBe(0.3);
    expect(reverseProjectStopPosition(0.3, undefined, { x: 1, y: 1 })).toBe(
      0.3,
    );
  });

  it("places authored 0 at startProj and authored 1 at endProj", () => {
    const start = { x: 0.25, y: 0.5 };
    const end = { x: 0.75, y: 0.5 };
    // For this center-symmetric horizontal segment, projection is exactly
    // the x coordinate of each endpoint.
    expect(projectStopPosition(0, start, end)).toBeCloseTo(0.25, 6);
    expect(projectStopPosition(1, start, end)).toBeCloseTo(0.75, 6);
    expect(projectStopPosition(0.5, start, end)).toBeCloseTo(0.5, 6);
  });
});

describe("formatGradient — positioned linear", () => {
  it("derives the angle from start/end when both are set", () => {
    // start = top, end = bottom → CSS angle 180deg (gradient flows down)
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    };
    const css = formatGradient(g);
    expect(css).toContain("180deg");
  });

  it("re-maps stop positions when start/end are inset from box edges", () => {
    // Center-symmetric segment with half-length: stops should land at 25%/75%.
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      angle: 90,
      start: { x: 0.25, y: 0.5 },
      end: { x: 0.75, y: 0.5 },
    };
    const css = formatGradient(g);
    expect(css).toContain("oklch(1 0 0) 25%");
    expect(css).toContain("oklch(0 0 0) 75%");
  });

  it("falls back to the angle form when start === end (degenerate line)", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      start: { x: 0.5, y: 0.5 },
      end: { x: 0.5, y: 0.5 },
    };
    const css = formatGradient(g);
    // Stops should keep their authored positions when there's no valid
    // direction to project onto.
    expect(css).toContain("oklch(1 0 0) 0%");
    expect(css).toContain("oklch(0 0 0) 100%");
  });

  it("ignores start/end when only one is set", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      start: { x: 0.25, y: 0.5 },
    };
    expect(formatGradient(g)).toBe(formatGradient(DEFAULT_LINEAR));
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

  it("round-trips a radial gradient with circle radiusPx", () => {
    const g = { ...DEFAULT_RADIAL, shape: "circle" as const, radiusPx: 184 };
    expect(parseGradient(formatGradient(g))).toEqual(g);
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

  it("attaches a midpoint hint to the following stop and round-trips it", () => {
    // formatStops emits stop i's hint between stop i-1 and stop i, so parse
    // must attach a bare `50%` to the NEXT stop — not the previous one.
    const css =
      "linear-gradient(in oklch 90deg, #ffffff 0%, 50%, #000000 100%)";
    const parsed = parseGradient(css);
    expect(parsed).not.toBeNull();
    expect(parsed!.stops[0].hint).toBeUndefined();
    expect(parsed!.stops[1].hint).toBeCloseTo(0.5, 6);
    // Round trip: the hint must survive format → parse → format.
    const reformatted = formatGradient(parsed!);
    expect(reformatted).toContain(" 50%,");
    expect(parseGradient(reformatted)).toEqual(parsed);
  });

  it("rejects leading, trailing, and doubled hints", () => {
    expect(
      parseGradient("linear-gradient(90deg, 50%, #fff 0%, #000 100%)"),
    ).toBeNull();
    expect(
      parseGradient("linear-gradient(90deg, #fff 0%, #000 100%, 50%)"),
    ).toBeNull();
    expect(
      parseGradient("linear-gradient(90deg, #fff 0%, 30%, 60%, #000 100%)"),
    ).toBeNull();
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

describe("parseGradient — CSS parity (2026-07-12 audit)", () => {
  // C-4: unpositioned intermediate stops must be spaced evenly per CSS
  // Images 3, not dumped at 100%.
  it("evenly spaces unpositioned intermediate stops", () => {
    const g = parseGradient("linear-gradient(90deg, #f00, #0f0, #00f)")!;
    expect(g).not.toBeNull();
    expect(g.stops.map((s) => s.position)).toEqual([0, 0.5, 1]);
  });

  it("spaces runs of unpositioned stops between anchored neighbors", () => {
    const g = parseGradient(
      "linear-gradient(90deg, #f00 20%, #0f0, #00f, #fff 80%)",
    )!;
    const positions = g.stops.map((s) => s.position);
    expect(positions.length).toBe(4);
    [0.2, 0.4, 0.6, 0.8].forEach((expected, i) => {
      expect(positions[i]).toBeCloseTo(expected, 10);
    });
  });

  it("clamps explicit positions to be non-decreasing (CSS fixup)", () => {
    const g = parseGradient("linear-gradient(90deg, #f00 60%, #00f 20%)")!;
    expect(g.stops.map((s) => s.position)).toEqual([0.6, 0.6]);
  });

  // C-5: `to <side-or-corner>` is standard CSS and must parse.
  it("parses `to right` as 90deg", () => {
    const g = parseGradient("linear-gradient(to right, #ffffff, #000000)")!;
    expect(g).not.toBeNull();
    expect(g.type).toBe("linear");
    if (g.type === "linear") expect(g.angle).toBe(90);
  });

  it("parses the other sides and corners", () => {
    const angleOf = (dir: string) => {
      const g = parseGradient(`linear-gradient(${dir}, #fff, #000)`)!;
      return g.type === "linear" ? g.angle : NaN;
    };
    expect(angleOf("to top")).toBe(0);
    expect(angleOf("to bottom")).toBe(180);
    expect(angleOf("to left")).toBe(270);
    expect(angleOf("to top right")).toBe(45);
    expect(angleOf("to bottom right")).toBe(135);
    expect(angleOf("to bottom left")).toBe(225);
    expect(angleOf("to left top")).toBe(315);
  });
});

describe("formatGradient — circle never emits ellipse radii (C-7)", () => {
  it("falls back to the keyword form when shape is circle with stale radii", () => {
    const css = formatGradient({
      ...DEFAULT_RADIAL,
      shape: "circle",
      radii: { x: 0.5, y: 0.3 },
    });
    expect(css).toContain("circle farthest-corner");
    expect(css).not.toContain("50% 30%");
  });

  it("still emits radii for ellipse", () => {
    const css = formatGradient({
      ...DEFAULT_RADIAL,
      shape: "ellipse",
      radii: { x: 0.5, y: 0.3 },
    });
    expect(css).toContain("50% 30%");
  });
});

describe("sampleStopsAt (C-6 / T-1)", () => {
  const white = { l: 1, c: 0, h: 0, alpha: 1 };
  const black = { l: 0, c: 0, h: 0, alpha: 1 };

  it("lerps linearly without hints", () => {
    const mid = sampleStopsAt(
      [
        { color: white, position: 0 },
        { color: black, position: 1 },
      ],
      0.5,
    );
    expect(mid.l).toBeCloseTo(0.5, 6);
  });

  it("wraps hue via the short path (350 → 10)", () => {
    const a = { l: 0.6, c: 0.2, h: 350, alpha: 1 };
    const b = { l: 0.6, c: 0.2, h: 10, alpha: 1 };
    const mid = sampleStopsAt(
      [
        { color: a, position: 0 },
        { color: b, position: 1 },
      ],
      0.5,
    );
    expect(mid.h).toBeCloseTo(0, 1);
  });

  it("applies the CSS midpoint hint to sampling", () => {
    // Hint at 10%: the visible ramp reaches the 50/50 blend already at
    // position 0.1, so at 0.5 the paint is far darker than mid-gray.
    const stops = [
      { color: white, position: 0 },
      { color: black, position: 1, hint: 0.1 },
    ];
    const atHint = sampleStopsAt(stops, 0.1);
    expect(atHint.l).toBeCloseTo(0.5, 2);
    // CSS curve t^(log .5 / log .1) at t = 0.5 → progress ≈ 0.812.
    const mid = sampleStopsAt(stops, 0.5);
    expect(mid.l).toBeCloseTo(1 - 0.5 ** (Math.log(0.5) / Math.log(0.1)), 6);
    expect(mid.l).toBeLessThan(0.25);
  });

  it("ignores degenerate hints outside the segment", () => {
    const stops = [
      { color: white, position: 0.2 },
      { color: black, position: 0.8, hint: 0.9 },
    ];
    const mid = sampleStopsAt(stops, 0.5);
    expect(mid.l).toBeCloseTo(0.5, 6);
  });
});

describe("gradient lib edge cases (2026-07-12 audit T-3 / T-6 / T-9)", () => {
  it("rejects gradients with malformed stop colors", () => {
    expect(
      parseGradient("linear-gradient(90deg, notacolor, #ffffff)"),
    ).toBeNull();
    expect(
      parseGradient("linear-gradient(90deg, #ffffff 0%, oklch(nope) 100%)"),
    ).toBeNull();
  });

  it("projectStopPosition is the identity for a zero-length segment", () => {
    const p = { x: 0.4, y: 0.4 };
    expect(projectStopPosition(0.3, p, { ...p })).toBe(0.3);
    expect(reverseProjectStopPosition(0.3, p, { ...p })).toBe(0.3);
  });

  it("parses negative midpoint hints (spec-legal)", () => {
    const g = parseGradient(
      "linear-gradient(90deg, #ffffff 0%, -10%, #000000 100%)",
    )!;
    expect(g).not.toBeNull();
    expect(g.stops[1].hint).toBeCloseTo(-0.1, 6);
  });
});

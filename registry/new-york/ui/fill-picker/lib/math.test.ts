import { describe, it, expect } from "vitest";
import { clamp, clamp01, round, wrap, wrapHue } from "./math";

describe("math helpers", () => {
  it("clamp / clamp01 bound to the range", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
  });

  it("round keeps the requested decimals", () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(0.1 + 0.2, 6)).toBe(0.3);
  });

  it("wrap is a Euclidean modulo", () => {
    expect(wrap(-30, 360)).toBe(330);
    expect(wrap(725, 360)).toBe(5);
  });

  // `-1e-14 + 360` rounds to exactly 360 in floating point; a single
  // `m < 0 ? m + 360 : m` would return 360 instead of wrapping to 0.
  it("wrapHue never returns 360", () => {
    expect(wrapHue(-1e-14)).toBe(0);
    expect(wrapHue(360)).toBe(0);
    expect(wrapHue(-90)).toBe(270);
  });
});

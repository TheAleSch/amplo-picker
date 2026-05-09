import { describe, it, expect } from "vitest";
import {
  formatGradient,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type LinearGradient,
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

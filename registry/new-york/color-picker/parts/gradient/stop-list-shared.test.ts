import { describe, expect, it } from "vitest";

import { insertStopAfterSelected } from "./stop-list-shared";
import type { OklchColor } from "../../lib/types";

const red: OklchColor = { l: 0.6, c: 0.2, h: 30, alpha: 1 };
const blue: OklchColor = { l: 0.5, c: 0.2, h: 260, alpha: 1 };

const stop = (id: string, position: number, color: OklchColor) => ({
  id,
  position,
  color,
});

// I-1 (2026-07-25 adversarial review): the zero-stop branch dereferenced an
// undefined anchor and threw inside a click handler. `Gradient.stops` has no
// non-empty constraint, so a controlled consumer can hand us that state.
describe("insertStopAfterSelected", () => {
  it("does not throw on a stop-less gradient", () => {
    expect(() => insertStopAfterSelected([], "")).not.toThrow();
    const placed = insertStopAfterSelected([], null);
    expect(placed.position).toBe(0);
    expect(Number.isFinite(placed.color.l)).toBe(true);
  });

  it("inserts halfway to the next stop", () => {
    const stops = [stop("a", 0, red), stop("b", 1, blue)];
    expect(insertStopAfterSelected(stops, "a").position).toBeCloseTo(0.5);
  });

  it("inserts halfway back when the selected stop is last", () => {
    const stops = [stop("a", 0, red), stop("b", 1, blue)];
    expect(insertStopAfterSelected(stops, "b").position).toBeCloseTo(0.5);
  });

  it("falls back to halfway-to-1 for a lone stop", () => {
    expect(insertStopAfterSelected([stop("a", 0.2, red)], "a").position).toBeCloseTo(
      0.6,
    );
  });

  it("anchors on the last stop when the selection is unknown", () => {
    const stops = [stop("a", 0, red), stop("b", 0.4, blue)];
    // No match for the id → anchor is the last (highest-position) stop.
    // Being last, it has no `next`, so placement falls to the halfway-back
    // branch: between the previous stop (0) and the anchor (0.4).
    expect(insertStopAfterSelected(stops, "missing").position).toBeCloseTo(0.2);
  });

  it("sorts by position before placing, not by array order", () => {
    const stops = [stop("b", 1, blue), stop("a", 0, red)];
    expect(insertStopAfterSelected(stops, "a").position).toBeCloseTo(0.5);
  });

  it("samples the ramp so the inserted color blends in", () => {
    const stops = [stop("a", 0, red), stop("b", 1, blue)];
    const { color } = insertStopAfterSelected(stops, "a");
    // Lightness interpolates linearly between the two endpoints.
    expect(color.l).toBeCloseTo((red.l + blue.l) / 2, 2);
    // Hue takes the *shorter* arc, which for 30° → 260° wraps back through
    // 0 rather than climbing through green — so assert the sampled hue is a
    // genuine interpolation, not a copy of either endpoint.
    expect(color.h).not.toBeCloseTo(red.h, 1);
    expect(color.h).not.toBeCloseTo(blue.h, 1);
  });
});

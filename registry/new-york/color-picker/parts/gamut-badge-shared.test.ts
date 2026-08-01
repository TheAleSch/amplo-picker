import { describe, it, expect } from "vitest";
import { gamutLabel } from "./gamut-badge-shared";

// Truth table copied from the original if/else chain in gamut-badge.tsx —
// the shared helper must not change any classification.
describe("gamutLabel", () => {
  it("labels in-sRGB colors sRGB", () => {
    expect(gamutLabel({ inSrgb: true, inP3: true, inRec2020: true })).toBe("sRGB");
  });
  it("labels out-of-sRGB but in-P3 colors P3", () => {
    expect(gamutLabel({ inSrgb: false, inP3: true, inRec2020: true })).toBe("P3");
  });
  it("labels out-of-P3 but in-Rec.2020 colors Rec.2020", () => {
    expect(gamutLabel({ inSrgb: false, inP3: false, inRec2020: true })).toBe("Rec.2020");
  });
  it("labels colors outside Rec.2020 as out of gamut", () => {
    expect(gamutLabel({ inSrgb: false, inP3: false, inRec2020: false })).toBe("Out of gamut");
  });
});

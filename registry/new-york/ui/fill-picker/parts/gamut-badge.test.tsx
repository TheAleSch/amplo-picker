import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Root } from "./root";
import { GamutBadge } from "./gamut-badge";

// Radix-shell mirror of fill-picker-base/parts/gamut-badge.test.tsx —
// same status semantics contract, tooltip wired via the consumer wrapper.
describe("color-picker GamutBadge (Radix shell)", () => {
  it("renders a polite status region with the gamut label", () => {
    render(
      <Root defaultValue="#ff0000">
        <GamutBadge />
      </Root>,
    );
    const badge = screen.getByRole("status");
    expect(badge.getAttribute("aria-live")).toBe("polite");
    expect(badge.textContent).toContain("Gamut");
    expect(badge.textContent).toContain("sRGB");
  });

  it("hides the prefix label when showLabel is false", () => {
    render(
      <Root defaultValue="#ff0000">
        <GamutBadge showLabel={false} />
      </Root>,
    );
    const badge = screen.getByRole("status");
    expect(badge.textContent).not.toContain("Gamut");
    expect(badge.textContent).toContain("sRGB");
  });
});

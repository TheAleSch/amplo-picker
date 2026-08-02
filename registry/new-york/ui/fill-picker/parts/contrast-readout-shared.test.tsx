import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { ContrastReadout } from "./contrast-readout";

// The shared hook derives activeMetric instead of resetting state when the
// parent narrows `metrics` — so a narrowed-then-restored metric resurrects
// the user's previous choice. Documented behavior; this pins it.
describe("useContrastReadout metric narrowing", () => {
  it("resurrects the previous choice when a narrowed metric returns", () => {
    const ui = (metrics: ("wcag" | "apca")[]) => (
      <Root defaultValue="#000000" backgroundColor="#ffffff">
        <ContrastReadout metrics={metrics} />
      </Root>
    );
    const { rerender } = render(ui(["wcag", "apca"]));
    fireEvent.click(screen.getByRole("button")); // cycle to APCA
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/APCA Lc/);

    rerender(ui(["wcag"])); // narrowed: falls back to WCAG, single-metric group
    expect(screen.getByRole("group").getAttribute("aria-label")).toMatch(/WCAG/);

    rerender(ui(["wcag", "apca"])); // restored: APCA choice resurrects
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/APCA Lc/);
  });

  it("treats an empty metrics array as the default (WCAG)", () => {
    render(
      <Root defaultValue="#000000" backgroundColor="#ffffff">
        <ContrastReadout metrics={[]} />
      </Root>,
    );
    expect(screen.getByRole("group").getAttribute("aria-label")).toMatch(/WCAG/);
  });
});

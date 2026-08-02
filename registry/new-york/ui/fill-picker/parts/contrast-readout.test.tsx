import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { ContrastReadout } from "./contrast-readout";

// A-5 (2026-07-12 audit): with multiple metrics the aria-label replaced the
// visible content as the accessible name, hiding the ratio and pass/fail
// from assistive tech entirely.
describe("ContrastReadout accessible name (multi-metric)", () => {
  const ui = (
    <Root defaultValue="#000000" backgroundColor="#ffffff">
      <ContrastReadout metrics={["wcag", "apca"]} />
    </Root>
  );

  it("includes the ratio and pass/fail in the button's accessible name", () => {
    render(ui);
    const btn = screen.getByRole("button");
    const name = btn.getAttribute("aria-label") ?? "";
    expect(name).toMatch(/WCAG 21\.00 to 1/);
    expect(name).toMatch(/AA pass/);
    expect(name).toMatch(/AAA pass/);
    expect(name).toMatch(/switch to APCA/i);
  });

  it("announces the new metric after cycling", () => {
    render(ui);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    const name = btn.getAttribute("aria-label") ?? "";
    expect(name).toMatch(/APCA Lc/);
    const live = btn.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live!.textContent).toMatch(/APCA Lc/);
  });
});

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { ContrastReadout } from "./contrast-readout";

// Parity contract with the Radix shell's test (color-picker/parts/
// contrast-readout.test.tsx): the Base UI tooltip wiring must not change
// the accessible name or the cycle announcement behavior. (Popup opening/
// positioning is deliberately not asserted — happy-dom can't exercise
// Base UI's hover/portal machinery reliably.)
describe("fill-picker-base ContrastReadout", () => {
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

  it("renders the single-metric variant as a focusable group, not a button", () => {
    render(
      <Root defaultValue="#000000" backgroundColor="#ffffff">
        <ContrastReadout />
      </Root>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    const group = screen.getByRole("group");
    expect(group.getAttribute("tabindex")).toBe("0");
  });
});

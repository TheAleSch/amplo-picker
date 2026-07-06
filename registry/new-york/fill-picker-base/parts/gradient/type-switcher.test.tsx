import * as React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Root as GradientRoot } from "@/registry/new-york/color-picker/parts/gradient/root";
import { TypeSwitcher } from "./type-switcher";

const LINEAR = {
  type: "linear" as const,
  angle: 90,
  interp: "oklch" as const,
  stops: [
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

// Keyboard-and-name parity check against the original (Radix) TypeSwitcher:
// the Base UI port must still expose a resolvable accessible name on the
// trigger and let a user open the popup and select an option with click
// and keyboard, since Base UI's Select owns positioning/portal/keyboard
// handling internally instead of Radix's. Base UI mounts the popup on a
// zero-delay timeout after open, so assertions that depend on it use
// `findByRole` (which polls) rather than the synchronous `getByRole`.
describe("fill-picker-base gradient TypeSwitcher", () => {
  it("exposes an accessible trigger, opens on click, and commits a selection", async () => {
    render(
      <GradientRoot defaultValue={LINEAR}>
        <TypeSwitcher />
      </GradientRoot>,
    );

    const trigger = screen.getByRole("combobox", { name: "Gradient type" });
    expect(trigger).toHaveTextContent("Linear");

    fireEvent.click(trigger);
    const listbox = await screen.findByRole("listbox");
    const option = within(listbox).getByText("Radial").closest('[role="option"]')!;
    // A real click is preceded by `pointerdown` — Base UI's item only treats
    // the follow-up `click` as a genuine mouse selection once it has seen
    // that `pointerdown` (this guards against a click landing on an item
    // that was merely under the cursor when the popup opened).
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(trigger).toHaveTextContent("Radial");
  });

  it("is keyboard-operable: ArrowDown opens the popup", async () => {
    render(
      <GradientRoot defaultValue={LINEAR}>
        <TypeSwitcher />
      </GradientRoot>,
    );

    const trigger = screen.getByRole("combobox", { name: "Gradient type" });
    trigger.focus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await screen.findByRole("listbox");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

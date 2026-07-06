import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { Hue } from "./hue";

// Keyboard-parity check against the original (non-Base UI) hue slider: the
// Base UI port must still expose a standard `role="slider"` element with
// `aria-valuenow` and respond to ArrowLeft/ArrowRight, since Base UI's
// Slider owns keyboard handling internally instead of our own onKeyDown.
describe("fill-picker-base Hue", () => {
  it("exposes aria-valuenow and responds to ArrowLeft/ArrowRight", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue />
      </Root>,
    );

    // The `aria-label` lives on `Slider.Thumb`, which is where Base UI renders
    // the `role="slider"` input — so the control itself resolves the "Hue"
    // accessible name (querying by name would silently pass if it regressed to
    // Slider.Root's group element, so we assert the name explicitly).
    const slider = screen.getByRole("slider", { name: "Hue" });
    expect(slider).toHaveAttribute("aria-valuenow", "120");
    expect(slider).toHaveAttribute("aria-valuetext", "120 degrees");

    // The focus ring is applied via `has-[:focus-visible]` on the thumb, which
    // only works because the role="slider" <input> is a descendant of the
    // element carrying that class. Guard the structural assumption so a future
    // refactor that hoists the input out of the thumb can't silently kill the
    // keyboard focus indicator.
    // (Walk ancestors in JS rather than a CSS attribute selector — the class
    // name contains literal `[` / `]`, which querySelector can't match.)
    let ringHost: HTMLElement | null = slider.parentElement;
    while (ringHost && !ringHost.className.includes("has-[:focus-visible]:ring-2")) {
      ringHost = ringHost.parentElement;
    }
    expect(ringHost).not.toBeNull();
    expect(ringHost).toContainElement(slider);

    act(() => {
      slider.focus();
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    });
    expect(slider).toHaveAttribute("aria-valuenow", "121");

    act(() => {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    });
    act(() => {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    });
    expect(slider).toHaveAttribute("aria-valuenow", "119");
  });
});

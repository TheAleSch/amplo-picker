import * as React from "react";
import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { Hue } from "./hue";

// Keyboard-parity check against the original (non-Base UI) hue slider: the
// Base UI port must still expose a standard `role="slider"` element with
// `aria-valuenow` and respond to ArrowLeft/ArrowRight, since Base UI's
// Slider owns keyboard handling internally instead of our own onKeyDown.
describe("fill-picker-base Hue", () => {
  it("exposes an accessible name, aria-valuenow, and responds to ArrowLeft/ArrowRight", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue />
      </Root>,
    );

    // Base UI routes aria-label to the nested role="slider" input via
    // Slider.Thumb (NOT Slider.Root, which only labels the outer group), so
    // the accessible name must resolve by role+name.
    const slider = screen.getByRole("slider", { name: "Hue" });
    expect(slider).toHaveAttribute("aria-valuenow", "120");

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

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Hue } from "./hue";

describe("Hue (classic) track end", () => {
  // End / a drag past the right edge commit 360, which `setHueFromSlider`
  // wraps to 0 — the thumb jumped back to the start and End == Home.
  it("End keeps the hue at the end of the track", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Hue" });
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider).toHaveAttribute("aria-valuenow", "360");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("dragging past the right edge keeps the hue at the end", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Hue" });
    slider.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 12, width: 200, height: 12, toJSON() { return {}; } }) as DOMRect;
    slider.setPointerCapture = () => {};
    fireEvent.pointerDown(slider, { clientX: 260, clientY: 6, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "360");
  });

  // Parity with the Base UI variant, whose vertical Slider anchors the min
  // at the bottom: pointing near the top must give a high hue.
  it("vertical orientation is bottom-anchored", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue orientation="vertical" />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Hue" });
    slider.getBoundingClientRect = () =>
      ({ x: 0, y: 0, left: 0, top: 0, right: 12, bottom: 200, width: 12, height: 200, toJSON() { return {}; } }) as DOMRect;
    slider.setPointerCapture = () => {};
    fireEvent.pointerDown(slider, { clientX: 6, clientY: 50, pointerId: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "270");
  });
});

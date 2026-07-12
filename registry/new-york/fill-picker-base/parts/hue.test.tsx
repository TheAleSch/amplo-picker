import { describe, it, expect, beforeAll } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { Hue } from "./hue";

// thumbAlignment="edge" measures control/thumb rects to inset the thumb and
// keeps it visibility:hidden until the measurement is finite — happy-dom
// returns zero-size rects, which would hide the thumb (and its role=slider
// input) from the accessibility tree. Give elements a real-looking rect.
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 12,
      width: 200, height: 12,
      toJSON() { return {}; },
    } as DOMRect;
  };
});

// Keyboard-parity check against the original (non-Base UI) hue slider: the
// Base UI port must still expose a standard `role="slider"` element with
// `aria-valuenow` and respond to ArrowLeft/ArrowRight, since Base UI's
// Slider owns keyboard handling internally instead of our own onKeyDown.
describe("fill-picker-base Hue", () => {
  it("uses edge thumb alignment so the thumb stays inside the track at 0/360", async () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 0)">
        <Hue />
      </Root>,
    );
    // Edge alignment measures rects in a queued microtask before unhiding
    // the thumb — flush it so the slider enters the accessibility tree.
    await act(async () => {});
    const slider = screen.getByRole("slider", { name: "Hue" });
    // Base UI's edge alignment positions the thumb via an inset --position
    // custom property instead of a centered percentage; centered alignment
    // lets the thumb overhang the rounded track ends at the extremes.
    let thumb: HTMLElement | null = slider.parentElement;
    while (thumb && !(thumb.getAttribute("style") ?? "").includes("--position")) {
      thumb = thumb.parentElement;
    }
    expect(thumb).not.toBeNull();
  });

  it("exposes an accessible name, aria-valuenow, and responds to ArrowLeft/ArrowRight", async () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Hue />
      </Root>,
    );
    await act(async () => {});

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

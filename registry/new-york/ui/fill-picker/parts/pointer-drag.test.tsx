import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Alpha } from "./alpha";
import type { OklchColor } from "../lib/types";

const RECT = {
  x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 12, width: 200, height: 12,
  toJSON() { return {}; },
} as DOMRect;

function setup(el: HTMLElement) {
  el.getBoundingClientRect = () => RECT;
  el.setPointerCapture = () => {};
  el.releasePointerCapture = () => {};
}

describe("slider drags via trackPointerDrag", () => {
  it("follows moves while a button is held and stops on a buttonless move", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Alpha />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Opacity" });
    setup(slider);
    fireEvent.pointerDown(slider, { clientX: 20, pointerId: 1, buttons: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "10");
    fireEvent.pointerMove(slider, { clientX: 100, pointerId: 1, buttons: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    // The release happened somewhere we couldn't see: the drag must end
    // here instead of chasing the cursor.
    fireEvent.pointerMove(slider, { clientX: 150, pointerId: 1, buttons: 0 });
    fireEvent.pointerMove(slider, { clientX: 180, pointerId: 1, buttons: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("ignores non-primary presses", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120 / 0.5)">
        <Alpha />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Opacity" });
    setup(slider);
    fireEvent.pointerDown(slider, { clientX: 20, pointerId: 1, button: 2, buttons: 2 });
    fireEvent.pointerMove(slider, { clientX: 180, pointerId: 1, buttons: 2 });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("ends the drag when pointer capture is lost", () => {
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Alpha />
      </Root>,
    );
    const slider = screen.getByRole("slider", { name: "Opacity" });
    setup(slider);
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1, buttons: 1 });
    fireEvent(slider, new Event("lostpointercapture"));
    fireEvent.pointerMove(slider, { clientX: 180, pointerId: 1, buttons: 1 });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  // The move listener is bound once at pointerdown; it must still act on
  // the latest color, not the snapshot from when the drag started.
  it("applies moves to the latest controlled color", () => {
    const onValueChange = vi.fn<(c: OklchColor) => void>();
    const view = (l: number) => (
      <Root value={{ l, c: 0.1, h: 120, alpha: 1 }} onValueChange={onValueChange}>
        <Alpha />
      </Root>
    );
    const { rerender } = render(view(0.3));
    const slider = screen.getByRole("slider", { name: "Opacity" });
    setup(slider);
    fireEvent.pointerDown(slider, { clientX: 100, pointerId: 1, buttons: 1 });
    rerender(view(0.8));
    fireEvent.pointerMove(slider, { clientX: 150, pointerId: 1, buttons: 1 });
    const last = onValueChange.mock.calls.at(-1)![0];
    expect(last.alpha).toBeCloseTo(0.75);
    expect(last.l).toBeCloseTo(0.8);
  });
});

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { GradientPicker } from "../../fill-picker";

beforeAll(() => {
  if (!Element.prototype.setPointerCapture) {
    (Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    (Element.prototype as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};
  }
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100, toJSON() { return {}; } } as DOMRect;
  };
});

describe("<GradientPicker.PositionPad>", () => {
  it("renders nothing for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionPad data-testid="pad" />
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("pad")).toBeNull();
  });

  it("updates center on click", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.PositionPad data-testid="pad" />
      </GradientPicker.Root>,
    );
    const pad = screen.getByTestId("pad");
    fireEvent.pointerDown(pad, { clientX: 0, clientY: 0 });
    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ center: { x: 0, y: 0 } }),
      expect.any(String),
    );
  });
});

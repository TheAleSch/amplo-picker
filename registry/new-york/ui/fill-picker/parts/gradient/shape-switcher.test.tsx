import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.ShapeSwitcher>", () => {
  it("returns null for non-radial gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.ShapeSwitcher />
      </GradientPicker.Root>,
    );
    expect(screen.queryByRole("button", { name: "Circle" })).toBeNull();
  });

  it("renders two tabs and switches shape", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.ShapeSwitcher />
      </GradientPicker.Root>,
    );
    const ellipseBtn = screen.getByRole("button", { name: "Ellipse" });
    fireEvent.click(ellipseBtn);
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ shape: "ellipse" }),
      expect.any(String),
    );
  });
});

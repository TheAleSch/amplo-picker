import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.EllipseRadiiInput>", () => {
  it("returns null for circle shape", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.EllipseRadiiInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText(/ellipse horizontal radius/i)).toBeNull();
  });

  it("updates rx and ry independently", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "ellipse", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", radii: { x: 0.3, y: 0.6 }, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.EllipseRadiiInput />
      </GradientPicker.Root>,
    );
    const rx = screen.getByLabelText(/ellipse horizontal radius/i);
    const ry = screen.getByLabelText(/ellipse vertical radius/i);
    expect(rx).toHaveValue(30);
    expect(ry).toHaveValue(60);
    fireEvent.change(rx, { target: { value: "50" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ radii: { x: 0.5, y: 0.6 } }),
      expect.any(String),
    );
  });
});

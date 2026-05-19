import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.RadialSizeSelect>", () => {
  it("returns null for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.RadialSizeSelect />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText("Radial size")).toBeNull();
  });

  it("changes size keyword", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.RadialSizeSelect />
      </GradientPicker.Root>,
    );
    const select = screen.getByLabelText("Radial size");
    fireEvent.change(select, { target: { value: "closest-side" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "closest-side" }),
      expect.any(String),
    );
  });
});

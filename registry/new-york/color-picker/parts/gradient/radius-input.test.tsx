import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.RadiusInput>", () => {
  it("returns null for ellipse shape", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "ellipse", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.RadiusInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText(/circle radius/i)).toBeNull();
  });

  it("updates radiusPx via setRadiusPx when typed", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", radiusPx: 100, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.RadiusInput />
      </GradientPicker.Root>,
    );
    // Without an Area mounted, containerWidth is null, so display is in px.
    const input = screen.getByLabelText(/circle radius/i);
    expect(input).toHaveValue(100);
    fireEvent.change(input, { target: { value: "150" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ radiusPx: 150 }),
      expect.any(String),
    );
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.AnglePad>", () => {
  it("returns null for radial gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AnglePad data-testid="pad" />
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("pad")).toBeNull();
  });

  it("exposes a slider role with the current angle for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 45, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AnglePad />
      </GradientPicker.Root>,
    );
    const slider = screen.getByRole("slider", { name: /angle/i });
    expect(slider).toHaveAttribute("aria-valuenow", "45");
  });
});

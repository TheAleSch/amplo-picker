import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.AngleGroup>", () => {
  it("returns null for radial gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AngleGroup data-testid="group">
          <span>child</span>
        </GradientPicker.AngleGroup>
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("group")).toBeNull();
  });

  it("renders children for linear gradients with the slot attribute", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 90, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AngleGroup data-testid="group">
          <span data-testid="child">child</span>
        </GradientPicker.AngleGroup>
      </GradientPicker.Root>,
    );
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-slot", "gradient-angle-group");
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

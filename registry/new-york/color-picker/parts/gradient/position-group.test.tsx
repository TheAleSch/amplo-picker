import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.PositionGroup>", () => {
  it("returns null for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionGroup data-testid="group">
          <span>child</span>
        </GradientPicker.PositionGroup>
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("group")).toBeNull();
  });

  it("renders children for radial gradients with the slot attribute", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionGroup data-testid="group">
          <span data-testid="child">child</span>
        </GradientPicker.PositionGroup>
      </GradientPicker.Root>,
    );
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-slot", "gradient-position-group");
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

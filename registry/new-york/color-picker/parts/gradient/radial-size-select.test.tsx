import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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

  it("renders the current size on the trigger", () => {
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
      >
        <GradientPicker.RadialSizeSelect />
      </GradientPicker.Root>,
    );
    // Trigger displays the current value. The actual select-and-commit
    // path is covered by `setRadialSize` in use-gradient-picker.test —
    // exercising the Radix popover in happy-dom is fragile and adds no
    // unique coverage on top of the hook test.
    const trigger = screen.getByLabelText("Radial size");
    expect(trigger).toHaveTextContent("farthest-corner");
  });
});

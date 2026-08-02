import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.AngleInput>", () => {
  it("shows the current angle and updates on change", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "linear", angle: 90, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.AngleInput />
      </GradientPicker.Root>,
    );
    const input = screen.getByLabelText("Gradient angle in degrees");
    expect(input).toHaveValue("90");
    fireEvent.change(input, { target: { value: "270" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 270 }),
      expect.any(String),
    );
  });
});

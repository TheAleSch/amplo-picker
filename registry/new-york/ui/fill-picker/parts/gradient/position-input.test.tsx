import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.PositionInput>", () => {
  it("renders cx and cy inputs and updates center on change", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.PositionInput />
      </GradientPicker.Root>,
    );
    const cx = screen.getByLabelText("Gradient center x percent");
    const cy = screen.getByLabelText("Gradient center y percent");
    expect(cx).toHaveValue("50");
    expect(cy).toHaveValue("50");
    fireEvent.change(cx, { target: { value: "25" } });
    fireEvent.keyDown(cx, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: { x: 0.25, y: 0.5 } }),
      expect.any(String),
    );
    fireEvent.change(cy, { target: { value: "80" } });
    fireEvent.blur(cy);
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: { x: 0.25, y: 0.8 } }),
      expect.any(String),
    );
  });

  it("snaps a clamped commit back to the canonical value", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 1, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionInput />
      </GradientPicker.Root>,
    );
    const cx = screen.getByLabelText("Gradient center x percent");
    expect(cx).toHaveValue("100");
    fireEvent.change(cx, { target: { value: "150" } });
    expect(cx).toHaveValue("150");
    fireEvent.keyDown(cx, { key: "Enter" });
    expect(cx).toHaveValue("100");
  });

  it("returns null for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 90, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText("Gradient center x percent")).toBeNull();
  });
});

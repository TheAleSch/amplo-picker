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
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 270 }),
      expect.any(String),
    );
  });

  // Commit-per-keystroke made the field un-clearable (the empty string never
  // committed, so the controlled value snapped back) and swallowed decimals.
  it("keeps a local draft until Enter/blur, and Escape reverts", () => {
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
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue("");
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "45" } });
    expect(input).toHaveValue("45");
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 45 }),
      expect.any(String),
    );
    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("45");
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("commits ArrowUp/ArrowDown nudges immediately", () => {
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
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 91 }),
      expect.any(String),
    );
    expect(input).toHaveValue("91");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { FormatSwitcher } from "./format-switcher";

// Drift-2 (2026-07-12 audit): FormatSwitcher hand-rolled its own Base UI
// Select chrome and drifted visually from FieldSelect (text-sm vs mono
// text-xs, no uppercase, different focus ring). It must render through the
// shared FieldSelect so every picker dropdown stays identical.
describe("fill-picker-base FormatSwitcher", () => {
  it("uses the shared FieldSelect chrome (mono, uppercase, xs)", () => {
    render(
      <Root defaultValue="#ff0000" defaultFormat="hex">
        <FormatSwitcher />
      </Root>,
    );
    const trigger = screen.getByRole("combobox", { name: "Color format" });
    expect(trigger.className).toContain("font-mono");
    expect(trigger.className).toContain("text-xs");
    expect(trigger.className).toContain("uppercase");
    expect(trigger.className).not.toContain("text-sm");
  });
});

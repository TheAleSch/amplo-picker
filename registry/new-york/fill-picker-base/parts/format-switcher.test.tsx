import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/root";
import { FormatSwitcher } from "./format-switcher";

// Drift-2 (2026-07-12 audit): FormatSwitcher hand-rolled its own Base UI
// Select chrome and drifted visually from FieldSelect (text-sm vs mono
// text-xs, no uppercase, different focus ring). It must render through the
// shared FieldSelect so every picker dropdown stays identical.
describe("fill-picker-base FormatSwitcher", () => {
  it("applies the caller's layout className to the flex participant (wrapper), not the trigger", () => {
    // Layouts compose `<FormatSwitcher className="flex-1" />` next to a
    // flex-1 EyeDropper. The wrapper div is the flex item — if flex-1 lands
    // on the inner trigger instead, the wrapper keeps a w-full basis and
    // squeezes the eyedropper to min-content.
    render(
      <Root defaultValue="#ff0000" defaultFormat="hex">
        <FormatSwitcher className="flex-1" />
      </Root>,
    );
    const wrapper = document.querySelector(
      '[data-slot="color-picker-format-switcher"]',
    ) as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain("flex-1");
    const trigger = screen.getByRole("combobox", { name: "Color format" });
    expect(trigger.className).not.toContain("flex-1");
  });

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

import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Swatches } from "./swatches";

// A-2 (2026-07-12 audit): role="listbox"/"option" promises arrow-key
// navigation with a roving tabindex — Tab must enter the listbox once, not
// walk every preset.
describe("Swatches keyboard navigation", () => {
  it("uses a roving tabindex: exactly one option is tabbable", () => {
    render(
      <Root defaultValue="#ff0000">
        <Swatches />
      </Root>,
    );
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
    expect(options.filter((o) => o.tabIndex === 0)).toHaveLength(1);
    expect(options.filter((o) => o.tabIndex === -1)).toHaveLength(
      options.length - 1,
    );
  });

  it("moves focus with arrow keys and wraps with Home/End", () => {
    render(
      <Root defaultValue="#ff0000">
        <Swatches />
      </Root>,
    );
    const options = screen.getAllByRole("option");
    act(() => options[0].focus());
    fireEvent.keyDown(options[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(options[1]);
    expect(options[1].tabIndex).toBe(0);
    expect(options[0].tabIndex).toBe(-1);

    fireEvent.keyDown(options[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(options[0]);

    fireEvent.keyDown(options[0], { key: "End" });
    expect(document.activeElement).toBe(options[options.length - 1]);
    fireEvent.keyDown(options[options.length - 1], { key: "Home" });
    expect(document.activeElement).toBe(options[0]);
  });

  it("selects the focused option on click/Enter (button semantics)", () => {
    render(
      <Root defaultValue="#ff0000">
        <Swatches presets={["oklch(0.7 0.18 150)", "oklch(0.5 0 0)"]} />
      </Root>,
    );
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });
});

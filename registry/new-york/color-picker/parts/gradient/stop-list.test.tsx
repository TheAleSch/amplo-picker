import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { StopList } from "./stop-list";

// A-4 (2026-07-12 audit): the stop listbox had no arrow navigation, and
// deleting the focused row dropped focus to <body>.
describe("StopList keyboard navigation", () => {
  const ui = (
    <Root>
      <StopList showAddStop={false} />
    </Root>
  );

  it("moves focus and selection with ArrowUp/ArrowDown", () => {
    render(ui);
    const options = screen.getAllByRole("option");
    expect(options.length).toBe(2);
    act(() => options[0].focus());
    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    expect(options[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(options[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[0]);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
  });

  it("does not delete the stop when Backspace is pressed inside the color text field", () => {
    render(ui);
    const colorFields = screen.getAllByLabelText("Stop color value");
    act(() => colorFields[0].focus());
    fireEvent.keyDown(colorFields[0], { key: "Backspace" });
    expect(screen.getAllByRole("option").length).toBe(2);
  });

  it("keeps focus inside the list after deleting the focused stop", () => {
    render(ui);
    const options = screen.getAllByRole("option");
    act(() => options[0].focus());
    fireEvent.keyDown(options[0], { key: "Delete" });
    const remaining = screen.getAllByRole("option");
    expect(remaining.length).toBe(1);
    expect(document.activeElement).toBe(remaining[0]);
  });
});

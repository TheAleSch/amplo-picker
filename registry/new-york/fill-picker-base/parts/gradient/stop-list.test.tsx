import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "@/registry/new-york/color-picker/parts/gradient/root";
import { StopList } from "./stop-list";

// Mirror of the classic StopList keyboard tests — both variants share
// stop-list-shared.ts, so this guards the Base UI wiring specifically.
describe("fill-picker-base StopList keyboard navigation", () => {
  const ui = (
    <Root>
      <StopList showAddStop={false} />
    </Root>
  );

  it("moves focus and selection with ArrowUp/ArrowDown", () => {
    render(ui);
    const options = screen.getAllByRole("option");
    act(() => options[0].focus());
    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(options[1]);
    expect(options[1]).toHaveAttribute("aria-selected", "true");
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

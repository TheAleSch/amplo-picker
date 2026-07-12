import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Tabs, Tab } from "./tabs";
import { Pane } from "./pane";

// A-3 (2026-07-12 audit): role=tablist/tab promised the APG Tabs contract
// but had no arrow roving, no aria-controls, and no tabpanel.
describe("Fill mode tabs — APG contract", () => {
  const ui = (
    <Root defaultMode="color">
      <Tabs>
        <Tab mode="color">Solid</Tab>
        <Tab mode="gradient">Gradient</Tab>
      </Tabs>
      <Pane mode="color">color pane</Pane>
      <Pane mode="gradient">gradient pane</Pane>
    </Root>
  );

  it("links tabs to a labelled tabpanel via aria-controls", () => {
    render(ui);
    const solid = screen.getByRole("tab", { name: "Solid" });
    const panel = screen.getByRole("tabpanel");
    expect(solid).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", solid.id);
  });

  it("keeps only the active tab in the Tab order", () => {
    render(ui);
    expect(screen.getByRole("tab", { name: "Solid" }).tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "Gradient" }).tabIndex).toBe(-1);
  });

  it("moves selection with arrow keys (selection follows focus)", () => {
    render(ui);
    const solid = screen.getByRole("tab", { name: "Solid" });
    act(() => solid.focus());
    fireEvent.keyDown(solid, { key: "ArrowRight" });
    const gradient = screen.getByRole("tab", { name: "Gradient" });
    expect(gradient).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(gradient);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("gradient pane");

    fireEvent.keyDown(gradient, { key: "ArrowLeft" });
    expect(solid).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("color pane");
  });
});

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { StopList } from "./stop-list";
import type { GradientStopEditorRenderer } from "../../contexts/gradient";
import { DEFAULT_LINEAR } from "../../lib/gradient";

// D7: StopList rows take their editor from the same slot the Bar uses, so the
// shared list never imports one dialect's editor (which would drag that
// dialect's Select into the other variant's install closure).
const probe: GradientStopEditorRenderer = ({ stopId, open, children }) => (
  <div data-testid={`editor-${stopId}`} data-open={open ? "true" : "false"}>
    {children}
  </div>
);

describe("GradientPicker.StopList stop-editor slot", () => {
  it("renders the injected editor around each row's swatch", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR} stopEditor={probe}>
        <StopList showAddStop={false} />
      </Root>,
    );
    const editors = screen.getAllByTestId(/^editor-/);
    expect(editors).toHaveLength(DEFAULT_LINEAR.stops.length);
    for (const editor of editors) {
      expect(
        editor.querySelector('[aria-label="Edit stop color"]'),
      ).not.toBeNull();
    }
  });

  it("toggles the injected editor's open state from the swatch", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR} stopEditor={probe}>
        <StopList showAddStop={false} />
      </Root>,
    );
    const editors = screen.getAllByTestId(/^editor-/);
    expect(editors[0]).toHaveAttribute("data-open", "false");
    fireEvent.click(screen.getAllByLabelText("Edit stop color")[0]);
    expect(screen.getAllByTestId(/^editor-/)[0]).toHaveAttribute(
      "data-open",
      "true",
    );
    // Second click closes it again — the swatch is a toggle, as before.
    fireEvent.click(screen.getAllByLabelText("Edit stop color")[0]);
    expect(screen.getAllByTestId(/^editor-/)[0]).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("renders bare swatches when no editor is injected", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <StopList showAddStop={false} />
      </Root>,
    );
    const swatches = screen.getAllByLabelText("Edit stop color");
    expect(swatches).toHaveLength(DEFAULT_LINEAR.stops.length);
    // Clicking still selects the row rather than throwing for a missing editor.
    fireEvent.click(swatches[0]);
    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

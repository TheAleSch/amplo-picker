import { describe, it, expect, beforeAll } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Bar } from "./bar";
import type { GradientStopEditorRenderer } from "../../contexts/gradient";
import { DEFAULT_LINEAR } from "../../lib/gradient";

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 16,
      width: 400, height: 16,
      toJSON() { return {}; },
    } as DOMRect;
  };
});

// D7: the Bar must not import the Radix stop editor. It renders whatever
// editor the barrel injected through the `stopEditor` slot, and degrades to
// bare handles when no editor is provided.
const probe: GradientStopEditorRenderer = ({ stopId, open, children }) => (
  <div data-testid={`editor-${stopId}`} data-open={open ? "true" : "false"}>
    {children}
  </div>
);

describe("GradientPicker.Bar stop-editor slot", () => {
  it("renders the injected editor around each stop handle", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR} stopEditor={probe}>
        <Bar editOnClick />
      </Root>,
    );
    const editors = screen.getAllByTestId(/^editor-/);
    expect(editors).toHaveLength(DEFAULT_LINEAR.stops.length);
    // The handle is the slot's child, not a sibling — the editor anchors to it.
    for (const editor of editors) {
      expect(editor.querySelector('[role="slider"]')).not.toBeNull();
    }
  });

  it("drives the injected editor's open state from a tap on a handle", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR} stopEditor={probe}>
        <Bar editOnClick />
      </Root>,
    );
    const handle = screen.getAllByRole("slider")[0];
    const stopId = handle.dataset.stopId!;
    expect(screen.getByTestId(`editor-${stopId}`)).toHaveAttribute(
      "data-open",
      "false",
    );
    // Tap = pointerdown/up with no movement (a drag keeps the editor closed).
    act(() => {
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 8, clientY: 8 });
    });
    expect(screen.getByTestId(`editor-${stopId}`)).toHaveAttribute(
      "data-open",
      "true",
    );
  });

  it("does not mount the editor when editOnClick is off", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR} stopEditor={probe}>
        <Bar />
      </Root>,
    );
    expect(screen.queryAllByTestId(/^editor-/)).toHaveLength(0);
    expect(screen.getAllByRole("slider")).toHaveLength(
      DEFAULT_LINEAR.stops.length,
    );
  });

  it("falls back to bare handles when no editor is injected", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar editOnClick />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    expect(handles).toHaveLength(DEFAULT_LINEAR.stops.length);
    // Tapping must stay inert rather than throw for a missing editor.
    act(() => {
      fireEvent.pointerDown(handles[0], { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 8, clientY: 8 });
    });
    expect(screen.getAllByRole("slider")).toHaveLength(
      DEFAULT_LINEAR.stops.length,
    );
  });
});

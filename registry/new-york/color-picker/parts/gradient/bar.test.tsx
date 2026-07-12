import { describe, it, expect, beforeAll } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Bar } from "./bar";
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

describe("GradientPicker.Bar", () => {
  it("renders a stop handle for each stop", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    expect(handles).toHaveLength(DEFAULT_LINEAR.stops.length);
  });

  it("ends a stop drag when the button was released outside the window", () => {
    // The drag listens on document without pointer capture, so a release
    // outside the browser window never delivers pointerup. On re-entry the
    // first pointermove arrives with buttons: 0 — the drag must end there
    // instead of letting the stop chase the cursor ("stuck drag").
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const handle = screen.getAllByRole("slider")[0];
    act(() => {
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 100, clientY: 8, buttons: 1 });
    });
    const afterDrag = handle.getAttribute("aria-valuenow");
    // Cursor re-enters with the button already up — this move must end the
    // drag and not reposition the stop…
    act(() => {
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 300, clientY: 8, buttons: 0 });
    });
    expect(handle.getAttribute("aria-valuenow")).toBe(afterDrag);
    // …and later stray moves must not touch it either.
    act(() => {
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 380, clientY: 8, buttons: 1 });
    });
    expect(handle.getAttribute("aria-valuenow")).toBe(afterDrag);
  });

  it("the selected handle has aria-current=true", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    const selected = handles.filter((h) => h.getAttribute("aria-current") === "true");
    expect(selected).toHaveLength(1);
  });
});

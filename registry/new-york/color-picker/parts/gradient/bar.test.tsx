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

  it("ignores document moves from other pointers (multi-touch)", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const handle = screen.getAllByRole("slider")[0];
    act(() => {
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
    });
    const before = handle.getAttribute("aria-valuenow");
    // Second finger sliding elsewhere must not move this stop, and its
    // buttons: 0 hover-move must not end the drag.
    act(() => {
      fireEvent.pointerMove(document, { pointerId: 2, clientX: 300, clientY: 8, buttons: 1 });
      fireEvent.pointerMove(document, { pointerId: 2, clientX: 320, clientY: 8, buttons: 0 });
      fireEvent.pointerUp(document, { pointerId: 2, clientX: 320, clientY: 8 });
    });
    expect(handle.getAttribute("aria-valuenow")).toBe(before);
    // Original pointer still drags.
    act(() => {
      fireEvent.pointerMove(document, { pointerId: 1, clientX: 200, clientY: 8, buttons: 1 });
    });
    expect(handle.getAttribute("aria-valuenow")).toBe("50");
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

describe("click-to-add on a positioned linear gradient", () => {
  it("adds the stop where the user clicked, extrapolating beyond the segment", () => {
    // Segment projected to displayed [0.25, 0.75]. A click at displayed 0.1
    // must land at authored (0.1 - 0.25) / 0.5 = -0.3 — not clamp onto the
    // first stop at authored 0.
    const positioned = {
      ...DEFAULT_LINEAR,
      start: { x: 0.25, y: 0.5 },
      end: { x: 0.75, y: 0.5 },
    };
    let latest = positioned;
    render(
      <Root
        defaultValue={positioned}
        onValueChange={(g) => {
          latest = g as typeof positioned;
        }}
      >
        <Bar />
      </Root>,
    );
    const track = document.querySelector(
      '[data-slot="gradient-bar"]',
    )!.firstElementChild as HTMLElement;
    fireEvent.pointerDown(track, { pointerId: 1, clientX: 40, clientY: 8, buttons: 1 });
    expect(latest.stops).toHaveLength(3);
    const added = [...latest.stops].sort((a, b) => a.position - b.position)[0];
    expect(added.position).toBeCloseTo(-0.3, 3);
  });
});

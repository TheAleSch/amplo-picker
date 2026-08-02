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

  it("focuses a clicked handle so Delete removes that stop", () => {
    // pointerDown calls preventDefault (to block text selection / native
    // drag), which also suppresses the focus the click would otherwise
    // give the handle. Without an explicit focus() the stop looks selected
    // but every key goes to <body>.
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const before = screen.getAllByRole("slider");
    const handle = before[0];
    act(() => {
      fireEvent.pointerDown(handle, { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
      fireEvent.pointerUp(document, { pointerId: 1, clientX: 8, clientY: 8 });
    });
    expect(document.activeElement).toBe(handle);

    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: "Delete" });
    });
    expect(screen.getAllByRole("slider")).toHaveLength(before.length - 1);
  });

  it("focuses a stop added by clicking the track, so Delete removes it", () => {
    // The click lands on the track, which isn't focusable — the new stop
    // would be selected but unreachable from the keyboard.
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const before = screen.getAllByRole("slider").length;
    const track = document.querySelector<HTMLElement>(
      '[data-slot="gradient-bar"] > div',
    )!;
    act(() => {
      fireEvent.pointerDown(track, { pointerId: 1, clientX: 200, clientY: 8, buttons: 1 });
    });
    const added = screen.getAllByRole("slider");
    expect(added).toHaveLength(before + 1);
    const active = document.activeElement as HTMLElement;
    expect(added).toContain(active);
    expect(active.getAttribute("aria-valuenow")).toBe("50");

    act(() => {
      fireEvent.keyDown(active, { key: "Delete" });
    });
    expect(screen.getAllByRole("slider")).toHaveLength(before);
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

// I-7 / I-8 (2026-07-25 adversarial review): the Bar's keyboard Delete removed
// the focused handle without first moving focus (unlike StopList, which calls
// focusNeighborOption), ejecting keyboard users to <body>. It also had no
// last-stop feedback, where the StopList's mouse affordance renders a disabled
// button. Neither the keydown handler nor drag-to-remove had any coverage.
describe("Bar keyboard stop editing", () => {
  const THREE = {
    ...DEFAULT_LINEAR,
    stops: [
      { position: 0, color: { l: 0.6, c: 0.2, h: 30, alpha: 1 } },
      { position: 0.5, color: { l: 0.7, c: 0.2, h: 150, alpha: 1 } },
      { position: 1, color: { l: 0.5, c: 0.2, h: 260, alpha: 1 } },
    ],
  };

  it("keeps focus inside the bar after deleting a stop", () => {
    render(
      <Root defaultValue={THREE}>
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    act(() => {
      handles[1].focus();
      fireEvent.keyDown(handles[1], { key: "Delete" });
    });

    expect(screen.getAllByRole("slider")).toHaveLength(2);
    // The focused node unmounted; focus must have moved to a sibling handle,
    // not fallen back to <body>.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.getAttribute("role")).toBe("slider");
  });

  it("removes via Backspace as well as Delete", () => {
    render(
      <Root defaultValue={THREE}>
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    act(() => {
      handles[0].focus();
      fireEvent.keyDown(handles[0], { key: "Backspace" });
    });
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("refuses to delete the last remaining stop and says so", () => {
    render(
      <Root
        defaultValue={{ ...DEFAULT_LINEAR, stops: [DEFAULT_LINEAR.stops[0]] }}
      >
        <Bar />
      </Root>,
    );
    const handle = screen.getByRole("slider");
    act(() => {
      handle.focus();
      fireEvent.keyDown(handle, { key: "Delete" });
    });
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    // Silent refusal is the defect — the Bar has no disabled affordance to
    // perceive, so it must announce instead.
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
  });

  it("nudges a stop with arrow keys, and further with shift", () => {
    const seen: number[][] = [];
    render(
      <Root
        defaultValue={THREE}
        onValueChange={(g) => seen.push(g.stops.map((s) => s.position))}
      >
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    act(() => {
      handles[1].focus();
      fireEvent.keyDown(handles[1], { key: "ArrowRight" });
    });
    expect(seen.at(-1)).toContainEqual(expect.closeTo(0.51, 5));

    act(() => {
      fireEvent.keyDown(screen.getAllByRole("slider")[1], {
        key: "ArrowLeft",
        shiftKey: true,
      });
    });
    expect(seen.at(-1)).toContainEqual(expect.closeTo(0.46, 5));
  });

  it("clamps keyboard nudges to the visible track", () => {
    const seen: number[][] = [];
    render(
      <Root
        defaultValue={THREE}
        onValueChange={(g) => seen.push(g.stops.map((s) => s.position))}
      >
        <Bar />
      </Root>,
    );
    act(() => {
      const handles = screen.getAllByRole("slider");
      handles[0].focus();
      // Already at 0 — arrowing left must not push it negative.
      fireEvent.keyDown(handles[0], { key: "ArrowLeft", shiftKey: true });
    });
    for (const positions of seen) {
      for (const p of positions) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });
});

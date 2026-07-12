import { describe, it, expect, beforeAll, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { Root } from "./root";
import { Area } from "./area";
import { Overlay } from "./overlay";
import { RadiusInput } from "./radius-input";
import { EllipseRadiiInput } from "./ellipse-radii-input";
import {
  DEFAULT_CONIC,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  type Gradient,
  type RadialGradient,
} from "../../lib/gradient";

class FakeResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: 400,
            height: 120,
            top: 0,
            left: 0,
            bottom: 120,
            right: 400,
            x: 0,
            y: 0,
            toJSON() {
              return {};
            },
          },
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  (globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver =
    FakeResizeObserver;
  const proto = HTMLElement.prototype;
  proto.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 400,
      bottom: 120,
      width: 400,
      height: 120,
      toJSON() {
        return {};
      },
    } as DOMRect;
  };
  if (!Element.prototype.setPointerCapture) {
    (Element.prototype as unknown as { setPointerCapture: () => void }).setPointerCapture =
      () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    (Element.prototype as unknown as {
      releasePointerCapture: () => void;
    }).releasePointerCapture = () => {};
  }
});

function Harness({
  initial,
  onChange,
}: {
  initial: Gradient;
  onChange: (g: Gradient) => void;
}) {
  const [g, setG] = React.useState<Gradient>(initial);
  return (
    <Root
      value={g}
      onValueChange={(next) => {
        setG(next);
        onChange(next);
      }}
    >
      <Area />
      <RadiusInput />
      <EllipseRadiiInput />
    </Root>
  );
}

describe("Area + radius inputs center-drag preserves explicit radius", () => {
  it("circle + typed radiusPx survives a center handle drag", () => {
    const initial: RadialGradient = {
      ...DEFAULT_RADIAL,
      shape: "circle",
      center: { x: 0.5, y: 0.5 },
    };
    let latest: Gradient = initial;
    render(
      <Harness
        initial={initial}
        onChange={(g) => {
          latest = g;
        }}
      />,
    );
    // Type 55 in the radius input — mimics the playground flow.
    const rInput = screen.getByLabelText(/circle radius/i) as HTMLInputElement;
    act(() => {
      fireEvent.change(rInput, { target: { value: "55" } });
    });
    expect((latest as RadialGradient).radiusPx).toBeCloseTo(
      (55 / 100) * 400,
      0,
    );
    // Now drag the center handle on the Area.
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerMove(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerUp(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
      });
    });
    const g = latest as RadialGradient;
    expect(g.shape).toBe("circle");
    expect(g.radiusPx).toBeCloseTo((55 / 100) * 400, 0);
  });

  it("center drag in keyword mode does NOT auto-promote to an explicit radiusPx", () => {
    // Repro for: r shows `auto` (keyword form, radiusPx undefined),
    // user drags the center on the Area, r jumps to a number like 91%.
    // The picker used to "lock" the keyword-derived size at drag-end —
    // that promote was unwanted; users expect drag-center to move ONLY
    // the center and leave keyword sizing alone.
    const initial: RadialGradient = {
      ...DEFAULT_RADIAL,
      shape: "circle",
      center: { x: 0.5, y: 0.5 },
    };
    let latest: Gradient = initial;
    render(
      <Harness
        initial={initial}
        onChange={(g) => {
          latest = g;
        }}
      />,
    );
    expect((latest as RadialGradient).radiusPx).toBeUndefined();
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerMove(center, {
        clientX: 100,
        clientY: 40,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerUp(center, {
        clientX: 100,
        clientY: 40,
        pointerId: 1,
      });
    });
    const g = latest as RadialGradient;
    expect(g.shape).toBe("circle");
    // Center moved.
    expect(g.center.x).toBeCloseTo(100 / 400, 3);
    // Critical: still in keyword mode. No silent promote.
    expect(g.radiusPx).toBeUndefined();
    expect(g.radii).toBeUndefined();
  });

  it("ellipse + typed radii survives a center handle drag", () => {
    const initial: RadialGradient = {
      ...DEFAULT_RADIAL,
      shape: "ellipse",
      center: { x: 0.5, y: 0.5 },
    };
    let latest: Gradient = initial;
    render(
      <Harness
        initial={initial}
        onChange={(g) => {
          latest = g;
        }}
      />,
    );
    // Type values in the two ellipse radii inputs.
    const xInput = screen.getByLabelText(
      /ellipse horizontal/i,
    ) as HTMLInputElement;
    const yInput = screen.getByLabelText(
      /ellipse vertical/i,
    ) as HTMLInputElement;
    act(() => {
      fireEvent.change(xInput, { target: { value: "50" } });
      fireEvent.change(yInput, { target: { value: "30" } });
    });
    const before = latest as RadialGradient;
    expect(before.radii).toEqual({ x: 0.5, y: 0.3 });
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerMove(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
        buttons: 1,});
      fireEvent.pointerUp(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
      });
    });
    const g = latest as RadialGradient;
    expect(g.shape).toBe("ellipse");
    expect(g.radii).toEqual({ x: 0.5, y: 0.3 });
  });
});

// A-6 (2026-07-12 audit): free-positioned linear endpoints moved x/y with
// arrows while exposing 1D slider semantics whose value stayed the angle.
// A-8: 2D handles (center, endpoints) were silent to SR under keyboard.
describe("Overlay handle semantics", () => {
  afterEach(() => vi.useRealTimers());

  it("angle-only linear: endpoint handle is a 1D angle slider", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Overlay />
      </Root>,
    );
    const start = screen.getByRole("slider", { name: "Gradient start" });
    expect(start).toHaveAttribute("aria-valuenow", "90");
  });

  it("free-positioned linear: endpoint handles are 2D pads, not angle sliders", () => {
    render(
      <Root
        defaultValue={{
          ...DEFAULT_LINEAR,
          start: { x: 0.2, y: 0.3 },
          end: { x: 0.8, y: 0.7 },
        }}
      >
        <Overlay />
      </Root>,
    );
    const start = screen.getByLabelText(/^Gradient start/);
    expect(start).toHaveAttribute("role", "application");
    expect(start).not.toHaveAttribute("aria-valuenow");
    expect(start.getAttribute("aria-label")).toMatch(/x 20%.*y 30%/);
  });

  it("announces center moves in a live region (radial)", () => {
    vi.useFakeTimers();
    render(
      <Root defaultValue={DEFAULT_RADIAL}>
        <Overlay />
      </Root>,
    );
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      center.focus();
      fireEvent.keyDown(center, { key: "ArrowRight" });
    });
    act(() => {
      vi.runAllTimers();
    });
    const live = document.querySelector(
      '[data-slot="gradient-overlay"] [aria-live="polite"]',
    );
    expect(live).not.toBeNull();
    expect(live!.textContent).toMatch(/x 51%/);
  });
});

describe("Overlay drag self-heal (stuck conic drag)", () => {
  it("ends a center drag when a move arrives with no buttons pressed", () => {
    let latest: Gradient = DEFAULT_CONIC;
    render(
      <Root
        defaultValue={DEFAULT_CONIC}
        onValueChange={(g) => {
          latest = g;
        }}
      >
        <Overlay />
      </Root>,
    );
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, { pointerId: 1, clientX: 200, clientY: 60, buttons: 1 });
      fireEvent.pointerMove(center, { pointerId: 1, clientX: 240, clientY: 60, buttons: 1 });
    });
    const afterDrag =
      latest.type === "conic" ? latest.center.x : NaN;
    expect(afterDrag).toBeCloseTo(240 / 400, 3);
    // Button already released (missed pointerup) — this move must end the
    // drag, not keep dragging the center.
    act(() => {
      fireEvent.pointerMove(center, { pointerId: 1, clientX: 320, clientY: 60, buttons: 0 });
    });
    expect(latest.type === "conic" ? latest.center.x : NaN).toBeCloseTo(afterDrag, 6);
    act(() => {
      fireEvent.pointerMove(center, { pointerId: 1, clientX: 360, clientY: 60, buttons: 1 });
    });
    expect(latest.type === "conic" ? latest.center.x : NaN).toBeCloseTo(afterDrag, 6);
  });

  it("ignores moves and releases from other pointers (multi-touch)", () => {
    let latest: Gradient = DEFAULT_CONIC;
    render(
      <Root
        defaultValue={DEFAULT_CONIC}
        onValueChange={(g) => {
          latest = g;
        }}
      >
        <Overlay />
      </Root>,
    );
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, { pointerId: 1, clientX: 200, clientY: 60, buttons: 1 });
    });
    // A second finger moving over the handle must not steer the drag…
    act(() => {
      fireEvent.pointerMove(center, { pointerId: 2, clientX: 320, clientY: 60, buttons: 1 });
    });
    expect(latest.type === "conic" ? latest.center.x : NaN).toBeCloseTo(0.5, 3);
    // …a second finger lifting (buttons 0 / pointerup) must not end it…
    act(() => {
      fireEvent.pointerMove(center, { pointerId: 2, clientX: 320, clientY: 60, buttons: 0 });
      fireEvent.pointerUp(center, { pointerId: 2, clientX: 320, clientY: 60 });
    });
    // …and the original pointer keeps dragging.
    act(() => {
      fireEvent.pointerMove(center, { pointerId: 1, clientX: 240, clientY: 60, buttons: 1 });
    });
    expect(latest.type === "conic" ? latest.center.x : NaN).toBeCloseTo(240 / 400, 3);
  });

  it("cleans up when pointer capture is lost (window blur mid-drag)", () => {
    let latest: Gradient = DEFAULT_CONIC;
    render(
      <Root
        defaultValue={DEFAULT_CONIC}
        onValueChange={(g) => {
          latest = g;
        }}
      >
        <Overlay />
      </Root>,
    );
    const center = screen.getByLabelText(/^Gradient center/);
    act(() => {
      fireEvent.pointerDown(center, { pointerId: 1, clientX: 200, clientY: 60, buttons: 1 });
      fireEvent(center, new Event("lostpointercapture"));
      fireEvent.pointerMove(center, { pointerId: 1, clientX: 320, clientY: 60, buttons: 1 });
    });
    expect(latest.type === "conic" ? latest.center.x : NaN).toBeCloseTo(0.5, 3);
  });
});

describe("linear overlay shows endpoints only", () => {
  const positioned: Gradient = {
    ...DEFAULT_LINEAR,
    start: { x: 0.25, y: 0.5 },
    end: { x: 0.75, y: 0.5 },
    stops: [
      { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
      { color: { l: 0.5, c: 0, h: 0, alpha: 1 }, position: 0.5 },
      { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
    ],
  };
  it("renders no middle-stop handles — the Bar owns inner-stop editing", () => {
    render(
      <Root value={positioned}>
        <Overlay />
      </Root>,
    );
    expect(screen.queryByLabelText(/^Gradient stop at/)).toBeNull();
    expect(screen.getByLabelText(/^Gradient start/)).toBeTruthy();
    expect(screen.getByLabelText(/^Gradient end/)).toBeTruthy();
  });
});

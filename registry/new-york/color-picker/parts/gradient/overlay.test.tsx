import { describe, it, expect, beforeAll } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { Root } from "./root";
import { Area } from "./area";
import { RadialShape } from "./radial-shape";
import {
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
      <RadialShape />
    </Root>
  );
}

describe("Area + RadialShape center-drag preserves explicit radius", () => {
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
    const center = screen.getByLabelText("Gradient center");
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
      });
      fireEvent.pointerMove(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
      });
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
    const center = screen.getByLabelText("Gradient center");
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
      });
      fireEvent.pointerMove(center, {
        clientX: 100,
        clientY: 40,
        pointerId: 1,
      });
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
    const center = screen.getByLabelText("Gradient center");
    act(() => {
      fireEvent.pointerDown(center, {
        clientX: 200,
        clientY: 60,
        pointerId: 1,
      });
      fireEvent.pointerMove(center, {
        clientX: 240,
        clientY: 80,
        pointerId: 1,
      });
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

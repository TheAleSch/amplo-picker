import { describe, expect, it } from "vitest";
import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { Root } from "./root";
import { CssInput } from "./css-input";
import { DEFAULT_LINEAR, formatGradient, type Gradient } from "../../lib/gradient";

const OTHER: Gradient = {
  ...DEFAULT_LINEAR,
  angle: 45,
  stops: [
    { position: 0, color: { l: 0.8, c: 0.15, h: 90, alpha: 1 } },
    { position: 1, color: { l: 0.3, c: 0.15, h: 300, alpha: 1 } },
  ],
};

/** Controlled harness exposing an "external" update the input didn't cause. */
function Harness({
  onChange,
}: {
  onChange?: (g: Gradient) => void;
}) {
  const [gradient, setGradient] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <>
      <Root
        value={gradient}
        onValueChange={(g) => {
          setGradient(g);
          onChange?.(g);
        }}
      >
        <CssInput />
      </Root>
      <button onClick={() => setGradient(OTHER)}>external update</button>
    </>
  );
}

// I-4 (2026-07-25 adversarial review): the render-time sync marked an incoming
// gradient "consumed" even when it skipped updating the draft because the
// field was focused, and never re-synced. Blurring afterwards committed the
// stale draft over the newer value the user never edited.
describe("gradient CssInput external-update safety", () => {
  const input = () => screen.getByLabelText("Gradient CSS") as HTMLInputElement;

  it("does not revert an external update when blurred without typing", () => {
    const seen: Gradient[] = [];
    render(<Harness onChange={(g) => seen.push(g)} />);

    act(() => input().focus());
    // Something else changes the gradient while the field merely has focus.
    act(() => {
      fireEvent.click(screen.getByText("external update"));
    });
    // User blurs without having typed anything.
    act(() => {
      fireEvent.blur(input());
    });

    // The stale draft must not have been committed back over OTHER.
    expect(seen).toHaveLength(0);
    expect(input().value).toBe(formatGradient(OTHER));
  });

  it("still shows the external update in the field once focus leaves", () => {
    render(<Harness />);
    act(() => input().focus());
    act(() => {
      fireEvent.click(screen.getByText("external update"));
    });
    act(() => {
      fireEvent.blur(input());
    });
    expect(input().value).toBe(formatGradient(OTHER));
  });

  it("still commits a real edit on blur", () => {
    const seen: Gradient[] = [];
    render(<Harness onChange={(g) => seen.push(g)} />);
    act(() => input().focus());
    act(() => {
      fireEvent.change(input(), {
        target: { value: "linear-gradient(90deg, #f00 0%, #00f 100%)" },
      });
    });
    act(() => {
      fireEvent.blur(input());
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].stops).toHaveLength(2);
  });

  it("marks an unparseable edit invalid instead of committing it", () => {
    const seen: Gradient[] = [];
    render(<Harness onChange={(g) => seen.push(g)} />);
    act(() => input().focus());
    act(() => {
      fireEvent.change(input(), { target: { value: "not a gradient" } });
    });
    act(() => {
      fireEvent.blur(input());
    });
    expect(seen).toHaveLength(0);
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  it("lets the user's own in-progress edit win over a concurrent external update", () => {
    // The complement of the first test: once the user *has* typed, their
    // text is the intent and must survive to commit.
    const seen: Gradient[] = [];
    render(<Harness onChange={(g) => seen.push(g)} />);
    act(() => input().focus());
    act(() => {
      fireEvent.change(input(), {
        target: { value: "linear-gradient(90deg, #0f0 0%, #000 100%)" },
      });
    });
    act(() => {
      fireEvent.click(screen.getByText("external update"));
    });
    act(() => {
      fireEvent.blur(input());
    });
    expect(seen).toHaveLength(1);
  });
});

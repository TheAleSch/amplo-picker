import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Area } from "./area";

// A-1 (2026-07-12 audit): role="application" has no implicit value semantics,
// so keyboard adjustments were silent to screen readers. The area must expose
// a polite live region that re-announces the value text after a change.
describe("Area screen-reader announcements", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the new value in a polite live region after a keyboard move", () => {
    vi.useFakeTimers();
    render(
      <Root defaultValue="oklch(0.7 0.18 120)">
        <Area />
      </Root>,
    );
    const area = screen.getByRole("application");
    const live = area.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();

    act(() => {
      area.focus();
      fireEvent.keyDown(area, { key: "ArrowUp" });
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(live!.textContent).toMatch(/Lightness \d+ percent/);
  });
});

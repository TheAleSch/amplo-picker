import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { Root as FillRoot } from "./root";
import { Tabs as FillTabs, Tab as FillTab } from "./tabs";
import { Pane as FillPane } from "./pane";
import { StopColor } from "../gradient/stop-color";
import { Area } from "../area";
import { DEFAULT_LINEAR, type Fill } from "../../lib/gradient";
import { parseColor } from "../../lib/color";

// Regression test for the Maximum-update-depth loop that fired when
// FillPicker rendered the gradient pane with a controlled fill value:
// every render of <GradientPicker.Root> handed Bound a fresh OklchColor
// reference for the selected stop, which made <ColorPicker.Area>'s
// `[color]` effect treat every commit as a color change.
describe("FillPicker → gradient pane → StopColor → Area", () => {
  it("does not enter a render loop when controlled and rendering Area inside StopColor", async () => {
    const initialFill: Fill = {
      kind: "color",
      color: parseColor("oklch(0.7 0.18 30)")!,
    };

    let renders = 0;
    function Harness() {
      const [fill, setFill] = React.useState<Fill>(initialFill);
      renders++;
      return (
        <FillRoot value={fill} onValueChange={setFill}>
          <FillTabs>
            <FillTab mode="color">Solid</FillTab>
            <FillTab mode="gradient">Gradient</FillTab>
          </FillTabs>
          <FillPane mode="color" />
          <FillPane mode="gradient">
            <StopColor>
              <Area />
            </StopColor>
          </FillPane>
        </FillRoot>
      );
    }

    const { container } = render(<Harness />);

    // Switch to gradient tab — this is the path that previously looped.
    const gradTab = container.querySelector(
      'button[data-state][aria-pressed], button[role="tab"], button',
    );
    // Just trigger setMode via the gradient tab button (Tab's onClick wires it).
    const buttons = container.querySelectorAll("button");
    const gradient = Array.from(buttons).find((b) => b.textContent === "Gradient");
    expect(gradient).toBeTruthy();

    const before = renders;
    await act(async () => {
      gradient!.click();
      // Yield twice so React processes any cascade of effect-triggered renders.
      await Promise.resolve();
      await Promise.resolve();
    });

    // After the tab switch + initial mount of GradientPicker + StopColor + Area,
    // the parent should settle in O(1) renders, not in dozens. The loop bug
    // produced 25+ before React bailed; a healthy cascade is ≤ 6.
    expect(renders - before).toBeLessThan(10);

    // Sanity: gradient pane rendered (we should have an Area canvas).
    expect(container.querySelector('[data-slot="color-picker-area"]')).toBeTruthy();
    void gradTab;
  });
});

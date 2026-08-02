import { describe, expect, it } from "vitest";
import * as React from "react";
import { render } from "@testing-library/react";

import { Root } from "@/registry/new-york/ui/fill-picker/parts/root";
import { Hue } from "./hue";
import { Alpha } from "./alpha";
import { Lightness } from "./lightness";

// I-3 (2026-07-25 adversarial review): all three of these are forwardRef
// components that destructured `ref` and never attached it, so a consumer's
// ref silently stayed null forever. ESLint flagged the unused arg; nothing
// asserted the behavior.
describe("fill-picker-base sliders forward their ref", () => {
  const cases = [
    ["Hue", Hue],
    ["Alpha", Alpha],
    ["Lightness", Lightness],
  ] as const;

  for (const [name, Component] of cases) {
    it(`<${name}> attaches the forwarded ref to a real element`, () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Root defaultValue="oklch(0.6 0.15 240)">
          <Component ref={ref} />
        </Root>,
      );
      expect(ref.current).toBeInstanceOf(HTMLElement);
      // And it must point at the slider itself, not some detached node.
      expect(ref.current!.isConnected).toBe(true);
    });
  }

  it("the forwarded ref resolves to the part's own data-slot element", () => {
    const hue = React.createRef<HTMLDivElement>();
    const alpha = React.createRef<HTMLDivElement>();
    const lightness = React.createRef<HTMLDivElement>();
    render(
      <Root defaultValue="oklch(0.6 0.15 240)">
        <Hue ref={hue} />
        <Alpha ref={alpha} />
        <Lightness ref={lightness} />
      </Root>,
    );
    expect(hue.current!.dataset.slot).toBe("color-picker-hue");
    expect(alpha.current!.dataset.slot).toBe("color-picker-alpha");
    expect(lightness.current!.dataset.slot).toBe("color-picker-lightness");
  });
});

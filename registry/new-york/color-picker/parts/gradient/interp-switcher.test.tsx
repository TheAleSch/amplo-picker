import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GradientPicker } from "../../fill-picker";
import { DEFAULT_LINEAR } from "../../lib/gradient";
import { GRADIENT_INTERP_OPTIONS } from "../../lib/gradient-options";

const labelFor = (value: string) =>
  GRADIENT_INTERP_OPTIONS.find((o) => o.value === value)!.label;

// Regression guard for the portability invariant: the options must stay
// literal <SelectItem> elements with a bare-string child, so both Select
// dialects can derive the closed trigger's label (Radix mirrors ItemText into
// the trigger; the shadcn Base wrapper walks children to build its
// value→label map). Reintroducing a row wrapper component — the ⓘ tooltip row
// this file used to have — hides the items from that walk and blanks the
// trigger, and in a pure-Radix install would mirror the icon subtree into it.
// Verified by mutation: swapping the map back to a wrapper component fails
// both assertions.
describe("<GradientPicker.InterpSwitcher>", () => {
  it("renders the default interpolation label on the closed trigger", () => {
    render(
      <GradientPicker.Root>
        <GradientPicker.InterpSwitcher />
      </GradientPicker.Root>,
    );
    const trigger = screen.getByLabelText("Interpolation space");
    expect(trigger).toHaveTextContent(labelFor(DEFAULT_LINEAR.interp));
  });

  it("derives the label, not the raw value, from the item children", () => {
    render(
      <GradientPicker.Root
        defaultValue={{ ...DEFAULT_LINEAR, interp: "hsl-longer" }}
      >
        <GradientPicker.InterpSwitcher />
      </GradientPicker.Root>,
    );
    // "hsl-longer" → "HSL (longer hue)": the trigger can only show this if the
    // item's string child was picked up, so a raw value echo can't pass.
    const trigger = screen.getByLabelText("Interpolation space");
    expect(trigger).toHaveTextContent(labelFor("hsl-longer"));
  });
});

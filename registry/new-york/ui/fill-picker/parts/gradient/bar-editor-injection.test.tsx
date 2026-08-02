import { describe, it, expect, beforeAll } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { GradientPicker, FillPicker } from "../../fill-picker";
import {
  GradientPickerBase,
  FillPickerBase,
} from "@/registry/new-york/ui/fill-picker-base/fill";
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

function tapFirstHandle() {
  const handle = screen.getAllByRole("slider")[0];
  act(() => {
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 8, clientY: 8, buttons: 1 });
    fireEvent.pointerUp(document, { pointerId: 1, clientX: 8, clientY: 8 });
  });
}

// D7: the Bar no longer imports an editor — each barrel injects its variant's
// one. These guard that every public entry point still opens an editor on tap
// (the two gradient Roots, and the two FillPicker Panes, which build the
// gradient state themselves instead of going through GradientPicker.Root).
describe("stop-editor injection through the barrels", () => {
  it("GradientPicker.Root (Radix) opens the stop editor on tap", async () => {
    render(
      <GradientPicker.Root defaultValue={DEFAULT_LINEAR}>
        <GradientPicker.Bar editOnClick />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText("Color format")).not.toBeInTheDocument();
    tapFirstHandle();
    expect(await screen.findByLabelText("Color format")).toBeInTheDocument();
  });

  it("GradientPickerBase.Root opens the stop editor on tap", async () => {
    render(
      <GradientPickerBase.Root defaultValue={DEFAULT_LINEAR}>
        <GradientPickerBase.Bar editOnClick />
      </GradientPickerBase.Root>,
    );
    tapFirstHandle();
    expect(await screen.findByLabelText("Color format")).toBeInTheDocument();
  });

  it("FillPicker.Pane (Radix) opens the stop editor on tap", async () => {
    render(
      <FillPicker.Root defaultValue={{ kind: "gradient", gradient: DEFAULT_LINEAR }}>
        <FillPicker.Pane mode="gradient">
          <GradientPicker.Bar editOnClick />
        </FillPicker.Pane>
      </FillPicker.Root>,
    );
    tapFirstHandle();
    expect(await screen.findByLabelText("Color format")).toBeInTheDocument();
  });

  it("FillPickerBase.Pane opens the stop editor on tap", async () => {
    render(
      <FillPickerBase.Root defaultValue={{ kind: "gradient", gradient: DEFAULT_LINEAR }}>
        <FillPickerBase.Pane mode="gradient">
          <GradientPickerBase.Bar editOnClick />
        </FillPickerBase.Pane>
      </FillPickerBase.Root>,
    );
    tapFirstHandle();
    expect(await screen.findByLabelText("Color format")).toBeInTheDocument();
  });
});

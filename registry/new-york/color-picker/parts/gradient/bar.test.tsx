import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Root } from "./root";
import { Bar } from "./bar";
import { DEFAULT_LINEAR } from "../../lib/gradient";

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

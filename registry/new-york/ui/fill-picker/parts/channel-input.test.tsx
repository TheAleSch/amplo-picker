import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Root } from "./root";
import { ChannelInput } from "./channel-input";

describe("ChannelInput (classic) numeric field", () => {
  // Typing past a channel's range commits the clamped value; when that value
  // is already current, the display string doesn't change, so the draft used
  // to keep showing the out-of-range text ("999") instead of the real value.
  it("resyncs the draft after a clamped commit that leaves the value unchanged", () => {
    render(
      <Root defaultValue="rgb(255 0 0)" defaultFormat="rgb">
        <ChannelInput showFormat={false} />
      </Root>,
    );
    const r = screen.getByLabelText("R");
    expect(r).toHaveValue("255");
    fireEvent.change(r, { target: { value: "999" } });
    fireEvent.keyDown(r, { key: "Enter" });
    expect(r).toHaveValue("255");
  });
});

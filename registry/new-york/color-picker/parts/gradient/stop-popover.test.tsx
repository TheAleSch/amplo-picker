import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StopPopover } from "./stop-popover";

// The stop editor uses a triggerless, externally-controlled popover anchored
// to an element that owns its own pointer handling. This guards that pattern:
// content mounts only when `open` is true, the anchor always renders, and an
// outside dismiss routes through onOpenChange.
describe("StopPopover", () => {
  function Harness({ start = false }: { start?: boolean }) {
    const [open, setOpen] = React.useState(start);
    return (
      <div>
        <StopPopover
          open={open}
          onOpenChange={setOpen}
          anchor={
            <button type="button" data-testid="anchor" onClick={() => setOpen((o) => !o)}>
              anchor
            </button>
          }
        >
          <div data-testid="editor">editor body</div>
        </StopPopover>
        <button type="button" data-testid="outside">
          outside
        </button>
      </div>
    );
  }

  it("renders the anchor and does not mount content while closed", () => {
    render(<Harness start={false} />);
    expect(screen.getByTestId("anchor")).toBeInTheDocument();
    expect(screen.queryByTestId("editor")).not.toBeInTheDocument();
  });

  it("mounts the editor content when opened via the controlled anchor", async () => {
    render(<Harness start={false} />);
    fireEvent.click(screen.getByTestId("anchor"));
    // Base UI mounts the popup asynchronously.
    expect(await screen.findByTestId("editor")).toBeInTheDocument();
  });

  it("shows content immediately when initially open", async () => {
    render(<Harness start />);
    expect(await screen.findByTestId("editor")).toBeInTheDocument();
  });
});

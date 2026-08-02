import { describe, expect, it, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

import { useColorPickerContext } from "./context";
import { useGradientPickerContext } from "./contexts/gradient";
import { useFillPickerContext } from "./contexts/fill";
import { Root } from "./parts/root";

// T-5 (2026-07-25 adversarial review): CLAUDE.md calls out the
// "throws if rendered outside Root" guard as an invariant to preserve, but no
// test anywhere referenced it — replacing the throw with a silent `null`
// return kept the suite green while every part would then crash on a property
// access somewhere deeper and less legibly.
describe("context guards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderOutsideRoot = (useCtx: () => unknown) => {
    // React logs the error-boundary trace on a render throw; silence it so
    // the expected failure doesn't read as a broken test.
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Consumer() {
      useCtx();
      return null;
    }
    return () => render(<Consumer />);
  };

  it("useColorPickerContext throws outside <ColorPicker.Root>", () => {
    expect(renderOutsideRoot(useColorPickerContext)).toThrow(
      /must be rendered inside/i,
    );
  });

  it("useGradientPickerContext throws outside <GradientPicker.Root>", () => {
    expect(renderOutsideRoot(useGradientPickerContext)).toThrow();
  });

  it("useFillPickerContext throws outside <FillPicker.Root>", () => {
    expect(renderOutsideRoot(useFillPickerContext)).toThrow();
  });

  it("does not throw inside <ColorPicker.Root>", () => {
    let seen: unknown = null;
    function Consumer() {
      seen = useColorPickerContext();
      return null;
    }
    expect(() =>
      render(
        <Root defaultValue="#336699">
          <Consumer />
        </Root>,
      ),
    ).not.toThrow();
    expect(seen).not.toBeNull();
  });
});

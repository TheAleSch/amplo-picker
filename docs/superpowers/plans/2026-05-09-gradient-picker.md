# Gradient Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gradient tab to the picker via a new `FillPicker` shell that composes the existing `ColorPicker` parts with a new `GradientPicker` namespace, preserving the project's compose-only / OKLCH-canonical design.

**Architecture:** Three barrels (`ColorPicker`, `GradientPicker`, `FillPicker`). One `ColorPickerContext` mounted in three independent sibling sites: `<ColorPicker.Root>` (unchanged), `<FillPicker.Pane mode="color">`, and `<GradientPicker.StopColor>`. Internal value is a structured `Fill = { kind: "color"; color } | { kind: "gradient"; gradient }`; CSS strings are derived via `formatFill` / `formatGradient`. Stops have stable internal ids assigned by `useGradientPicker` and stripped on emit.

**Tech Stack:** React 19, Next.js 15 (App Router), Tailwind v4, TypeScript strict, `culori`, Vitest + happy-dom + @testing-library/react.

**Spec:** [docs/superpowers/specs/2026-05-09-gradient-picker-design.md](../specs/2026-05-09-gradient-picker-design.md)

**Branch:** `feat/gradient-picker` (already created and pushed)

---

## Conventions

- All new code lives under `registry/new-york/color-picker/` (the publishable component root). The barrel `fill-picker.tsx` re-exports namespaces.
- Path aliases: `@/*` → `src/*`, `@/registry/*` → `registry/*`. Use `@/registry/new-york/color-picker/...` when importing from the demo site, relative paths within the registry.
- Tests live alongside source as `*.test.ts` / `*.test.tsx`.
- Each task ends with a commit. Commit messages follow existing repo style (see `git log --oneline`): `Area: ...`, `Picker: ...`, `Docs: ...`. For new namespaces use `Gradient: ...`, `Fill: ...`.
- Run `pnpm typecheck` and `pnpm test` after each task. Both must pass before commit.
- Memory rule reminder: this branch is `feat/gradient-picker`, so commits stay on the branch — do **not** push to `main`. Push the branch periodically with `git push`.

---

## File Structure

### New files

```text
registry/new-york/color-picker/
  lib/
    gradient.ts                   ← types + parse/format helpers
    gradient.test.ts
  hooks/
    use-gradient-picker.ts        ← gradient state machine, stop ids, selected stop
    use-gradient-picker.test.ts
    use-fill-picker.ts            ← mode + value bridge
    use-fill-picker.test.ts
  contexts/
    fill.ts                       ← FillPickerContext
    gradient.ts                   ← GradientPickerContext
  parts/fill/
    root.tsx
    tabs.tsx                      ← Tabs + Tab
    pane.tsx                      ← Pane (renders gated by mode)
  parts/gradient/
    root.tsx
    bar.tsx
    type-switcher.tsx
    angle-dial.tsx
    center-pad.tsx
    radial-shape.tsx
    stop-list.tsx
    stop-color.tsx
    interp-switcher.tsx
    presets.tsx
    css-input.tsx
    bar.test.tsx                  ← keyboard + pointer behaviour
  fill-picker.tsx                 ← new barrel: { Color, Gradient, Fill }
```

### Modified files

```text
registry/new-york/color-picker/context.tsx       ← no change required (kept for compat)
registry.json                                    ← add new file entries
src/app/docs/page.tsx                            ← add Gradient picker section with three recipes
```

### Files explicitly NOT touched

```text
registry/new-york/color-picker/parts/root.tsx    ← unchanged (back-compat sibling mount)
registry/new-york/color-picker/color-picker.tsx  ← unchanged
registry/new-york/color-picker/hooks/use-color-picker.ts ← unchanged
src/components/hero.tsx                          ← unchanged (color-only stays color-only)
```

---

## Task 1: Gradient types

**Files:**
- Create: `registry/new-york/color-picker/lib/gradient.ts`

- [ ] **Step 1: Create the types file**

Create `registry/new-york/color-picker/lib/gradient.ts` with the data model defined in the spec:

```ts
import type { OklchColor } from "./types";

export type GradientType = "linear" | "radial" | "conic";

export type GradientInterp =
  | "oklch"
  | "oklab"
  | "srgb"
  | "hsl"
  | "hsl-longer";

export interface GradientStop {
  color: OklchColor;
  /** 0..1 along the gradient axis. */
  position: number;
  /** Optional CSS midpoint hint, 0..1. */
  hint?: number;
}

export interface LinearGradient {
  type: "linear";
  /** Degrees, 0..360. */
  angle: number;
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface RadialGradient {
  type: "radial";
  shape: "circle" | "ellipse";
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  size: "closest-side" | "farthest-corner";
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface ConicGradient {
  type: "conic";
  /** Degrees. */
  startAngle: number;
  /** Normalized 0..1 in each axis. */
  center: { x: number; y: number };
  stops: GradientStop[];
  interp: GradientInterp;
}

export type Gradient = LinearGradient | RadialGradient | ConicGradient;

export type ColorFill = { kind: "color"; color: OklchColor };
export type GradientFill = { kind: "gradient"; gradient: Gradient };
export type Fill = ColorFill | GradientFill;

export const DEFAULT_LINEAR: LinearGradient = {
  type: "linear",
  angle: 90,
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

export const DEFAULT_RADIAL: RadialGradient = {
  type: "radial",
  shape: "circle",
  center: { x: 0.5, y: 0.5 },
  size: "farthest-corner",
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};

export const DEFAULT_CONIC: ConicGradient = {
  type: "conic",
  startAngle: 0,
  center: { x: 0.5, y: 0.5 },
  interp: "oklch",
  stops: [
    { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
    { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
  ],
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/lib/gradient.ts
git commit -m "Gradient: add Fill / Gradient data model + sensible defaults"
```

---

## Task 2: `formatGradient` helper

**Files:**
- Modify: `registry/new-york/color-picker/lib/gradient.ts`
- Create: `registry/new-york/color-picker/lib/gradient.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `registry/new-york/color-picker/lib/gradient.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  formatGradient,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type LinearGradient,
} from "./gradient";

describe("formatGradient", () => {
  it("emits a linear gradient with `in oklch` and degree angle", () => {
    expect(formatGradient(DEFAULT_LINEAR)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits stop hints between adjacent stops", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      stops: [
        { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 0 },
        { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1, hint: 0.3 },
      ],
    };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0) 0%, 30%, oklch(0 0 0) 100%)",
    );
  });

  it("emits a radial gradient with shape, size, center", () => {
    expect(formatGradient(DEFAULT_RADIAL)).toBe(
      "radial-gradient(circle farthest-corner at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits a conic gradient with start angle and center", () => {
    expect(formatGradient(DEFAULT_CONIC)).toBe(
      "conic-gradient(from 0deg at 50% 50% in oklch, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("respects custom interpolation space", () => {
    const g: LinearGradient = { ...DEFAULT_LINEAR, interp: "hsl-longer" };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in hsl longer hue 90deg, oklch(1 0 0) 0%, oklch(0 0 0) 100%)",
    );
  });

  it("emits alpha when stop alpha < 1", () => {
    const g: LinearGradient = {
      ...DEFAULT_LINEAR,
      stops: [
        { color: { l: 1, c: 0, h: 0, alpha: 0.5 }, position: 0 },
        { color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 1 },
      ],
    };
    expect(formatGradient(g)).toBe(
      "linear-gradient(in oklch 90deg, oklch(1 0 0 / 0.5) 0%, oklch(0 0 0) 100%)",
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts`
Expected: FAIL with `formatGradient is not a function` (or similar import error).

- [ ] **Step 3: Implement `formatGradient`**

Append to `registry/new-york/color-picker/lib/gradient.ts`:

```ts
import { formatColor } from "./color";

function trim(n: number, digits = 4): string {
  return Number(n.toFixed(digits)).toString();
}

const formatStopColor = (c: OklchColor): string => formatColor(c, "oklch");

function formatStops(stops: GradientStop[]): string {
  const parts: string[] = [];
  stops.forEach((s, i) => {
    parts.push(`${formatStopColor(s.color)} ${trim(s.position * 100)}%`);
    if (s.hint !== undefined && i < stops.length - 1) {
      parts.push(`${trim(s.hint * 100)}%`);
    }
  });
  return parts.join(", ");
}

function formatInterp(interp: GradientInterp): string {
  if (interp === "hsl-longer") return "hsl longer hue";
  return interp;
}

export function formatGradient(g: Gradient): string {
  const interp = `in ${formatInterp(g.interp)}`;
  if (g.type === "linear") {
    return `linear-gradient(${interp} ${trim(g.angle)}deg, ${formatStops(g.stops)})`;
  }
  if (g.type === "radial") {
    const shape = `${g.shape} ${g.size}`;
    const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
    return `radial-gradient(${shape} ${center} ${interp}, ${formatStops(g.stops)})`;
  }
  // conic
  const center = `at ${trim(g.center.x * 100)}% ${trim(g.center.y * 100)}%`;
  return `conic-gradient(from ${trim(g.startAngle)}deg ${center} ${interp}, ${formatStops(g.stops)})`;
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add registry/new-york/color-picker/lib/gradient.ts \
        registry/new-york/color-picker/lib/gradient.test.ts
git commit -m "Gradient: formatGradient (in oklch by default, alpha + hints)"
```

---

## Task 3: `parseGradient` helper

**Files:**
- Modify: `registry/new-york/color-picker/lib/gradient.ts`
- Modify: `registry/new-york/color-picker/lib/gradient.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `registry/new-york/color-picker/lib/gradient.test.ts`:

```ts
import { parseGradient } from "./gradient";

describe("parseGradient", () => {
  it("round-trips a default linear gradient", () => {
    const css = formatGradient(DEFAULT_LINEAR);
    const parsed = parseGradient(css);
    expect(parsed).toEqual(DEFAULT_LINEAR);
  });

  it("round-trips a radial gradient", () => {
    const css = formatGradient(DEFAULT_RADIAL);
    expect(parseGradient(css)).toEqual(DEFAULT_RADIAL);
  });

  it("round-trips a conic gradient", () => {
    const css = formatGradient(DEFAULT_CONIC);
    expect(parseGradient(css)).toEqual(DEFAULT_CONIC);
  });

  it("returns null for non-gradient input", () => {
    expect(parseGradient("oklch(0.5 0.1 30)")).toBeNull();
    expect(parseGradient("not a gradient")).toBeNull();
  });

  it("parses hex stops as OKLCH", () => {
    const parsed = parseGradient("linear-gradient(90deg, #ffffff 0%, #000000 100%)");
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("linear");
    expect(parsed!.stops).toHaveLength(2);
    expect(parsed!.stops[0].position).toBe(0);
    expect(parsed!.stops[1].position).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts -t parseGradient`
Expected: FAIL — `parseGradient` not exported.

- [ ] **Step 3: Implement `parseGradient`**

Append to `registry/new-york/color-picker/lib/gradient.ts`:

```ts
import { parseColor } from "./color";

const FN_RE = /^(linear|radial|conic)-gradient\((.*)\)$/is;

function splitTopLevel(input: string): string[] {
  // Split on commas that are not inside parentheses.
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function parseInterp(prefix: string): { interp: GradientInterp; rest: string } {
  // Looks for `in <space>[ longer hue]` at start; consumes up to next non-interp token.
  const m = prefix.match(/^in\s+([a-z0-9-]+)(?:\s+longer\s+hue)?\s*/i);
  if (!m) return { interp: "oklch", rest: prefix };
  const space = m[1].toLowerCase();
  const longer = /longer\s+hue/i.test(m[0]);
  let interp: GradientInterp = "oklch";
  if (space === "oklch") interp = "oklch";
  else if (space === "oklab") interp = "oklab";
  else if (space === "srgb") interp = "srgb";
  else if (space === "hsl") interp = longer ? "hsl-longer" : "hsl";
  return { interp, rest: prefix.slice(m[0].length).trim() };
}

function parseStops(parts: string[]): GradientStop[] | null {
  const stops: GradientStop[] = [];
  for (const p of parts) {
    // Stop with explicit position: `<color> <pct>` or just `<pct>` (hint).
    const hintMatch = p.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (hintMatch) {
      if (stops.length === 0) return null; // hint can't lead
      stops[stops.length - 1].hint = parseFloat(hintMatch[1]) / 100;
      continue;
    }
    const m = p.match(/^(.*?)\s+(-?\d+(?:\.\d+)?)%$/);
    let colorStr = p;
    let position: number | null = null;
    if (m) {
      colorStr = m[1].trim();
      position = parseFloat(m[2]) / 100;
    }
    const color = parseColor(colorStr);
    if (!color) return null;
    stops.push({
      color,
      position: position ?? (stops.length === 0 ? 0 : 1),
    });
  }
  return stops.length >= 1 ? stops : null;
}

export function parseGradient(input: string): Gradient | null {
  const trimmed = input.trim();
  const m = trimmed.match(FN_RE);
  if (!m) return null;
  const type = m[1].toLowerCase() as GradientType;
  const parts = splitTopLevel(m[2]);
  if (parts.length === 0) return null;

  if (type === "linear") {
    let angle = 180; // CSS default for linear-gradient
    const { interp, rest } = parseInterp(parts[0]);
    let stopParts = parts.slice(1);
    let head = rest;
    // angle may live in head OR be absent
    const angleMatch = head.match(/^(-?\d+(?:\.\d+)?)deg$/i);
    if (angleMatch) {
      angle = parseFloat(angleMatch[1]);
    } else if (head.length > 0) {
      // head was actually a stop, not an angle/interp prefix
      stopParts = [head, ...stopParts];
    }
    const stops = parseStops(stopParts);
    if (!stops) return null;
    return { type: "linear", angle, interp, stops };
  }

  if (type === "radial") {
    const { interp, rest } = parseInterp(parts[0]);
    let head = rest;
    let stopParts = parts.slice(1);
    let shape: "circle" | "ellipse" = "ellipse";
    let size: "closest-side" | "farthest-corner" = "farthest-corner";
    let cx = 0.5;
    let cy = 0.5;
    if (/circle/i.test(head)) shape = "circle";
    if (/ellipse/i.test(head)) shape = "ellipse";
    if (/closest-side/i.test(head)) size = "closest-side";
    if (/farthest-corner/i.test(head)) size = "farthest-corner";
    const at = head.match(/at\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
    if (at) {
      cx = parseFloat(at[1]) / 100;
      cy = parseFloat(at[2]) / 100;
    }
    if (!head) stopParts = [head, ...stopParts];
    const stops = parseStops(stopParts);
    if (!stops) return null;
    return { type: "radial", shape, size, center: { x: cx, y: cy }, interp, stops };
  }

  // conic
  const { interp, rest } = parseInterp(parts[0]);
  const head = rest;
  const stopParts = parts.slice(1);
  let startAngle = 0;
  let cx = 0.5;
  let cy = 0.5;
  const from = head.match(/from\s+(-?\d+(?:\.\d+)?)deg/i);
  if (from) startAngle = parseFloat(from[1]);
  const at = head.match(/at\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/i);
  if (at) {
    cx = parseFloat(at[1]) / 100;
    cy = parseFloat(at[2]) / 100;
  }
  const stops = parseStops(stopParts);
  if (!stops) return null;
  return { type: "conic", startAngle, center: { x: cx, y: cy }, interp, stops };
}
```

> Note: This parser is intentionally permissive (handles the shapes `formatGradient` produces, plus common hand-written variants with hex stops and missing `in oklch`). It is not a full CSS Gradient spec parser. The `parseGradient` round-trip with `formatGradient` is the contract.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts`
Expected: all tests pass (formatGradient + parseGradient).

- [ ] **Step 5: Commit**

```bash
git add registry/new-york/color-picker/lib/gradient.ts \
        registry/new-york/color-picker/lib/gradient.test.ts
git commit -m "Gradient: parseGradient (round-trips formatGradient, accepts hex stops)"
```

---

> Note: `formatColor` is already imported above for `formatStopColor`. The `parseGradient` step below also imports `parseColor` from the same module — combine the two `import` statements when implementing.

---

## Task 4: `parseFill` / `formatFill` helpers

**Files:**
- Modify: `registry/new-york/color-picker/lib/gradient.ts`
- Modify: `registry/new-york/color-picker/lib/gradient.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `registry/new-york/color-picker/lib/gradient.test.ts`:

```ts
import { parseFill, formatFill, type Fill } from "./gradient";

describe("Fill helpers", () => {
  it("formats a color fill as a CSS color string", () => {
    const fill: Fill = { kind: "color", color: { l: 0.7, c: 0.18, h: 30, alpha: 1 } };
    expect(formatFill(fill)).toBe("oklch(0.7 0.18 30)");
  });

  it("formats a gradient fill via formatGradient", () => {
    const fill: Fill = { kind: "gradient", gradient: DEFAULT_LINEAR };
    expect(formatFill(fill)).toBe(formatGradient(DEFAULT_LINEAR));
  });

  it("parses a CSS color into a color fill", () => {
    const f = parseFill("oklch(0.7 0.18 30)");
    expect(f).not.toBeNull();
    expect(f!.kind).toBe("color");
  });

  it("parses a CSS gradient into a gradient fill", () => {
    const f = parseFill(formatGradient(DEFAULT_LINEAR));
    expect(f).not.toBeNull();
    expect(f!.kind).toBe("gradient");
  });

  it("returns null for nonsense", () => {
    expect(parseFill("xxx")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts -t "Fill helpers"`
Expected: FAIL — `parseFill`/`formatFill` not exported.

- [ ] **Step 3: Implement the helpers**

Append to `registry/new-york/color-picker/lib/gradient.ts` (note: `formatColor` and `parseColor` are already imported from earlier tasks — do not duplicate the imports):

```ts
export function formatFill(f: Fill): string {
  if (f.kind === "color") return formatColor(f.color, "oklch");
  return formatGradient(f.gradient);
}

export function parseFill(input: string): Fill | null {
  const g = parseGradient(input);
  if (g) return { kind: "gradient", gradient: g };
  const c = parseColor(input);
  if (c) return { kind: "color", color: c };
  return null;
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/lib/gradient.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add registry/new-york/color-picker/lib/gradient.ts \
        registry/new-york/color-picker/lib/gradient.test.ts
git commit -m "Gradient: parseFill / formatFill (Color | Gradient discriminated union)"
```

---

## Task 5: `useGradientPicker` hook

**Files:**
- Create: `registry/new-york/color-picker/hooks/use-gradient-picker.ts`
- Create: `registry/new-york/color-picker/hooks/use-gradient-picker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `registry/new-york/color-picker/hooks/use-gradient-picker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGradientPicker } from "./use-gradient-picker";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type Gradient,
  type LinearGradient,
} from "../lib/gradient";

describe("useGradientPicker", () => {
  it("defaults to a linear gradient when no value is provided", () => {
    const { result } = renderHook(() => useGradientPicker({}));
    expect(result.current.gradient.type).toBe("linear");
    expect(result.current.gradient.stops).toHaveLength(2);
    expect(result.current.selectedStopId).toBe(result.current.stops[0].id);
  });

  it("addStop inserts a stop at the requested position", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    act(() => {
      result.current.addStop(0.5, { l: 0.5, c: 0.1, h: 200, alpha: 1 });
    });
    expect(result.current.stops).toHaveLength(3);
    expect(result.current.stops[1].position).toBeCloseTo(0.5);
    // The newly added stop becomes the selection.
    expect(result.current.selectedStopId).toBe(result.current.stops[1].id);
  });

  it("removeStop removes by id and reselects a neighbor", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const firstId = result.current.stops[0].id;
    act(() => {
      result.current.removeStop(firstId);
    });
    expect(result.current.stops).toHaveLength(1);
    expect(result.current.selectedStopId).toBe(result.current.stops[0].id);
  });

  it("removeStop is a no-op when only one stop remains", () => {
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: { ...DEFAULT_LINEAR, stops: [DEFAULT_LINEAR.stops[0]] },
      }),
    );
    const onlyId = result.current.stops[0].id;
    act(() => {
      result.current.removeStop(onlyId);
    });
    expect(result.current.stops).toHaveLength(1);
  });

  it("moveStop preserves selection by id (not by index)", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const firstId = result.current.stops[0].id;
    act(() => {
      result.current.selectStop(firstId);
    });
    act(() => {
      result.current.moveStop(firstId, 1.0); // move to the end
    });
    expect(result.current.selectedStopId).toBe(firstId);
    // After re-sort by position, the moved stop is now last.
    expect(result.current.stops[result.current.stops.length - 1].id).toBe(firstId);
  });

  it("setType switches type while preserving stops", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    const stopsBefore = result.current.stops.map((s) => s.position);
    act(() => {
      result.current.setType("radial");
    });
    expect(result.current.gradient.type).toBe("radial");
    expect(result.current.stops.map((s) => s.position)).toEqual(stopsBefore);
  });

  it("setType to conic preserves stops and uses default startAngle / center", () => {
    const { result } = renderHook(() => useGradientPicker({ defaultValue: DEFAULT_LINEAR }));
    act(() => {
      result.current.setType("conic");
    });
    expect(result.current.gradient.type).toBe("conic");
    expect((result.current.gradient as Extract<Gradient, { type: "conic" }>).startAngle).toBe(0);
  });

  it("onValueChange emits a clean Gradient (no internal ids)", () => {
    let emitted: Gradient | null = null;
    const { result } = renderHook(() =>
      useGradientPicker({
        defaultValue: DEFAULT_LINEAR,
        onValueChange: (g) => {
          emitted = g;
        },
      }),
    );
    act(() => {
      result.current.setAngle(45);
    });
    expect(emitted).not.toBeNull();
    expect((emitted as LinearGradient).angle).toBe(45);
    for (const s of (emitted as LinearGradient).stops) {
      expect((s as unknown as { id?: string }).id).toBeUndefined();
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/hooks/use-gradient-picker.test.ts`
Expected: FAIL — `useGradientPicker` not found.

- [ ] **Step 3: Implement `useGradientPicker`**

Create `registry/new-york/color-picker/hooks/use-gradient-picker.ts`:

```ts
"use client";

import * as React from "react";
import {
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
  type Gradient,
  type GradientInterp,
  type GradientStop,
  type GradientType,
  type LinearGradient,
  type RadialGradient,
  type ConicGradient,
} from "../lib/gradient";
import type { OklchColor } from "../lib/types";

let __idCounter = 0;
const nextId = () => `s${++__idCounter}`;

interface InternalStop extends GradientStop {
  id: string;
}

type InternalGradient =
  | (LinearGradient & { stops: InternalStop[] })
  | (RadialGradient & { stops: InternalStop[] })
  | (ConicGradient & { stops: InternalStop[] });

function attachIds(g: Gradient): InternalGradient {
  return { ...g, stops: g.stops.map((s) => ({ ...s, id: nextId() })) } as InternalGradient;
}

function stripIds(g: InternalGradient): Gradient {
  return {
    ...g,
    stops: g.stops.map(({ id: _id, ...s }) => s),
  } as Gradient;
}

export interface UseGradientPickerProps {
  value?: Gradient;
  defaultValue?: Gradient;
  onValueChange?: (gradient: Gradient, css: string) => void;
}

export interface GradientPickerState {
  /** Current gradient (clean, no ids — for consumers that read state directly). */
  gradient: Gradient;
  /** Internal stops with ids — Bar / StopList key off these. */
  stops: InternalStop[];
  selectedStopId: string;
  /** Convenience: the selected stop or `null` if no stop is selected. */
  selectedStop: InternalStop | null;

  setGradient: (next: Gradient) => void;
  setType: (type: GradientType) => void;
  setAngle: (angleDeg: number) => void;
  setStartAngle: (angleDeg: number) => void;
  setCenter: (xy: { x: number; y: number }) => void;
  setInterp: (interp: GradientInterp) => void;
  setRadialShape: (shape: "circle" | "ellipse") => void;
  setRadialSize: (size: "closest-side" | "farthest-corner") => void;

  selectStop: (id: string) => void;
  addStop: (position: number, color?: OklchColor) => string;
  removeStop: (id: string) => void;
  moveStop: (id: string, position: number) => void;
  setStopColor: (id: string, color: OklchColor) => void;
  setStopHint: (id: string, hint: number | undefined) => void;
}

import { formatGradient } from "../lib/gradient";

function sortByPosition(stops: InternalStop[]): InternalStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

function defaultsForType(type: GradientType): Gradient {
  if (type === "linear") return DEFAULT_LINEAR;
  if (type === "radial") return DEFAULT_RADIAL;
  return DEFAULT_CONIC;
}

export function useGradientPicker(
  props: UseGradientPickerProps = {},
): GradientPickerState {
  const { value, defaultValue, onValueChange } = props;
  const isControlled = value !== undefined;

  const [internal, setInternal] = React.useState<InternalGradient>(() =>
    attachIds(value ?? defaultValue ?? DEFAULT_LINEAR),
  );
  const [selectedStopId, setSelectedStopId] = React.useState<string>(
    () => internal.stops[0]?.id ?? "",
  );

  // Sync controlled value: re-attach ids whenever incoming reference changes.
  // We try to preserve ids when stop count + positions match exactly.
  React.useEffect(() => {
    if (!isControlled || !value) return;
    setInternal((prev) => {
      if (
        prev.type === value.type &&
        prev.stops.length === value.stops.length &&
        prev.stops.every((s, i) => s.position === value.stops[i].position)
      ) {
        // Same shape: copy non-stop fields, keep our ids.
        return {
          ...value,
          stops: prev.stops.map((s, i) => ({ ...value.stops[i], id: s.id })),
        } as InternalGradient;
      }
      return attachIds(value);
    });
  }, [isControlled, value]);

  const apply = React.useCallback(
    (next: InternalGradient) => {
      setInternal(next);
      const clean = stripIds(next);
      onValueChange?.(clean, formatGradient(clean));
    },
    [onValueChange],
  );

  const setType = React.useCallback(
    (type: GradientType) => {
      setInternal((prev) => {
        if (prev.type === type) return prev;
        const fallback = defaultsForType(type);
        // Preserve the user's stops + interp.
        const next = {
          ...fallback,
          interp: prev.interp,
          stops: prev.stops,
        } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setGradient = React.useCallback(
    (next: Gradient) => {
      const internalNext = attachIds(next);
      setInternal(internalNext);
      setSelectedStopId(internalNext.stops[0]?.id ?? "");
      onValueChange?.(next, formatGradient(next));
    },
    [onValueChange],
  );

  const setAngle = React.useCallback(
    (angleDeg: number) => {
      setInternal((prev) => {
        if (prev.type !== "linear") return prev;
        const next = { ...prev, angle: angleDeg } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setStartAngle = React.useCallback(
    (angleDeg: number) => {
      setInternal((prev) => {
        if (prev.type !== "conic") return prev;
        const next = { ...prev, startAngle: angleDeg } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setCenter = React.useCallback(
    (xy: { x: number; y: number }) => {
      setInternal((prev) => {
        if (prev.type === "linear") return prev;
        const next = { ...prev, center: xy } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setInterp = React.useCallback(
    (interp: GradientInterp) => {
      setInternal((prev) => {
        const next = { ...prev, interp } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setRadialShape = React.useCallback(
    (shape: "circle" | "ellipse") => {
      setInternal((prev) => {
        if (prev.type !== "radial") return prev;
        const next = { ...prev, shape } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setRadialSize = React.useCallback(
    (size: "closest-side" | "farthest-corner") => {
      setInternal((prev) => {
        if (prev.type !== "radial") return prev;
        const next = { ...prev, size } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const selectStop = React.useCallback((id: string) => setSelectedStopId(id), []);

  const addStop = React.useCallback(
    (position: number, color?: OklchColor): string => {
      const id = nextId();
      setInternal((prev) => {
        const fallback: OklchColor = { l: 0.5, c: 0, h: 0, alpha: 1 };
        const next = {
          ...prev,
          stops: sortByPosition([
            ...prev.stops,
            { id, position, color: color ?? fallback },
          ]),
        } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
      setSelectedStopId(id);
      return id;
    },
    [onValueChange],
  );

  const removeStop = React.useCallback(
    (id: string) => {
      setInternal((prev) => {
        if (prev.stops.length <= 1) return prev;
        const idx = prev.stops.findIndex((s) => s.id === id);
        if (idx === -1) return prev;
        const filtered = prev.stops.filter((s) => s.id !== id);
        const next = { ...prev, stops: filtered } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        // Re-select neighbor: the stop that took the removed one's index, or
        // the last one if we removed the tail.
        const nextSel = filtered[Math.min(idx, filtered.length - 1)].id;
        setSelectedStopId(nextSel);
        return next;
      });
    },
    [onValueChange],
  );

  const moveStop = React.useCallback(
    (id: string, position: number) => {
      const clamped = Math.max(0, Math.min(1, position));
      setInternal((prev) => {
        const next = {
          ...prev,
          stops: sortByPosition(
            prev.stops.map((s) => (s.id === id ? { ...s, position: clamped } : s)),
          ),
        } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setStopColor = React.useCallback(
    (id: string, color: OklchColor) => {
      setInternal((prev) => {
        const next = {
          ...prev,
          stops: prev.stops.map((s) => (s.id === id ? { ...s, color } : s)),
        } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const setStopHint = React.useCallback(
    (id: string, hint: number | undefined) => {
      setInternal((prev) => {
        const next = {
          ...prev,
          stops: prev.stops.map((s) => (s.id === id ? { ...s, hint } : s)),
        } as InternalGradient;
        const clean = stripIds(next);
        onValueChange?.(clean, formatGradient(clean));
        return next;
      });
    },
    [onValueChange],
  );

  const selectedStop = React.useMemo(
    () => internal.stops.find((s) => s.id === selectedStopId) ?? null,
    [internal.stops, selectedStopId],
  );

  const cleanGradient = React.useMemo(() => stripIds(internal), [internal]);

  return {
    gradient: cleanGradient,
    stops: internal.stops,
    selectedStopId,
    selectedStop,
    setGradient,
    setType,
    setAngle,
    setStartAngle,
    setCenter,
    setInterp,
    setRadialShape,
    setRadialSize,
    selectStop,
    addStop,
    removeStop,
    moveStop,
    setStopColor,
    setStopHint,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/hooks/use-gradient-picker.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/hooks/use-gradient-picker.ts \
        registry/new-york/color-picker/hooks/use-gradient-picker.test.ts
git commit -m "Gradient: useGradientPicker hook (stop ids, selection, controlled/uncontrolled)"
```

---

## Task 6: `useFillPicker` hook

**Files:**
- Create: `registry/new-york/color-picker/hooks/use-fill-picker.ts`
- Create: `registry/new-york/color-picker/hooks/use-fill-picker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `registry/new-york/color-picker/hooks/use-fill-picker.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFillPicker } from "./use-fill-picker";
import { DEFAULT_LINEAR } from "../lib/gradient";

describe("useFillPicker", () => {
  it("defaults to color mode with a black color", () => {
    const { result } = renderHook(() => useFillPicker({}));
    expect(result.current.mode).toBe("color");
    expect(result.current.fill.kind).toBe("color");
  });

  it("setMode 'gradient' switches to a default linear gradient", () => {
    const { result } = renderHook(() => useFillPicker({}));
    act(() => result.current.setMode("gradient"));
    expect(result.current.mode).toBe("gradient");
    expect(result.current.fill.kind).toBe("gradient");
  });

  it("setMode 'color' restores the last color when switching back", () => {
    const { result } = renderHook(() =>
      useFillPicker({
        defaultValue: { kind: "color", color: { l: 0.5, c: 0.1, h: 200, alpha: 1 } },
      }),
    );
    act(() => result.current.setMode("gradient"));
    act(() => result.current.setMode("color"));
    expect(result.current.fill.kind).toBe("color");
    expect((result.current.fill as { kind: "color"; color: { l: number } }).color.l).toBe(0.5);
  });

  it("emits onValueChange with the formatted CSS", () => {
    let lastCss = "";
    const { result } = renderHook(() =>
      useFillPicker({
        onValueChange: (_f, css) => {
          lastCss = css;
        },
      }),
    );
    act(() => result.current.setFill({ kind: "gradient", gradient: DEFAULT_LINEAR }));
    expect(lastCss).toContain("linear-gradient");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/hooks/use-fill-picker.test.ts`
Expected: FAIL — `useFillPicker` not found.

- [ ] **Step 3: Implement `useFillPicker`**

Create `registry/new-york/color-picker/hooks/use-fill-picker.ts`:

```ts
"use client";

import * as React from "react";
import {
  DEFAULT_LINEAR,
  formatFill,
  type Fill,
  type ColorFill,
  type GradientFill,
} from "../lib/gradient";
import type { OklchColor } from "../lib/types";

const DEFAULT_COLOR: OklchColor = { l: 0, c: 0, h: 0, alpha: 1 };

export type FillMode = "color" | "gradient";

export interface UseFillPickerProps {
  value?: Fill;
  defaultValue?: Fill;
  onValueChange?: (fill: Fill, css: string) => void;
  mode?: FillMode;
  defaultMode?: FillMode;
  onModeChange?: (mode: FillMode) => void;
}

export interface FillPickerState {
  fill: Fill;
  mode: FillMode;
  setFill: (fill: Fill) => void;
  setMode: (mode: FillMode) => void;
}

export function useFillPicker(props: UseFillPickerProps = {}): FillPickerState {
  const {
    value,
    defaultValue,
    onValueChange,
    mode: modeProp,
    defaultMode,
    onModeChange,
  } = props;

  const initialFill: Fill =
    value ?? defaultValue ?? { kind: "color", color: DEFAULT_COLOR };
  const initialMode: FillMode = modeProp ?? defaultMode ?? initialFill.kind;

  const [internalFill, setInternalFill] = React.useState<Fill>(initialFill);
  const [internalMode, setInternalMode] = React.useState<FillMode>(initialMode);

  // Remember the last color and last gradient across mode toggles, so
  // switching back doesn't wipe the user's work.
  const lastColorRef = React.useRef<ColorFill>(
    initialFill.kind === "color"
      ? initialFill
      : { kind: "color", color: DEFAULT_COLOR },
  );
  const lastGradientRef = React.useRef<GradientFill>(
    initialFill.kind === "gradient"
      ? initialFill
      : { kind: "gradient", gradient: DEFAULT_LINEAR },
  );

  // Controlled-fill sync.
  React.useEffect(() => {
    if (value === undefined) return;
    setInternalFill(value);
    if (value.kind === "color") lastColorRef.current = value;
    else lastGradientRef.current = value;
  }, [value]);

  // Controlled-mode sync.
  React.useEffect(() => {
    if (modeProp === undefined) return;
    setInternalMode(modeProp);
  }, [modeProp]);

  const setFill = React.useCallback(
    (fill: Fill) => {
      setInternalFill(fill);
      if (fill.kind === "color") lastColorRef.current = fill;
      else lastGradientRef.current = fill;
      onValueChange?.(fill, formatFill(fill));
    },
    [onValueChange],
  );

  const setMode = React.useCallback(
    (next: FillMode) => {
      setInternalMode(next);
      onModeChange?.(next);
      const restored: Fill =
        next === "color" ? lastColorRef.current : lastGradientRef.current;
      setInternalFill(restored);
      onValueChange?.(restored, formatFill(restored));
    },
    [onValueChange, onModeChange],
  );

  return { fill: internalFill, mode: internalMode, setFill, setMode };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/hooks/use-fill-picker.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add registry/new-york/color-picker/hooks/use-fill-picker.ts \
        registry/new-york/color-picker/hooks/use-fill-picker.test.ts
git commit -m "Fill: useFillPicker hook (mode + value bridge, remembers each side)"
```

---

## Task 7: `GradientPickerContext` and `FillPickerContext`

**Files:**
- Create: `registry/new-york/color-picker/contexts/gradient.ts`
- Create: `registry/new-york/color-picker/contexts/fill.ts`

- [ ] **Step 1: Create the gradient context**

Create `registry/new-york/color-picker/contexts/gradient.ts`:

```ts
"use client";

import * as React from "react";
import type { GradientPickerState } from "../hooks/use-gradient-picker";

export const GradientPickerContext =
  React.createContext<GradientPickerState | null>(null);

export function useGradientPickerContext(): GradientPickerState {
  const ctx = React.useContext(GradientPickerContext);
  if (!ctx) {
    throw new Error(
      "GradientPicker.* parts must be rendered inside <GradientPicker.Root> " +
        "or <FillPicker.Pane mode=\"gradient\">",
    );
  }
  return ctx;
}
```

- [ ] **Step 2: Create the fill context**

Create `registry/new-york/color-picker/contexts/fill.ts`:

```ts
"use client";

import * as React from "react";
import type { FillPickerState } from "../hooks/use-fill-picker";

export const FillPickerContext = React.createContext<FillPickerState | null>(null);

export function useFillPickerContext(): FillPickerState {
  const ctx = React.useContext(FillPickerContext);
  if (!ctx) {
    throw new Error(
      "FillPicker.Tabs / Tab / Pane must be rendered inside <FillPicker.Root>",
    );
  }
  return ctx;
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add registry/new-york/color-picker/contexts/
git commit -m "Contexts: add FillPickerContext and GradientPickerContext"
```

---

## Task 8: `FillPicker.Root`

**Files:**
- Create: `registry/new-york/color-picker/parts/fill/root.tsx`

- [ ] **Step 1: Implement Root**

Create `registry/new-york/color-picker/parts/fill/root.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FillPickerContext } from "../../contexts/fill";
import {
  useFillPicker,
  type UseFillPickerProps,
} from "../../hooks/use-fill-picker";

export interface RootProps
  extends UseFillPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  {
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
    className,
    children,
    ...rest
  },
  ref,
) {
  const state = useFillPicker({
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
  });

  return (
    <FillPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker"
        className={cn(
          "flex w-full max-w-[280px] flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </FillPickerContext.Provider>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/parts/fill/root.tsx
git commit -m "Fill: Root provides FillPickerContext (matches ColorPicker.Root shape)"
```

---

## Task 9: `FillPicker.Tabs` and `FillPicker.Tab`

**Files:**
- Create: `registry/new-york/color-picker/parts/fill/tabs.tsx`

- [ ] **Step 1: Implement Tabs + Tab**

Create `registry/new-york/color-picker/parts/fill/tabs.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFillPickerContext } from "../../contexts/fill";
import type { FillMode } from "../../hooks/use-fill-picker";

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Tabs({ className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Fill mode"
      className={cn("inline-flex items-center gap-1 rounded-md bg-muted p-1", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mode: FillMode;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { mode, className, children, ...rest },
  ref,
) {
  const ctx = useFillPickerContext();
  const active = ctx.mode === mode;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx.setMode(mode)}
      className={cn(
        "rounded-sm px-3 py-1 text-xs font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/parts/fill/tabs.tsx
git commit -m "Fill: Tabs + Tab (segmented control bound to FillPickerContext)"
```

---

## Task 10: `FillPicker.Pane`

**Files:**
- Create: `registry/new-york/color-picker/parts/fill/pane.tsx`

- [ ] **Step 1: Implement Pane**

Create `registry/new-york/color-picker/parts/fill/pane.tsx`:

```tsx
"use client";

import * as React from "react";
import { ColorPickerContext } from "../../context";
import { GradientPickerContext } from "../../contexts/gradient";
import { useFillPickerContext } from "../../contexts/fill";
import { useColorPicker } from "../../hooks/use-color-picker";
import { useGradientPicker } from "../../hooks/use-gradient-picker";
import type { FillMode } from "../../hooks/use-fill-picker";
import { DEFAULT_LINEAR, type Gradient } from "../../lib/gradient";
import type { OklchColor } from "../../lib/types";

export interface PaneProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: FillMode;
}

/**
 * Renders children only when the current FillPicker mode matches `mode`.
 * For `mode="color"`, mounts ColorPickerContext bound to fill.color.
 * For `mode="gradient"`, mounts GradientPickerContext bound to fill.gradient.
 */
export const Pane = React.forwardRef<HTMLDivElement, PaneProps>(function Pane(
  { mode, children, ...rest },
  ref,
) {
  const fill = useFillPickerContext();
  if (fill.mode !== mode) return null;

  if (mode === "color") {
    return (
      <ColorPaneInner ref={ref} {...rest}>
        {children}
      </ColorPaneInner>
    );
  }
  return (
    <GradientPaneInner ref={ref} {...rest}>
      {children}
    </GradientPaneInner>
  );
});

const ColorPaneInner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ColorPaneInner({ children, ...rest }, ref) {
  const fill = useFillPickerContext();
  const colorValue: OklchColor =
    fill.fill.kind === "color"
      ? fill.fill.color
      : { l: 0, c: 0, h: 0, alpha: 1 };

  const state = useColorPicker({
    value: colorValue,
    onValueChange: (color) => {
      fill.setFill({ kind: "color", color });
    },
  });

  return (
    <ColorPickerContext.Provider value={state}>
      <div ref={ref} data-slot="fill-picker-pane" data-mode="color" {...rest}>
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
});

const GradientPaneInner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function GradientPaneInner({ children, ...rest }, ref) {
  const fill = useFillPickerContext();
  const gradientValue: Gradient =
    fill.fill.kind === "gradient" ? fill.fill.gradient : DEFAULT_LINEAR;

  const state = useGradientPicker({
    value: gradientValue,
    onValueChange: (gradient) => {
      fill.setFill({ kind: "gradient", gradient });
    },
  });

  return (
    <GradientPickerContext.Provider value={state}>
      <div ref={ref} data-slot="fill-picker-pane" data-mode="gradient" {...rest}>
        {children}
      </div>
    </GradientPickerContext.Provider>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/parts/fill/pane.tsx
git commit -m "Fill: Pane mounts ColorPicker or GradientPicker context bound to fill slice"
```

---

## Task 11: `GradientPicker.Root` (standalone)

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/root.tsx`

- [ ] **Step 1: Implement Root**

Create `registry/new-york/color-picker/parts/gradient/root.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GradientPickerContext } from "../../contexts/gradient";
import {
  useGradientPicker,
  type UseGradientPickerProps,
} from "../../hooks/use-gradient-picker";

export interface RootProps
  extends UseGradientPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  { value, defaultValue, onValueChange, className, children, ...rest },
  ref,
) {
  const state = useGradientPicker({ value, defaultValue, onValueChange });
  return (
    <GradientPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="gradient-picker"
        className={cn(
          "flex w-full max-w-[280px] flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </GradientPickerContext.Provider>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/root.tsx
git commit -m "Gradient: Root provides GradientPickerContext (standalone use)"
```

---

## Task 12: `GradientPicker.Bar`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/bar.tsx`
- Create: `registry/new-york/color-picker/parts/gradient/bar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `registry/new-york/color-picker/parts/gradient/bar.test.tsx`:

```tsx
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

  it("the selected handle has aria-pressed=true", () => {
    render(
      <Root defaultValue={DEFAULT_LINEAR}>
        <Bar />
      </Root>,
    );
    const handles = screen.getAllByRole("slider");
    const selected = handles.filter((h) => h.getAttribute("aria-pressed") === "true");
    expect(selected).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/bar.test.tsx`
Expected: FAIL — `Bar` not found.

- [ ] **Step 3: Implement Bar**

Create `registry/new-york/color-picker/parts/gradient/bar.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, type LinearGradient } from "../../lib/gradient";

export interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Bar height in px. Defaults to 24. */
  height?: number;
}

const PREVIEW_GRADIENT = (g: ReturnType<typeof useGradientPickerContext>["gradient"]) => {
  // For the bar preview we always render the stops as a horizontal linear
  // gradient regardless of the live gradient type — the bar is the editing
  // surface for stop positions.
  const linear: LinearGradient = {
    type: "linear",
    angle: 90,
    interp: g.interp,
    stops: g.stops,
  };
  return formatGradient(linear);
};

export const Bar = React.forwardRef<HTMLDivElement, BarProps>(function Bar(
  { className, height = 24, ...rest },
  ref,
) {
  const ctx = useGradientPickerContext();
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  React.useImperativeHandle(ref, () => trackRef.current as HTMLDivElement);

  const positionFromEvent = React.useCallback((clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current) return; // handles handle their own drag
    const pos = positionFromEvent(e.clientX);
    ctx.addStop(pos);
  };

  const startStopDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    ctx.selectStop(id);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dy = ev.clientY - rect.bottom;
      // Drag handle below the bar by more than 24px → remove stop.
      if (dy > 24 && ctx.stops.length > 1) {
        ctx.removeStop(id);
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        return;
      }
      ctx.moveStop(id, positionFromEvent(ev.clientX));
    };
    const onUp = (ev: PointerEvent) => {
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  const onStopKeyDown =
    (id: string, position: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.moveStop(id, position - step);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.moveStop(id, position + step);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        ctx.removeStop(id);
      }
    };

  return (
    <div
      data-slot="gradient-bar"
      className={cn("relative w-full select-none", className)}
      style={{ height }}
      {...rest}
    >
      <div
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        className="absolute inset-0 rounded-md border border-border"
        style={{
          background: `${PREVIEW_GRADIENT(ctx.gradient)}, repeating-conic-gradient(#bbb 0 25%, #fff 0 50%) 0 0/8px 8px`,
        }}
      />
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        return (
          <div
            key={s.id}
            role="slider"
            aria-label={`Stop at ${Math.round(s.position * 100)}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(s.position * 100)}
            aria-pressed={selected}
            tabIndex={0}
            onPointerDown={startStopDrag(s.id)}
            onFocus={() => ctx.selectStop(s.id)}
            onKeyDown={onStopKeyDown(s.id, s.position)}
            style={{
              left: `${s.position * 100}%`,
              transform: "translate(-50%, -2px)",
            }}
            className={cn(
              "absolute top-full size-3 cursor-grab rounded-full border bg-background",
              selected ? "border-foreground ring-2 ring-foreground/40" : "border-border",
            )}
          />
        );
      })}
    </div>
  );
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/bar.test.tsx`
Expected: both tests pass.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/bar.tsx \
        registry/new-york/color-picker/parts/gradient/bar.test.tsx
git commit -m "Gradient: Bar (drag stops, click-to-add, drag-down-to-remove, arrow-key nudge)"
```

---

## Task 13: `GradientPicker.TypeSwitcher`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/type-switcher.tsx`

- [ ] **Step 1: Implement TypeSwitcher**

Create `registry/new-york/color-picker/parts/gradient/type-switcher.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientType } from "../../lib/gradient";

const TYPES: { value: GradientType; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

export const TypeSwitcher = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function TypeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Gradient type"
      className={cn("inline-flex w-full rounded-md bg-muted p-1", className)}
      {...rest}
    >
      {TYPES.map((t) => {
        const active = ctx.gradient.type === t.value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => ctx.setType(t.value)}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/type-switcher.tsx
git commit -m "Gradient: TypeSwitcher (linear/radial/conic segmented control)"
```

---

## Task 14: `GradientPicker.AngleDial`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/angle-dial.tsx`

- [ ] **Step 1: Implement AngleDial**

Create `registry/new-york/color-picker/parts/gradient/angle-dial.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface AngleDialProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const AngleDial = React.forwardRef<HTMLDivElement, AngleDialProps>(
  function AngleDial({ className, size = 56, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

    if (ctx.gradient.type === "radial") return null;

    const angle =
      ctx.gradient.type === "linear"
        ? ctx.gradient.angle
        : ctx.gradient.startAngle;
    const setAngle =
      ctx.gradient.type === "linear" ? ctx.setAngle : ctx.setStartAngle;

    const fromEvent = (clientX: number, clientY: number): number => {
      const el = padRef.current;
      if (!el) return angle;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      // CSS gradient angle: 0deg = up, increases clockwise.
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return (deg + 360) % 360;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setAngle(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        setAngle(fromEvent(ev.clientX, ev.clientY));
      const onUp = (ev: PointerEvent) => {
        e.currentTarget.releasePointerCapture(ev.pointerId);
        e.currentTarget.removeEventListener("pointermove", onMove);
        e.currentTarget.removeEventListener("pointerup", onUp);
      };
      e.currentTarget.addEventListener("pointermove", onMove);
      e.currentTarget.addEventListener("pointerup", onUp);
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const n = parseFloat(e.target.value);
      if (Number.isFinite(n)) setAngle(((n % 360) + 360) % 360);
    };

    return (
      <div className={cn("flex items-center gap-2", className)} {...rest}>
        <div
          ref={padRef}
          onPointerDown={onPointerDown}
          role="slider"
          aria-label="Gradient angle"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(angle)}
          tabIndex={0}
          className="relative shrink-0 cursor-grab rounded-full border border-border bg-muted"
          style={{ width: size, height: size }}
        >
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top -translate-x-1/2 bg-foreground"
            style={{ transform: `translate(-50%, 0) rotate(${angle}deg)` }}
          />
        </div>
        <input
          type="number"
          min={0}
          max={360}
          step={1}
          value={Math.round(angle)}
          onChange={onInputChange}
          className="h-8 w-16 rounded-md border border-border bg-background px-2 text-xs"
          aria-label="Angle in degrees"
        />
      </div>
    );
  },
);
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/angle-dial.tsx
git commit -m "Gradient: AngleDial (drag dial + numeric input, CSS-angle convention)"
```

---

## Task 15: `GradientPicker.CenterPad`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/center-pad.tsx`

- [ ] **Step 1: Implement CenterPad**

Create `registry/new-york/color-picker/parts/gradient/center-pad.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface CenterPadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const CenterPad = React.forwardRef<HTMLDivElement, CenterPadProps>(
  function CenterPad({ className, size = 96, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

    if (ctx.gradient.type === "linear") return null;
    const center = ctx.gradient.center;

    const fromEvent = (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return center;
      const r = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
      };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      ctx.setCenter(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        ctx.setCenter(fromEvent(ev.clientX, ev.clientY));
      const onUp = (ev: PointerEvent) => {
        e.currentTarget.releasePointerCapture(ev.pointerId);
        e.currentTarget.removeEventListener("pointermove", onMove);
        e.currentTarget.removeEventListener("pointerup", onUp);
      };
      e.currentTarget.addEventListener("pointermove", onMove);
      e.currentTarget.addEventListener("pointerup", onUp);
    };

    return (
      <div
        ref={padRef}
        onPointerDown={onPointerDown}
        role="slider"
        aria-label="Gradient center"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(center.x * 100)}
        tabIndex={0}
        className={cn(
          "relative shrink-0 cursor-crosshair rounded-md border border-border bg-muted",
          className,
        )}
        style={{ width: size, height: size }}
        {...rest}
      >
        <div
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-foreground"
          style={{ left: `${center.x * 100}%`, top: `${center.y * 100}%` }}
        />
      </div>
    );
  },
);
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/center-pad.tsx
git commit -m "Gradient: CenterPad (2D drag for radial/conic center)"
```

---

## Task 16: `GradientPicker.RadialShape`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/radial-shape.tsx`

- [ ] **Step 1: Implement RadialShape**

Create `registry/new-york/color-picker/parts/gradient/radial-shape.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const RadialShape = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function RadialShape({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  const g = ctx.gradient;

  return (
    <div ref={ref} className={cn("flex items-center gap-2", className)} {...rest}>
      <div role="tablist" aria-label="Radial shape" className="inline-flex rounded-md bg-muted p-1">
        {(["circle", "ellipse"] as const).map((shape) => {
          const active = g.shape === shape;
          return (
            <button
              key={shape}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => ctx.setRadialShape(shape)}
              className={cn(
                "rounded-sm px-2 py-1 text-xs font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {shape}
            </button>
          );
        })}
      </div>
      <select
        value={g.size}
        onChange={(e) =>
          ctx.setRadialSize(e.target.value as "closest-side" | "farthest-corner")
        }
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
        aria-label="Radial size"
      >
        <option value="closest-side">closest-side</option>
        <option value="farthest-corner">farthest-corner</option>
      </select>
    </div>
  );
});
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/radial-shape.tsx
git commit -m "Gradient: RadialShape (circle/ellipse + size selector, radial only)"
```

---

## Task 17: `GradientPicker.StopList`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/stop-list.tsx`

- [ ] **Step 1: Implement StopList**

Create `registry/new-york/color-picker/parts/gradient/stop-list.tsx`:

```tsx
"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatColor } from "../../lib/color";

export const StopList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function StopList({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <div
      ref={ref}
      role="list"
      className={cn("flex flex-col gap-1", className)}
      {...rest}
    >
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        return (
          <div
            key={s.id}
            role="listitem"
            data-selected={selected}
            onClick={() => ctx.selectStop(s.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border p-1 text-xs",
              selected ? "border-foreground" : "border-border",
            )}
          >
            <span
              aria-hidden
              className="size-5 rounded border border-border"
              style={{ background: formatColor(s.color, "hex") }}
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(s.position * 100)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) ctx.moveStop(s.id, v / 100);
              }}
              className="h-7 w-14 rounded border border-border bg-background px-1 text-right"
              aria-label="Stop position"
            />
            <span className="text-muted-foreground">%</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ctx.removeStop(s.id);
              }}
              disabled={ctx.stops.length <= 1}
              className="ml-auto inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Remove stop"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/stop-list.tsx
git commit -m "Gradient: StopList (rows with swatch, position input, delete)"
```

---

## Task 18: `GradientPicker.StopColor`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/stop-color.tsx`

- [ ] **Step 1: Implement StopColor**

Create `registry/new-york/color-picker/parts/gradient/stop-color.tsx`:

```tsx
"use client";

import * as React from "react";
import { ColorPickerContext } from "../../context";
import { useGradientPickerContext } from "../../contexts/gradient";
import { useColorPicker } from "../../hooks/use-color-picker";

/**
 * Mounts ColorPickerContext bound to the selected stop's color. Children are
 * normal ColorPicker.* parts (Area, Hue, ChannelInput, ...) — they Just Work
 * because they only depend on ColorPickerContext.
 *
 * The inner Bound component is keyed on the selected stop id, so a fresh
 * useColorPicker instance (and a fresh `lastGoodHueRef`) is created per
 * stop. This isolates hue preservation per stop: editing stop A then
 * switching to stop B and back to A doesn't smear hue history across stops.
 */
export const StopColor: React.FC<React.PropsWithChildren> = ({ children }) => {
  const grad = useGradientPickerContext();
  const stop = grad.selectedStop;
  if (!stop) return null;
  return (
    <Bound key={stop.id} stopId={stop.id} initialColor={stop.color}>
      {children}
    </Bound>
  );
};

const Bound: React.FC<
  React.PropsWithChildren<{ stopId: string; initialColor: { l: number; c: number; h: number; alpha: number } }>
> = ({ stopId, initialColor, children }) => {
  const grad = useGradientPickerContext();
  // Re-read the live color on every render so external moves (e.g. preset
  // applied) flow into the picker. The stop is guaranteed to exist while
  // this component is mounted because the parent gates on selectedStop.
  const liveColor =
    grad.stops.find((s) => s.id === stopId)?.color ?? initialColor;

  const state = useColorPicker({
    value: liveColor,
    onValueChange: (color) => grad.setStopColor(stopId, color),
  });

  return (
    <ColorPickerContext.Provider value={state}>
      {children}
    </ColorPickerContext.Provider>
  );
};
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/stop-color.tsx
git commit -m "Gradient: StopColor (binds selected stop to ColorPickerContext for reuse)"
```

---

## Task 19: `GradientPicker.InterpSwitcher`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/interp-switcher.tsx`

- [ ] **Step 1: Implement InterpSwitcher**

Create `registry/new-york/color-picker/parts/gradient/interp-switcher.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { GradientInterp } from "../../lib/gradient";

const OPTIONS: { value: GradientInterp; label: string }[] = [
  { value: "oklch", label: "OKLCH" },
  { value: "oklab", label: "OKLab" },
  { value: "srgb", label: "sRGB" },
  { value: "hsl", label: "HSL" },
  { value: "hsl-longer", label: "HSL (longer hue)" },
];

export const InterpSwitcher = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function InterpSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <select
      ref={ref}
      value={ctx.gradient.interp}
      onChange={(e) => ctx.setInterp(e.target.value as GradientInterp)}
      className={cn(
        "h-8 w-full rounded-md border border-border bg-background px-2 text-xs",
        className,
      )}
      aria-label="Interpolation space"
      {...rest}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/interp-switcher.tsx
git commit -m "Gradient: InterpSwitcher (oklch/oklab/srgb/hsl/hsl-longer dropdown)"
```

---

## Task 20: `GradientPicker.Presets`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/presets.tsx`

- [ ] **Step 1: Implement Presets**

Create `registry/new-york/color-picker/parts/gradient/presets.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  formatGradient,
  parseGradient,
  type Gradient,
} from "../../lib/gradient";

const BUILTIN_PRESETS: string[] = [
  "linear-gradient(in oklch 90deg, oklch(0.9 0.15 60) 0%, oklch(0.6 0.2 30) 100%)",  // sunset
  "linear-gradient(in oklch 135deg, oklch(0.8 0.18 200) 0%, oklch(0.7 0.2 320) 100%)", // aurora
  "linear-gradient(in oklch 0deg, oklch(0.95 0.04 90) 0%, oklch(0.5 0.18 30) 100%)",  // peach
  "radial-gradient(circle farthest-corner at 50% 50% in oklch, oklch(0.9 0.2 280) 0%, oklch(0.3 0.12 260) 100%)", // halo
  "conic-gradient(from 0deg at 50% 50% in oklch, oklch(0.7 0.18 0) 0%, oklch(0.7 0.18 90) 25%, oklch(0.7 0.18 180) 50%, oklch(0.7 0.18 270) 75%, oklch(0.7 0.18 360) 100%)", // wheel
];

export interface PresetsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override or extend the built-in preset list. */
  presets?: string[];
}

export const Presets = React.forwardRef<HTMLDivElement, PresetsProps>(
  function Presets({ presets = BUILTIN_PRESETS, className, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const parsed = React.useMemo(
      () =>
        presets
          .map((css) => ({ css, gradient: parseGradient(css) }))
          .filter((p): p is { css: string; gradient: Gradient } => p.gradient !== null),
      [presets],
    );

    return (
      <div
        ref={ref}
        className={cn("grid grid-cols-5 gap-1.5", className)}
        {...rest}
      >
        {parsed.map(({ css, gradient }) => (
          <button
            key={css}
            type="button"
            onClick={() => ctx.setGradient(gradient)}
            className="aspect-square rounded-md border border-border outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring"
            style={{ background: formatGradient(gradient) }}
            aria-label="Apply gradient preset"
          />
        ))}
      </div>
    );
  },
);
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/presets.tsx
git commit -m "Gradient: Presets (5 built-in presets, override via prop)"
```

---

## Task 21: `GradientPicker.CssInput`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/css-input.tsx`

- [ ] **Step 1: Implement CssInput**

Create `registry/new-york/color-picker/parts/gradient/css-input.tsx`:

```tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient, parseGradient } from "../../lib/gradient";

export const CssInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function CssInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  const [draft, setDraft] = React.useState(() => formatGradient(ctx.gradient));
  const [invalid, setInvalid] = React.useState(false);

  // Stay in sync when ctx changes (e.g. drag a stop).
  React.useEffect(() => {
    setDraft(formatGradient(ctx.gradient));
    setInvalid(false);
  }, [ctx.gradient]);

  const commit = () => {
    const parsed = parseGradient(draft);
    if (parsed) {
      ctx.setGradient(parsed);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      aria-invalid={invalid}
      className={cn(
        "h-8 w-full rounded-md border bg-background px-2 font-mono text-[10px]",
        invalid ? "border-destructive" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add registry/new-york/color-picker/parts/gradient/css-input.tsx
git commit -m "Gradient: CssInput (paste/edit CSS gradient string with validation)"
```

---

## Task 22: Barrel — `fill-picker.tsx`

**Files:**
- Create: `registry/new-york/color-picker/fill-picker.tsx`

- [ ] **Step 1: Implement the barrel**

Create `registry/new-york/color-picker/fill-picker.tsx`:

```tsx
"use client";

// Re-export everything ColorPicker exposes so a single import point covers
// the whole fill-picker public surface.
export * from "./color-picker";
export { ColorPicker } from "./color-picker";

// FillPicker shell
import { Root as FillRoot } from "./parts/fill/root";
import { Tabs as FillTabs, Tab as FillTab } from "./parts/fill/tabs";
import { Pane as FillPane } from "./parts/fill/pane";

// GradientPicker parts
import { Root as GradientRoot } from "./parts/gradient/root";
import { Bar } from "./parts/gradient/bar";
import { TypeSwitcher } from "./parts/gradient/type-switcher";
import { AngleDial } from "./parts/gradient/angle-dial";
import { CenterPad } from "./parts/gradient/center-pad";
import { RadialShape } from "./parts/gradient/radial-shape";
import { StopList } from "./parts/gradient/stop-list";
import { StopColor } from "./parts/gradient/stop-color";
import { InterpSwitcher } from "./parts/gradient/interp-switcher";
import { Presets } from "./parts/gradient/presets";
import { CssInput as GradientCssInput } from "./parts/gradient/css-input";

export type {
  Fill,
  ColorFill,
  GradientFill,
  Gradient,
  GradientType,
  GradientInterp,
  GradientStop,
  LinearGradient,
  RadialGradient,
  ConicGradient,
} from "./lib/gradient";
export {
  formatFill,
  parseFill,
  formatGradient,
  parseGradient,
  DEFAULT_LINEAR,
  DEFAULT_RADIAL,
  DEFAULT_CONIC,
} from "./lib/gradient";
export { useGradientPicker } from "./hooks/use-gradient-picker";
export type {
  UseGradientPickerProps,
  GradientPickerState,
} from "./hooks/use-gradient-picker";
export { useFillPicker } from "./hooks/use-fill-picker";
export type {
  UseFillPickerProps,
  FillPickerState,
  FillMode,
} from "./hooks/use-fill-picker";

export const GradientPicker = {
  Root: GradientRoot,
  Bar,
  TypeSwitcher,
  AngleDial,
  CenterPad,
  RadialShape,
  StopList,
  StopColor,
  InterpSwitcher,
  Presets,
  CssInput: GradientCssInput,
};

export const FillPicker = {
  Root: FillRoot,
  Tabs: FillTabs,
  Tab: FillTab,
  Pane: FillPane,
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add registry/new-york/color-picker/fill-picker.tsx
git commit -m "Fill: barrel re-exporting ColorPicker, GradientPicker, FillPicker namespaces"
```

---

## Task 23: Update `registry.json`

**Files:**
- Modify: `registry.json`

- [ ] **Step 1: Add the new file entries**

Open `registry.json` and add these entries to `items[0].files` (preserve existing entries; insert in this order at the end of the `files` array):

```json
{
  "path": "registry/new-york/color-picker/lib/gradient.ts",
  "type": "registry:lib",
  "target": "components/ui/fill-picker/lib/gradient.ts"
},
{
  "path": "registry/new-york/color-picker/hooks/use-gradient-picker.ts",
  "type": "registry:hook",
  "target": "components/ui/fill-picker/hooks/use-gradient-picker.ts"
},
{
  "path": "registry/new-york/color-picker/hooks/use-fill-picker.ts",
  "type": "registry:hook",
  "target": "components/ui/fill-picker/hooks/use-fill-picker.ts"
},
{
  "path": "registry/new-york/color-picker/contexts/fill.ts",
  "type": "registry:lib",
  "target": "components/ui/fill-picker/contexts/fill.ts"
},
{
  "path": "registry/new-york/color-picker/contexts/gradient.ts",
  "type": "registry:lib",
  "target": "components/ui/fill-picker/contexts/gradient.ts"
},
{
  "path": "registry/new-york/color-picker/parts/fill/root.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/fill/root.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/fill/tabs.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/fill/tabs.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/fill/pane.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/fill/pane.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/root.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/root.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/bar.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/bar.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/type-switcher.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/type-switcher.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/angle-dial.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/angle-dial.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/center-pad.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/center-pad.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/radial-shape.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/radial-shape.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/stop-list.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/stop-list.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/stop-color.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/stop-color.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/interp-switcher.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/interp-switcher.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/presets.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/presets.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/css-input.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/css-input.tsx"
},
{
  "path": "registry/new-york/color-picker/fill-picker.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/fill-picker.tsx"
}
```

- [ ] **Step 2: Verify the JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('registry.json','utf8'))"`
Expected: no output (success).

- [ ] **Step 3: Build the registry**

Run: `pnpm registry:build`
Expected: emits `public/r/fill-picker.json` and `public/r/registry.json` containing all the new file paths.

- [ ] **Step 4: Commit**

```bash
git add registry.json
git commit -m "Registry: add gradient + fill picker files to fill-picker manifest"
```

> Note: `public/r/*.json` is gitignored — the generated bundle is a build artifact, not committed.

---

## Task 24: Demo recipes on `/docs`

**Files:**
- Modify: `src/app/docs/page.tsx`

- [ ] **Step 1: Inspect current docs page**

Read `src/app/docs/page.tsx` to understand the existing structure (sections, `<PreviewTabs>` usage, code-as-string conventions). Mirror the existing pattern exactly.

- [ ] **Step 2: Add a Gradient picker section**

Add a new section after the existing color-picker recipes. Use `<PreviewTabs>` with three recipes (compact / full / bar-only). Each recipe is a self-contained component that renders inside `<PreviewTabs>`'s `preview` slot, with the corresponding source string in the `code` slot.

Required imports at the top of `src/app/docs/page.tsx`:

```tsx
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import {
  GradientPicker,
  DEFAULT_LINEAR,
} from "@/registry/new-york/color-picker/fill-picker";
import type { Gradient } from "@/registry/new-york/color-picker/fill-picker";
```

The three demo components (drop them at the bottom of the file, then mount them via `<PreviewTabs>`):

```tsx
function GradientCompactDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <GradientPicker.Bar />
      <GradientPicker.TypeSwitcher />
      <GradientPicker.StopColor>
        <ColorPicker.Hue />
        <ColorPicker.ChannelInput />
      </GradientPicker.StopColor>
    </GradientPicker.Root>
  );
}

function GradientFullDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <GradientPicker.TypeSwitcher />
      <GradientPicker.Bar />
      <GradientPicker.AngleDial />
      <GradientPicker.CenterPad />
      <GradientPicker.RadialShape />
      <GradientPicker.StopList />
      <GradientPicker.StopColor>
        <ColorPicker.Area />
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
        <ColorPicker.ChannelInput />
      </GradientPicker.StopColor>
      <GradientPicker.InterpSwitcher />
      <GradientPicker.Presets />
    </GradientPicker.Root>
  );
}

function GradientBarOnlyDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <GradientPicker.Bar />
    </GradientPicker.Root>
  );
}
```

The corresponding code strings shown in the Code tab should be the literal source of each demo function (including the imports).

Section heading and three `<PreviewTabs>` blocks (place inside the page's main `<article>` / wrapper, after the existing color-picker section):

```tsx
<section className="flex flex-col gap-3">
  <h2 className="text-xl font-semibold">Gradient picker</h2>
  <p className="text-sm text-muted-foreground">
    Compose <code>{"<GradientPicker.*>"}</code> the same way you compose the
    color picker. Three layouts ship — pick the shape that fits your surface.
  </p>
  <h3 className="mt-4 text-sm font-medium">Compact</h3>
  <PreviewTabs preview={<GradientCompactDemo />} code={GRADIENT_COMPACT_CODE} />
  <h3 className="mt-4 text-sm font-medium">Full</h3>
  <PreviewTabs preview={<GradientFullDemo />} code={GRADIENT_FULL_CODE} />
  <h3 className="mt-4 text-sm font-medium">Bar-only</h3>
  <PreviewTabs preview={<GradientBarOnlyDemo />} code={GRADIENT_BAR_ONLY_CODE} />
</section>
```

Each `GRADIENT_*_CODE` constant is a template-literal string of the demo function source.

- [ ] **Step 3: Run the dev server and visually verify**

Run: `pnpm dev`
Open http://localhost:3000/docs in a browser. Verify:
- All three recipes render without errors.
- The Compact recipe lets you drag stops on the bar and edit the selected stop's color via the Hue slider.
- The Full recipe shows the angle dial when type=Linear, the center pad + radial-shape selector when type=Radial, and the angle dial when type=Conic.
- The Bar-only recipe responds to drag.
- Toggling type preserves your stops.
- Clicking a preset replaces the gradient.
- Pasting a `linear-gradient(...)` CSS string into a `CssInput` (if you wire one in for testing) updates the picker.

If anything looks broken, fix in place and re-test.

- [ ] **Step 4: Run typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: all green. Existing color-picker tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/docs/page.tsx
git commit -m "Docs: add Gradient picker section with compact / full / bar-only recipes"
```

---

## Task 25: Push and open PR

- [ ] **Step 1: Push the branch**

Run: `git push`
Expected: branch updated on `origin/feat/gradient-picker`.

- [ ] **Step 2: Open a PR**

Run:

```bash
gh pr create --title "feat: gradient picker (FillPicker shell + GradientPicker parts)" --body "$(cat <<'EOF'
## Summary

- Adds a Gradient tab via a new `FillPicker` shell that composes `ColorPicker` and `GradientPicker` namespaces.
- Internal state is `Fill = ColorFill | GradientFill`. `formatFill` / `formatGradient` produce CSS strings; OKLCH stays canonical.
- Three layout recipes shipped on `/docs`: compact, full, bar-only.

Spec: `docs/superpowers/specs/2026-05-09-gradient-picker-design.md`

## Test plan

- [ ] `pnpm test` — all suites green
- [ ] `pnpm typecheck` — clean
- [ ] `pnpm registry:build` — emits `public/r/fill-picker.json` containing all gradient files
- [ ] `pnpm dev` → `/docs` → exercise each of the three recipes manually
- [ ] Existing `Hero` color picker on `/` still works unchanged
EOF
)"
```

Expected: PR URL printed. No further commits required.

---

## Acceptance checklist

After Task 25 the following must all be true:

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes (existing + new).
- [ ] `pnpm registry:build` produces a `public/r/fill-picker.json` containing every new file.
- [ ] The `/docs` page renders compact / full / bar-only gradient recipes; manual interaction (drag, add, remove, type-switch, preset) works.
- [ ] `Hero` (`src/components/hero.tsx`) is byte-identical to its `main` version.
- [ ] No file in the existing color-picker code path changed except `registry.json` and the new files listed in the File Structure section.
- [ ] PR is open against `main` from `feat/gradient-picker`.

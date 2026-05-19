# Gradient Shape Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing compound gradient controls (`AngleDial`, `CenterPad`, `RadialShape`) with shadcn-style composable primitives that match the updated Figma layouts (`gradientShape-linear`, `gradientShape-circle`, `gradientShape-ellipses`), and document the three layouts as copy-paste recipes in `/docs`.

**Architecture:** Decompose monolithic controls into single-responsibility primitives — each renders one piece of UI bound to one slice of `useGradientPicker()` state. The headless hook API (`setAngle`, `setCenter`, `setRadii`, `setRadiusPx`, `setRadialShape`, `setRadialSize`) does not change; only the rendered parts and their compositions do. Three Figma layouts ship as copy-paste recipes on the `/docs` page (no kitchen-sink wrapper).

**Tech Stack:** Next.js 15 / React 19, Tailwind v4 beta, Radix-style compound components, Vitest + happy-dom, shadcn registry artifact (`pnpm registry:build` → `public/r/fill-picker.json`).

---

## Figma reference (what we are building toward)

Three frames in the Figma file (`gradientShape-linear`, `gradientShape-circle`, `gradientShape-ellipses`) define the new side-panel layouts:

- **Linear** (single row, 48 px tall):
  `[angle dial 48×48] [angle input fills remaining width, shows "320 °"]`
- **Radial / Circle** (two rows, 89 px tall total):
  - Row 1: segmented control `[ Circle | Ellipses ]` spanning full width
  - Row 2: `[position pad 48×48] [position input "50 % | 50 %"] [label "Radii"] [radius input "70 %"]`
- **Radial / Ellipses** (two rows, 89 px tall total):
  - Row 1: segmented control `[ Circle | Ellipses ]` spanning full width
  - Row 2: `[position pad 48×48] [position input "50 % | 50 %"]` — **no** angle dial, **no** radii input on the side panel (ellipse radii are dragged on the Area canvas via existing edge handles)

## Design decisions (locked in)

- **Ellipse side panel has no angle dial** (CSS `radial-gradient(ellipse …)` does not rotate; the dial visible in the Figma frame is treated as a designer slip).
- **Size keyword dropdown** (`closest-side` / `closest-corner` / `farthest-side` / `farthest-corner`) is removed from the default layouts but kept as an opt-in primitive `<GradientPicker.RadialSizeSelect>` for advanced consumers.
- **Linear positioned-mode endpoints** (`start`/`end`) remain draggable via the Area overlay; the side-panel UI for them is dropped (Figma shows angle only).
- **Granularity:** ship small primitives, document the three Figma layouts as copy-paste recipes in `/docs/page.tsx`. Follows the `compose-only` convention already documented in `CLAUDE.md`.
- **Hook API unchanged.** `useGradientPicker` setters keep their current signatures; only consumers change.

## File structure

### New files (registry, ship via shadcn)
- `registry/new-york/color-picker/parts/gradient/position-pad.tsx` — 2D pad bound to `gradient.center`, visible for radial + conic
- `registry/new-york/color-picker/parts/gradient/position-input.tsx` — numeric `cx %` / `cy %` paired input
- `registry/new-york/color-picker/parts/gradient/angle-pad.tsx` — dial-only (no numeric input), visible for linear + conic
- `registry/new-york/color-picker/parts/gradient/angle-input.tsx` — numeric angle input, visible for linear + conic
- `registry/new-york/color-picker/parts/gradient/shape-switcher.tsx` — segmented `[Circle | Ellipses]`, visible for radial
- `registry/new-york/color-picker/parts/gradient/radius-input.tsx` — single % radius input bound to `radiusPx` via `containerWidth`; visible only when `shape === "circle"`
- `registry/new-york/color-picker/parts/gradient/ellipse-radii-input.tsx` — paired `rx %`/`ry %` for power users; visible only when `shape === "ellipse"`. Not part of the default Figma layout but shipped as a primitive
- `registry/new-york/color-picker/parts/gradient/radial-size-select.tsx` — extracted keyword `<select>` from current `radial-shape.tsx`; visible for radial only

### Files to delete (registry, ship via shadcn)
- `registry/new-york/color-picker/parts/gradient/angle-dial.tsx`
- `registry/new-york/color-picker/parts/gradient/center-pad.tsx`
- `registry/new-york/color-picker/parts/gradient/radial-shape.tsx`

### Files to modify
- `registry/new-york/color-picker/fill-picker.tsx` — update barrel imports/exports
- `registry.json` — swap deleted file entries for new file entries
- `src/components/hero.tsx` — recompose the gradient panel from new primitives matching the Figma layout
- `src/app/docs/page.tsx` — update four existing demo blocks; add a new "Gradient shape controls" section with three copy-paste recipe code blocks
- `src/app/playground/page.tsx` — update gradient-part toggle list and code generator
- `registry/new-york/color-picker/parts/gradient/overlay.test.tsx` — adapt test imports if needed

### New test files
- `registry/new-york/color-picker/parts/gradient/position-pad.test.tsx`
- `registry/new-york/color-picker/parts/gradient/position-input.test.tsx`
- `registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx`
- `registry/new-york/color-picker/parts/gradient/angle-input.test.tsx`
- `registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx`
- `registry/new-york/color-picker/parts/gradient/radius-input.test.tsx`
- `registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx`
- `registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx`

### Files untouched
- `registry/new-york/color-picker/hooks/use-gradient-picker.ts` — API stable
- `registry/new-york/color-picker/lib/gradient.ts` — types stable
- `registry/new-york/color-picker/contexts/gradient.ts` — context stable
- `registry/new-york/color-picker/hooks/use-gradient-picker.test.ts` — hook tests stay green
- `registry/new-york/color-picker/parts/gradient/area.tsx`, `overlay.tsx`, `bar.tsx`, `stop-*.tsx`, `presets.tsx`, etc. — unaffected

---

## Task 1: New primitive — `PositionPad`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/position-pad.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/position-pad.test.tsx`

This is a near-direct port of `parts/gradient/center-pad.tsx` renamed for consistency with the new vocabulary (the panel calls it "position", reserving "center" for the underlying gradient field name).

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/position-pad.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.PositionPad>", () => {
  it("renders nothing for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionPad data-testid="pad" />
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("pad")).toBeNull();
  });

  it("updates center on click", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.PositionPad data-testid="pad" />
      </GradientPicker.Root>,
    );
    const pad = screen.getByTestId("pad");
    // happy-dom does not lay elements out, so getBoundingClientRect returns zeros;
    // a click at (0,0) should be treated as center (0,0).
    fireEvent.pointerDown(pad, { clientX: 0, clientY: 0 });
    expect(onValueChange).toHaveBeenCalledWith(
      expect.objectContaining({ center: { x: 0, y: 0 } }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/position-pad.test.tsx`
Expected: FAIL — `GradientPicker.PositionPad` is not exported.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/position-pad.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface PositionPadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const PositionPad = React.forwardRef<HTMLDivElement, PositionPadProps>(
  function PositionPad({ className, size = 48, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    const padRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => padRef.current as HTMLDivElement);

    if (ctx.gradient.type === "linear") return null;
    const center = ctx.gradient.center;

    const fromEvent = (clientX: number, clientY: number) => {
      const el = padRef.current;
      if (!el) return center;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return { x: 0, y: 0 };
      return {
        x: Math.max(0, Math.min(1, (clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (clientY - r.top) / r.height)),
      };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      ctx.setCenter(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        ctx.setCenter(fromEvent(ev.clientX, ev.clientY));
      const cleanup = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released on cancel */
        }
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", cleanup);
        target.removeEventListener("pointercancel", cleanup);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", cleanup);
      target.addEventListener("pointercancel", cleanup);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.05 : 0.01;
      const clamp = (n: number) => Math.max(0, Math.min(1, n));
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        ctx.setCenter({ x: clamp(center.x - step), y: center.y });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        ctx.setCenter({ x: clamp(center.x + step), y: center.y });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        ctx.setCenter({ x: center.x, y: clamp(center.y - step) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        ctx.setCenter({ x: center.x, y: clamp(center.y + step) });
      }
    };

    return (
      <div
        ref={padRef}
        data-slot="gradient-position-pad"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        role="application"
        aria-label="Gradient position"
        aria-roledescription="2D pad for gradient center"
        aria-valuetext={`x ${Math.round(center.x * 100)}%, y ${Math.round(center.y * 100)}%`}
        tabIndex={0}
        style={{ width: size, height: size }}
        className={cn(
          "relative shrink-0 cursor-crosshair rounded-md border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "bg-[linear-gradient(to_right,theme(colors.border)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border)_1px,transparent_1px)] bg-[length:33.33%_33.33%]",
          className,
        )}
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

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { PositionPad } from "./parts/gradient/position-pad";` near the other gradient-part imports.
- Add `PositionPad,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/position-pad.test.tsx`
Expected: PASS — both `it()` blocks green.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/position-pad.tsx \
        registry/new-york/color-picker/parts/gradient/position-pad.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.PositionPad primitive"
```

---

## Task 2: New primitive — `PositionInput`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/position-input.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/position-input.test.tsx`

Pair of `cx %` / `cy %` numeric inputs, visible for radial + conic. Matches the Figma "50 % | 50 %" widget.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/position-input.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.PositionInput>", () => {
  it("renders cx and cy inputs and updates center on change", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.PositionInput />
      </GradientPicker.Root>,
    );
    const cx = screen.getByLabelText("Gradient center x percent");
    const cy = screen.getByLabelText("Gradient center y percent");
    expect(cx).toHaveValue(50);
    expect(cy).toHaveValue(50);
    fireEvent.change(cx, { target: { value: "25" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: { x: 0.25, y: 0.5 } }),
      expect.any(String),
    );
    fireEvent.change(cy, { target: { value: "80" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ center: { x: 0.25, y: 0.8 } }),
      expect.any(String),
    );
  });

  it("returns null for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 90, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.PositionInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText("Gradient center x percent")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/position-input.test.tsx`
Expected: FAIL — primitive not exported yet.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/position-input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const PositionInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PositionInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "linear") return null;
  const center = ctx.gradient.center;

  const commit = (axis: "x" | "y", raw: string) => {
    if (raw === "") return;
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    const clamp = (v: number) => Math.max(0, Math.min(1, v / 100));
    ctx.setCenter(
      axis === "x"
        ? { x: clamp(n), y: center.y }
        : { x: center.x, y: clamp(n) },
    );
  };

  return (
    <div
      ref={ref}
      data-slot="gradient-position-input"
      className={cn(
        "inline-flex items-center gap-0 rounded-md border border-border bg-background text-xs text-foreground",
        className,
      )}
      {...rest}
    >
      <label className="inline-flex items-center gap-1 px-2 py-1">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(center.x * 100)}
          onChange={(e) => commit("x", e.target.value)}
          aria-label="Gradient center x percent"
          className="w-10 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        />
        <span className="text-muted-foreground">%</span>
      </label>
      <span aria-hidden className="h-4 w-px bg-border" />
      <label className="inline-flex items-center gap-1 px-2 py-1">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={Math.round(center.y * 100)}
          onChange={(e) => commit("y", e.target.value)}
          aria-label="Gradient center y percent"
          className="w-10 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        />
        <span className="text-muted-foreground">%</span>
      </label>
    </div>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { PositionInput } from "./parts/gradient/position-input";`
- Add `PositionInput,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/position-input.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/position-input.tsx \
        registry/new-york/color-picker/parts/gradient/position-input.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.PositionInput primitive"
```

---

## Task 3: New primitive — `AnglePad`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/angle-pad.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx`

Dial-only split out of the current `AngleDial`. Visible for linear (binds `angle`) and conic (binds `startAngle`).

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.AnglePad>", () => {
  it("returns null for radial gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AnglePad data-testid="pad" />
      </GradientPicker.Root>,
    );
    expect(screen.queryByTestId("pad")).toBeNull();
  });

  it("exposes a slider role with the current angle for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 45, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.AnglePad />
      </GradientPicker.Root>,
    );
    const slider = screen.getByRole("slider", { name: /angle/i });
    expect(slider).toHaveAttribute("aria-valuenow", "45");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx`
Expected: FAIL — primitive not exported.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/angle-pad.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export interface AnglePadProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export const AnglePad = React.forwardRef<HTMLDivElement, AnglePadProps>(
  function AnglePad({ className, size = 48, ...rest }, ref) {
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
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      return (deg + 360) % 360;
    };

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      setAngle(fromEvent(e.clientX, e.clientY));
      const onMove = (ev: PointerEvent) =>
        setAngle(fromEvent(ev.clientX, ev.clientY));
      const cleanup = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* already released on cancel */
        }
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", cleanup);
        target.removeEventListener("pointercancel", cleanup);
      };
      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", cleanup);
      target.addEventListener("pointercancel", cleanup);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 15 : 1;
      let next = angle;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = angle - step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = angle + step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 359;
      else return;
      e.preventDefault();
      setAngle(((next % 360) + 360) % 360);
    };

    return (
      <div
        ref={padRef}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        role="slider"
        aria-label="Gradient angle"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(angle)}
        aria-valuetext={`${Math.round(angle)} degrees`}
        tabIndex={0}
        data-slot="gradient-angle-pad"
        className={cn(
          "relative shrink-0 cursor-grab rounded-full border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        style={{ width: size, height: size }}
        {...rest}
      >
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top -translate-x-1/2 bg-foreground"
          style={{ transform: `translate(-50%, 0) rotate(${angle}deg)` }}
        />
      </div>
    );
  },
);
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { AnglePad } from "./parts/gradient/angle-pad";`
- Add `AnglePad,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/angle-pad.tsx \
        registry/new-york/color-picker/parts/gradient/angle-pad.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.AnglePad primitive"
```

---

## Task 4: New primitive — `AngleInput`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/angle-input.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/angle-input.test.tsx`

Numeric `°` input split out of the current `AngleDial`. The Figma "320 °" pill input fills the row width — expose a `className` so consumers can stretch with `w-full` / `flex-1`.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/angle-input.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.AngleInput>", () => {
  it("shows the current angle and updates on change", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "linear", angle: 90, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.AngleInput />
      </GradientPicker.Root>,
    );
    const input = screen.getByLabelText("Gradient angle in degrees");
    expect(input).toHaveValue(90);
    fireEvent.change(input, { target: { value: "270" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ angle: 270 }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/angle-input.test.tsx`
Expected: FAIL — primitive not exported.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/angle-input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const AngleInput = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(function AngleInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "radial") return null;

  const angle =
    ctx.gradient.type === "linear"
      ? ctx.gradient.angle
      : ctx.gradient.startAngle;
  const setAngle =
    ctx.gradient.type === "linear" ? ctx.setAngle : ctx.setStartAngle;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseFloat(e.target.value);
    if (Number.isFinite(n)) setAngle(((n % 360) + 360) % 360);
  };

  return (
    <label
      ref={ref}
      data-slot="gradient-angle-input"
      className={cn(
        "inline-flex h-12 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-sm text-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        max={360}
        step={1}
        value={Math.round(angle)}
        onChange={onChange}
        aria-label="Gradient angle in degrees"
        className="w-16 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      />
      <span className="text-muted-foreground">°</span>
    </label>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { AngleInput } from "./parts/gradient/angle-input";`
- Add `AngleInput,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/angle-input.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/angle-input.tsx \
        registry/new-york/color-picker/parts/gradient/angle-input.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.AngleInput primitive"
```

---

## Task 5: New primitive — `ShapeSwitcher`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/shape-switcher.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx`

The full-width segmented control `[ Circle | Ellipses ]` from the Figma layouts. Returns null for non-radial gradients.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.ShapeSwitcher>", () => {
  it("returns null for non-radial gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.ShapeSwitcher />
      </GradientPicker.Root>,
    );
    expect(screen.queryByRole("tab", { name: "Circle" })).toBeNull();
  });

  it("renders two tabs and switches shape", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.ShapeSwitcher />
      </GradientPicker.Root>,
    );
    const ellipsesTab = screen.getByRole("tab", { name: "Ellipses" });
    fireEvent.click(ellipsesTab);
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ shape: "ellipse" }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx`
Expected: FAIL — primitive not exported.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/shape-switcher.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

const OPTIONS = [
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipses" },
] as const;

export const ShapeSwitcher = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function ShapeSwitcher({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  const current = ctx.gradient.shape;

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Radial gradient shape"
      data-slot="gradient-shape-switcher"
      className={cn(
        "inline-flex w-full rounded-md bg-muted p-[3px] gap-[2px]",
        className,
      )}
      {...rest}
    >
      {OPTIONS.map(({ value, label }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => ctx.setRadialShape(value)}
            className={cn(
              "flex-1 rounded-sm px-3 py-1 text-xs font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { ShapeSwitcher } from "./parts/gradient/shape-switcher";`
- Add `ShapeSwitcher,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/shape-switcher.tsx \
        registry/new-york/color-picker/parts/gradient/shape-switcher.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.ShapeSwitcher primitive"
```

---

## Task 6: New primitive — `RadiusInput` (circle radius %)

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/radius-input.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/radius-input.test.tsx`

Single `%` input bound to `radiusPx`, displayed as a percentage of the picker's `containerWidth` (matches the existing `RadialShape` semantics, just split out). Returns null when shape is not `circle`.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/radius-input.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.RadiusInput>", () => {
  it("returns null for ellipse shape", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "ellipse", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.RadiusInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText(/circle radius/i)).toBeNull();
  });

  it("updates radiusPx via setRadiusPx when typed", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", radiusPx: 100, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.RadiusInput />
      </GradientPicker.Root>,
    );
    // Without an Area mounted, containerWidth is null, so display is in px.
    const input = screen.getByLabelText(/circle radius/i);
    expect(input).toHaveValue(100);
    fireEvent.change(input, { target: { value: "150" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ radiusPx: 150 }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/radius-input.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/radius-input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const RadiusInput = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(function RadiusInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "circle") return null;
  const g = ctx.gradient;
  const usePercent = !!ctx.containerWidth;
  const display = (() => {
    if (g.radiusPx === undefined) return "";
    return usePercent
      ? Math.round((g.radiusPx / (ctx.containerWidth as number)) * 100)
      : Math.round(g.radiusPx);
  })();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v === "") {
      ctx.setRadiusPx(undefined);
      return;
    }
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return;
    if (!usePercent) {
      ctx.setRadiusPx(Math.max(0, n));
      return;
    }
    ctx.setRadiusPx(Math.max(0, (n / 100) * (ctx.containerWidth as number)));
  };

  return (
    <label
      ref={ref}
      data-slot="gradient-radius-input"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        step={1}
        value={display}
        placeholder="auto"
        onChange={onChange}
        aria-label={
          usePercent
            ? "Circle radius as percent of Area width"
            : "Circle radius in pixels"
        }
        className="w-12 bg-transparent text-right outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      />
      <span className="text-muted-foreground">{usePercent ? "%" : "px"}</span>
    </label>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { RadiusInput } from "./parts/gradient/radius-input";`
- Add `RadiusInput,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/radius-input.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/radius-input.tsx \
        registry/new-york/color-picker/parts/gradient/radius-input.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.RadiusInput primitive"
```

---

## Task 7: New primitive — `EllipseRadiiInput`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/ellipse-radii-input.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx`

`rx % × ry %` paired input, visible only when `shape === "ellipse"`. Not in the default Figma layout (ellipse radii are drag-only on the Area canvas) but shipped as a primitive for advanced consumers.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.EllipseRadiiInput>", () => {
  it("returns null for circle shape", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.EllipseRadiiInput />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText(/ellipse horizontal radius/i)).toBeNull();
  });

  it("updates rx and ry independently", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "ellipse", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", radii: { x: 0.3, y: 0.6 }, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.EllipseRadiiInput />
      </GradientPicker.Root>,
    );
    const rx = screen.getByLabelText(/ellipse horizontal radius/i);
    const ry = screen.getByLabelText(/ellipse vertical radius/i);
    expect(rx).toHaveValue(30);
    expect(ry).toHaveValue(60);
    fireEvent.change(rx, { target: { value: "50" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ radii: { x: 0.5, y: 0.6 } }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/ellipse-radii-input.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";

export const EllipseRadiiInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function EllipseRadiiInput({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  if (ctx.gradient.shape !== "ellipse") return null;
  const g = ctx.gradient;

  const commit = (axis: "x" | "y", raw: string) => {
    if (raw === "") {
      ctx.setRadii(undefined);
      return;
    }
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    const current = g.radii ?? { x: 0, y: 0 };
    ctx.setRadii(
      axis === "x"
        ? { x: Math.max(0, n / 100), y: current.y }
        : { x: current.x, y: Math.max(0, n / 100) },
    );
  };

  return (
    <div
      ref={ref}
      data-slot="gradient-ellipse-radii-input"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
      {...rest}
    >
      <input
        type="number"
        min={0}
        step={1}
        value={g.radii ? Math.round(g.radii.x * 100) : ""}
        placeholder="auto"
        onChange={(e) => commit("x", e.target.value)}
        aria-label="Ellipse horizontal radius percent"
        className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span aria-hidden>×</span>
      <input
        type="number"
        min={0}
        step={1}
        value={g.radii ? Math.round(g.radii.y * 100) : ""}
        placeholder="auto"
        onChange={(e) => commit("y", e.target.value)}
        aria-label="Ellipse vertical radius percent"
        className="h-7 w-12 rounded border border-border bg-background px-1 text-right text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <span>%</span>
    </div>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { EllipseRadiiInput } from "./parts/gradient/ellipse-radii-input";`
- Add `EllipseRadiiInput,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/ellipse-radii-input.tsx \
        registry/new-york/color-picker/parts/gradient/ellipse-radii-input.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.EllipseRadiiInput primitive"
```

---

## Task 8: New primitive — `RadialSizeSelect`

**Files:**
- Create: `registry/new-york/color-picker/parts/gradient/radial-size-select.tsx`
- Test: `registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx`

The keyword `<select>` extracted from the current `RadialShape`. Not in the new Figma layout but shipped as an opt-in primitive.

- [ ] **Step 1: Write the failing test**

```tsx
// registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GradientPicker } from "../../fill-picker";

describe("<GradientPicker.RadialSizeSelect>", () => {
  it("returns null for linear gradients", () => {
    render(
      <GradientPicker.Root defaultValue={{ type: "linear", angle: 0, interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}>
        <GradientPicker.RadialSizeSelect />
      </GradientPicker.Root>,
    );
    expect(screen.queryByLabelText("Radial size")).toBeNull();
  });

  it("changes size keyword", () => {
    const onValueChange = vi.fn();
    render(
      <GradientPicker.Root
        defaultValue={{ type: "radial", shape: "circle", center: { x: 0.5, y: 0.5 }, size: "farthest-corner", interp: "oklch", stops: [{ color: { l: 0, c: 0, h: 0, alpha: 1 }, position: 0 }, { color: { l: 1, c: 0, h: 0, alpha: 1 }, position: 1 }] }}
        onValueChange={onValueChange}
      >
        <GradientPicker.RadialSizeSelect />
      </GradientPicker.Root>,
    );
    const select = screen.getByLabelText("Radial size");
    fireEvent.change(select, { target: { value: "closest-side" } });
    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: "closest-side" }),
      expect.any(String),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create the part**

```tsx
// registry/new-york/color-picker/parts/gradient/radial-size-select.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import type { RadialSizeKeyword } from "../../lib/gradient";

const SIZE_OPTIONS: RadialSizeKeyword[] = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
];

export const RadialSizeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function RadialSizeSelect({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type !== "radial") return null;
  return (
    <select
      ref={ref}
      data-slot="gradient-radial-size-select"
      value={ctx.gradient.size}
      onChange={(e) => ctx.setRadialSize(e.target.value as RadialSizeKeyword)}
      aria-label="Radial size"
      className={cn(
        "h-8 rounded-md border border-border bg-background px-2 text-xs",
        className,
      )}
      {...rest}
    >
      {SIZE_OPTIONS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
});
```

- [ ] **Step 4: Wire the export**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Add `import { RadialSizeSelect } from "./parts/gradient/radial-size-select";`
- Add `RadialSizeSelect,` to the `GradientPicker` namespace export object.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/radial-size-select.tsx \
        registry/new-york/color-picker/parts/gradient/radial-size-select.test.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Add GradientPicker.RadialSizeSelect primitive"
```

---

## Task 9: Recompose the hero demo

**Files:**
- Modify: `src/components/hero.tsx:340-345` (the three lines that currently render `AngleDial / CenterPad / RadialShape`)

Replace the three lines with type-driven Figma-layout composition. The new block reads the current gradient from the context (`useGradientPickerContext`) — split into a small helper component so `hero.tsx` stays declarative.

- [ ] **Step 1: Locate the affected block**

Run: `grep -n "AngleDial\|CenterPad\|RadialShape" src/components/hero.tsx`
Expected output:
```
342:        <GradientPicker.AngleDial />
343:        <GradientPicker.CenterPad />
344:        <GradientPicker.RadialShape />
```

- [ ] **Step 2: Replace with the new layout helper**

In `src/components/hero.tsx`, remove the three lines `GradientPicker.AngleDial`, `GradientPicker.CenterPad`, `GradientPicker.RadialShape` and replace with a single `<GradientShapeControls />` element. Define `GradientShapeControls` near the top of the file (after the imports):

```tsx
// src/components/hero.tsx
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";

function GradientShapeControls() {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "linear") {
    return (
      <div className="flex items-center gap-2">
        <GradientPicker.AnglePad />
        <GradientPicker.AngleInput className="flex-1" />
      </div>
    );
  }
  if (ctx.gradient.type === "radial") {
    return (
      <div className="flex flex-col gap-2">
        <GradientPicker.ShapeSwitcher />
        <div className="flex items-center gap-2">
          <GradientPicker.PositionPad />
          <GradientPicker.PositionInput />
          {ctx.gradient.shape === "circle" && (
            <>
              <span className="text-xs text-muted-foreground">Radii</span>
              <GradientPicker.RadiusInput className="flex-1" />
            </>
          )}
        </div>
      </div>
    );
  }
  // conic
  return (
    <div className="flex items-center gap-2">
      <GradientPicker.PositionPad />
      <GradientPicker.PositionInput />
      <GradientPicker.AnglePad />
      <GradientPicker.AngleInput className="flex-1" />
    </div>
  );
}
```

- [ ] **Step 3: Run the build to check the dev site still renders**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manually verify in browser**

Start the dev server with `pnpm dev`. Open `http://localhost:3000`, open the gradient picker, and verify:
- Linear: angle dial + angle input row only
- Radial / Circle: shape switcher row + position pad + position input + "Radii" label + radius input
- Radial / Ellipses: shape switcher row + position pad + position input only (no angle, no radii input)

- [ ] **Step 5: Commit**

```bash
git add src/components/hero.tsx
git commit -m "Recompose hero gradient panel with new shape primitives"
```

---

## Task 10: Update the playground

**Files:**
- Modify: `src/app/playground/page.tsx:111-113` (toggle definitions)
- Modify: `src/app/playground/page.tsx:670-734` (gradient part rendering)
- Modify: `src/app/playground/page.tsx:1128-1130` (code-generator output)

Replace the three toggles (`angleDial`, `centerPad`, `radialShape`) with the new primitive set (`positionPad`, `positionInput`, `anglePad`, `angleInput`, `shapeSwitcher`, `radiusInput`, `ellipseRadiiInput`, `radialSizeSelect`). Keep the playground "everything possible" — order toggles roughly in the order they appear in the Figma layouts.

- [ ] **Step 1: Update the toggle definitions**

Find the `gradientParts` toggle list (search for `centerPad`). Replace the three entries with:
```ts
{ key: "shapeSwitcher", label: "ShapeSwitcher" },
{ key: "positionPad", label: "PositionPad" },
{ key: "positionInput", label: "PositionInput" },
{ key: "anglePad", label: "AnglePad" },
{ key: "angleInput", label: "AngleInput" },
{ key: "radiusInput", label: "RadiusInput" },
{ key: "ellipseRadiiInput", label: "EllipseRadiiInput" },
{ key: "radialSizeSelect", label: "RadialSizeSelect" },
```

Update the corresponding state interface and default values (both spots that currently mention `angleDial`/`centerPad`/`radialShape`) to match the new keys.

- [ ] **Step 2: Update the render blocks**

Replace the three render lines at line ~670 and ~732 with the eight new conditional renders, e.g.:
```tsx
{gradientParts.shapeSwitcher && <GradientPicker.ShapeSwitcher />}
{gradientParts.positionPad && <GradientPicker.PositionPad />}
{gradientParts.positionInput && <GradientPicker.PositionInput />}
{gradientParts.anglePad && <GradientPicker.AnglePad />}
{gradientParts.angleInput && <GradientPicker.AngleInput />}
{gradientParts.radiusInput && <GradientPicker.RadiusInput />}
{gradientParts.ellipseRadiiInput && <GradientPicker.EllipseRadiiInput />}
{gradientParts.radialSizeSelect && <GradientPicker.RadialSizeSelect />}
```

- [ ] **Step 3: Update the code generator**

At ~line 1128, replace the three `lines.push(...)` calls with the eight new ones, e.g.:
```ts
if (parts.shapeSwitcher) lines.push(`${indent}<GradientPicker.ShapeSwitcher />`);
if (parts.positionPad) lines.push(`${indent}<GradientPicker.PositionPad />`);
if (parts.positionInput) lines.push(`${indent}<GradientPicker.PositionInput />`);
if (parts.anglePad) lines.push(`${indent}<GradientPicker.AnglePad />`);
if (parts.angleInput) lines.push(`${indent}<GradientPicker.AngleInput />`);
if (parts.radiusInput) lines.push(`${indent}<GradientPicker.RadiusInput />`);
if (parts.ellipseRadiiInput) lines.push(`${indent}<GradientPicker.EllipseRadiiInput />`);
if (parts.radialSizeSelect) lines.push(`${indent}<GradientPicker.RadialSizeSelect />`);
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Manually verify in browser**

`pnpm dev`, open `/playground`, toggle each new gradient-part checkbox, verify the rendered picker and generated code block match.

- [ ] **Step 6: Commit**

```bash
git add src/app/playground/page.tsx
git commit -m "Swap playground gradient toggles for new primitives"
```

---

## Task 11: Update the docs page

**Files:**
- Modify: `src/app/docs/page.tsx` — replace all four current demos that still reference `AngleDial`/`CenterPad`/`RadialShape` (lines 834-836, 918-919, 1171-1173, 1274-1275), and update the prose at 175 and 194-215.
- Modify: `src/app/docs/page.tsx` — add a new "Gradient shape controls" section with three copy-paste recipe code blocks for the Figma layouts.

- [ ] **Step 1: Replace each existing demo block**

For each of the four `<GradientPicker.AngleDial /> <GradientPicker.CenterPad /> <GradientPicker.RadialShape />` triplets, replace with the inline `GradientShapeControls`-style block from Task 9, lifted into the docs page (or inline a small `RecipeShape` helper component co-located with the docs). Verify each demo still mounts and renders correctly via `pnpm dev`.

- [ ] **Step 2: Update prose**

- Line 175: change the sentence currently mentioning `AngleDial` to mention `AnglePad` / `AngleInput` instead.
- Lines 194-215: rewrite the paragraph describing the `AngleDial` / `CenterPad` complementarity to describe the new primitives. Add a sentence noting that `setRadialSize`/`RadialSizeSelect` is opt-in.

- [ ] **Step 3: Add the Figma recipes section**

After the existing gradient docs, add a new H2 section titled "Gradient shape controls" containing three labeled code blocks (`Linear`, `Radial · Circle`, `Radial · Ellipse`), each holding the literal JSX a consumer copy-pastes. Example for the linear block:

````tsx
<GradientPicker.Root>
  {/* …area, bar, stops, etc… */}
  <div className="flex items-center gap-2">
    <GradientPicker.AnglePad />
    <GradientPicker.AngleInput className="flex-1" />
  </div>
</GradientPicker.Root>
````

Provide the analogous blocks for circle and ellipse based on Task 9's `GradientShapeControls`.

- [ ] **Step 4: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors.

- [ ] **Step 5: Manually verify in browser**

`pnpm dev`, open `/docs`, scroll to the new "Gradient shape controls" section, verify each demo renders the correct Figma layout per type, copy a recipe and visually compare.

- [ ] **Step 6: Commit**

```bash
git add src/app/docs/page.tsx
git commit -m "Update docs demos and add gradient shape recipes"
```

---

## Task 12: Delete the old parts and refresh the barrel

**Files:**
- Delete: `registry/new-york/color-picker/parts/gradient/angle-dial.tsx`
- Delete: `registry/new-york/color-picker/parts/gradient/center-pad.tsx`
- Delete: `registry/new-york/color-picker/parts/gradient/radial-shape.tsx`
- Modify: `registry/new-york/color-picker/fill-picker.tsx` — drop imports and namespace entries for `AngleDial`, `CenterPad`, `RadialShape`

- [ ] **Step 1: Verify nothing else still imports the doomed parts**

Run: `grep -rn "AngleDial\|CenterPad\|RadialShape" src registry --include="*.ts" --include="*.tsx"`
Expected: only matches inside `fill-picker.tsx` (barrel) and possibly tests we have not yet updated. If any other consumer still references them, fix that consumer first.

- [ ] **Step 2: Delete the files**

```bash
rm registry/new-york/color-picker/parts/gradient/angle-dial.tsx
rm registry/new-york/color-picker/parts/gradient/center-pad.tsx
rm registry/new-york/color-picker/parts/gradient/radial-shape.tsx
```

- [ ] **Step 3: Update the barrel**

Edit `registry/new-york/color-picker/fill-picker.tsx`:
- Remove the three imports.
- Remove `AngleDial,`, `CenterPad,`, `RadialShape,` from the namespace export object.

- [ ] **Step 4: Run the full test + typecheck + lint**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: no errors, all tests pass (including the eight new primitive tests).

- [ ] **Step 5: Commit**

```bash
git add registry/new-york/color-picker/parts/gradient/angle-dial.tsx \
        registry/new-york/color-picker/parts/gradient/center-pad.tsx \
        registry/new-york/color-picker/parts/gradient/radial-shape.tsx \
        registry/new-york/color-picker/fill-picker.tsx
git commit -m "Drop old AngleDial, CenterPad, RadialShape parts"
```

---

## Task 13: Refresh the shadcn registry manifest

**Files:**
- Modify: `registry.json` — swap deleted file entries for the new file entries

The build script `scripts/build-registry.ts` reads `registry.json` literally — any part not listed there is not shipped to consumers.

- [ ] **Step 1: Remove deleted entries**

In `registry.json`, delete the three `files[]` entries whose `path` ends in `angle-dial.tsx`, `center-pad.tsx`, `radial-shape.tsx`.

- [ ] **Step 2: Add new entries**

Add eight new entries with the standard shape (use the existing entries as templates), one for each new file:

```json
{
  "path": "registry/new-york/color-picker/parts/gradient/position-pad.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/position-pad.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/position-input.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/position-input.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/angle-pad.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/angle-pad.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/angle-input.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/angle-input.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/shape-switcher.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/shape-switcher.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/radius-input.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/radius-input.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/ellipse-radii-input.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/ellipse-radii-input.tsx"
},
{
  "path": "registry/new-york/color-picker/parts/gradient/radial-size-select.tsx",
  "type": "registry:ui",
  "target": "components/ui/fill-picker/parts/gradient/radial-size-select.tsx"
}
```

- [ ] **Step 3: Rebuild the registry artifact**

Run: `pnpm registry:build`
Expected: writes `public/r/fill-picker.json` (gitignored) and `public/r/registry.json`. No errors.

- [ ] **Step 4: Verify the artifact contains the new parts**

Run: `grep -o 'parts/gradient/[a-z-]*\.tsx' public/r/fill-picker.json | sort -u`
Expected output includes all eight new files and none of the three deleted ones.

- [ ] **Step 5: Run the full build**

Run: `pnpm build`
Expected: Next build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add registry.json
git commit -m "Refresh registry manifest for new gradient primitives"
```

---

## Task 14: Final sweep

**Files:**
- All

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`
Expected: every test passes (existing `use-gradient-picker.test.ts`, `overlay.test.tsx`, `bar.test.tsx`, plus all eight new primitive tests).

- [ ] **Step 2: Final grep sanity check**

Run: `grep -rn "AngleDial\|CenterPad\|RadialShape" src registry --include="*.ts" --include="*.tsx"`
Expected: zero matches (no lingering references anywhere).

- [ ] **Step 3: Push**

Run: `git push`
Expected: branch updated.

---

## Self-review checklist

- [ ] All three Figma frames (`gradientShape-linear`, `gradientShape-circle`, `gradientShape-ellipses`) have a corresponding recipe in `/docs`.
- [ ] No `AngleDial`/`CenterPad`/`RadialShape` references remain anywhere in `src/` or `registry/`.
- [ ] `useGradientPicker` hook surface is untouched — no breaking changes to consumers using it directly.
- [ ] Every new primitive returns `null` for gradient types/shapes where it does not apply (linear / radial-circle / radial-ellipse).
- [ ] `registry.json` is the source of truth — added entries match deleted entries one-for-one (or with deliberate net additions) and `pnpm registry:build` emits the expected artifact.
- [ ] Tests cover: visibility gating per type/shape, the primary write path (typing / clicking → context setter called), and at least one keyboard interaction where applicable.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.

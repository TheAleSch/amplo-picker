# Stretched-gamut color area — design

**Date:** 2026-05-05
**Status:** Design approved, ready for implementation plan
**Affected component:** `registry/new-york/color-picker/parts/area.tsx`

## Problem

Today's color area renders a perceptual lightness×chroma plane and masks pixels outside the active output gamut as transparent. Users see a void in the upper-right of the square. The bead can be dragged into the void; we just landed a fix that clamps the picked OKLCH to the gamut boundary so the bead snaps to the white cutoff line.

The user wants the Framer-style behavior: the entire square is filled with in-gamut color, and the gamut boundary appears as a thin warning line *inside* the fill rather than a hard cliff between color and void.

## Goals

- Every pixel inside the area paints a real, in-gamut color for the active render gamut. No transparent zone.
- A warning line marks the sRGB cutoff whenever the render gamut is wider than sRGB.
- A second warning line marks the P3 cutoff when the render gamut is Rec.2020 (OKLCH/OKLab output).
- The render gamut is determined solely by the output format, never by the user's monitor capability.

## Non-goals

- Changing the output formatters or how `setColor` is called externally.
- Supporting render gamuts beyond Rec.2020.
- Adding a `<canvas colorSpace="rec2020">` path. Browsers do not expose that; we accept the P3 visual ceiling and use the P3 warning line to mark the visual collapse.
- Re-architecting `hsv-sv` away. After warping it is mathematically equivalent to `oklch-cl`, but it stays as a named mode so consumers who use HSV terminology don't need to rewire their props.

## The model

### Render gamut by output format

| Output format | Render gamut | Warning lines |
|---|---|---|
| `hex`, `rgb`, `hsl`, `hsb` | sRGB | none |
| `p3` | P3 | sRGB cutoff |
| `oklch`, `oklab` | Rec.2020 | sRGB cutoff and P3 cutoff |

The render gamut depends on the format only — never on `window.matchMedia("(color-gamut: p3)")`. Display capability still affects the canvas's `colorSpace` (`"display-p3"` when supported, `"srgb"` otherwise) so in-P3 colors paint accurately, but the picker semantics are identical on a sRGB-only and a P3 monitor.

### Coordinate warping

For modes that have a chroma axis, that axis no longer represents absolute chroma. It represents *saturation* — chroma normalized to the maximum chroma reachable at the current lightness, hue, and render gamut.

| Mode | Y axis | X axis (today) | X axis (after) |
|---|---|---|---|
| `oklch-cl` | lightness L (1 at top) | absolute chroma 0…`chromaMax` | saturation = c / max\_c(L, H, render\_gamut) |
| `oklch-hc` | absolute chroma 0…`chromaMax` (1−Y) | hue 0…360 | unchanged on X. Y becomes c / max\_c(L\_fixed, H, render\_gamut) |
| `hsv-sv` | value V = L | s × v × `chromaMax` | saturation = c / max\_c(V, H, render\_gamut) |

After warping, `oklch-cl` and `hsv-sv` are mathematically equivalent — both have Y = L and X = saturation. `hsv-sv` is kept as a named mode for users who think in HSV terms; the implementation can share the same code path.

The `chromaMax` prop becomes a non-op for the warped modes (the actual maximum is derived from `max_c`). Keep it on the public API to avoid a breaking change; document that it is ignored when the area is in stretched mode.

The classical tradeoff applies: moving the hue slider rescales the X axis, so the bead's position in the square is hue-relative. Two areas at X = 0.7 with different hues are not the same chroma in OKLCH numbers — they are the same saturation %.

### Warning lines

Computed by the existing marching-squares pipeline in `computeGamutPaths` against the corresponding `gamutSignedDistance` calls.

- **sRGB line.** Drawn whenever render gamut ≠ sRGB. Inner of the two when both are present.
- **P3 line.** Drawn only when render gamut is Rec.2020 (i.e., output format is OKLCH/OKLab). Outer of the two.

Styling for both lines: 1 px stroke, white at 60% opacity, with a 3 px dark halo (`rgba(0,0,0,0.55)`) underneath for legibility against bright fill regions. Same styling for both — relative position implies which is which (sRGB is always nested inside P3).

### Bead clamping

With warping, every (X, Y) in the unit square maps to chroma `X * max_c`, which is in-gamut by construction. `moveTo` therefore produces in-gamut OKLCH on every path that originates from pointer/keyboard. The existing `toGamut` call in `moveTo` becomes defensive — a no-op for area-driven updates, retained as protection against numerical drift at the boundary.

When an external `setColor` call (typing, paste, programmatic update) supplies an OKLCH value with chroma above `max_c(L, H, render_gamut)`:
- The bead positions to X = 1 (right edge).
- The internal color state preserves the user-supplied value.
- The next pointer interaction with the area resolves the conflict by clamping to in-gamut and replacing state.

This is the existing typed-out-of-range pattern; no behavior change.

## Implementation strategy

### `findMaxChroma(L, H, gamut): number`

Bisection in OKLCH chroma. Each step converts the candidate `{L, c, H}` to linear RGB of the target gamut via inline matrix math (already in `area.tsx` for sRGB and P3, plus a new `linRec2020FromOklab` path), then checks whether all three channels lie in `[-ε, 1+ε]`. ~12 iterations gives 0.0001 chroma precision.

Lives in `lib/color.ts`. Exported. Pure, no allocations beyond a single result number.

### Per-paint LUT

Each repaint, the variable axis has `resolution` samples. Build a `Float32Array` of `max_c` values keyed by the moving axis:

| Mode | LUT keyed by | Length |
|---|---|---|
| `oklch-cl` | row j (lightness) | `resolution` |
| `oklch-hc` | column i (hue) | `resolution` |
| `hsv-sv` | row j (value) | `resolution` |

`resolution × 12 ≈ 1920` bisection steps per build; each step is 3 matrix-mults plus a range check (~30 ns). Total LUT cost: ~60 µs per repaint. Negligible compared to the existing 25 600-pixel paint.

Repaints are already memoized to the *fixed* axis of the mode (see [`area.tsx:79`](registry/new-york/color-picker/parts/area.tsx#L79)), so the LUT only rebuilds when the locked axis changes — not every pointer tick.

### Per-pixel render

```
maxC = LUT[movingAxisIndex]
absC = X * maxC
linRgb = oklchToLinearRgb(L, absC, H)        // existing matrix
encoded = linearToSrgb(canvasIsP3 ? linSrgbToLinP3(linRgb) : linRgb)
write encoded × 255 with alpha = 255
```

No per-pixel out-of-gamut check, no transparency. The fill always covers the square.

### Warning line render

`computeGamutPaths` is called once per visible warning line (0, 1, or 2 calls) and the resulting SVG paths overlay the canvas. The function is unchanged; just invoked with both `"srgb"` and `"p3"` when the format calls for it.

`gamutSignedDistance` currently calls culori per sample (`toRgb`, `toP3`, `toRec2020`). At 128² × 2 = 32 768 calls per OKLCH-mode repaint, this becomes the new perf hot spot. Port `gamutSignedDistance` to the same inline-matrix path used by `findMaxChroma` to keep paths fast. (Same end behavior — culori's gamma-encoded RGB has the same zero crossings as linear RGB, which is what the function relies on.)

### Render gamut math for OKLCH/OKLab

The canvas paint uses linear sRGB values regardless of internal gamut, then either keeps them as sRGB or transforms to linear P3 before encoding (depending on `canvasIsP3`). For OKLCH/OKLab mode the internal LUT and warping go up to Rec.2020 chroma, but the per-pixel paint still goes through linear sRGB → linear P3 (or sRGB clip) for the canvas. Pixels outside P3 collapse to the P3 boundary visually. The P3 warning line marks where this happens.

The bead's CSS background is `formatColor({ ...color, alpha: 1 }, "oklch")`. Browsers gamut-map OKLCH the same way, so the bead also caps at P3 visually. State is exact, paint is approximate beyond P3 — consistent with how every other CSS color renderer works today.

## Files affected

- **`registry/new-york/color-picker/parts/area.tsx`** — bulk of the change. New warped `sample` and `positionFor`, LUT build, `findMaxChroma` import, dual-line render path. Strip the per-pixel out-of-gamut transparency mask.
- **`registry/new-york/color-picker/lib/color.ts`** — extract `linSrgbToLinP3`, `linSrgbToLinRec2020`, and `oklchToLinearRgb` matrices into shared helpers. Add `findMaxChroma`. Port `gamutSignedDistance` to the inline-matrix path. Keep public API stable.
- **`registry/new-york/color-picker/lib/color.test.ts`** — add coverage for `findMaxChroma`: zero at L=0 and L=1, monotonicity in L for fixed H, gamut nesting (max_c\_srgb ≤ max_c\_p3 ≤ max_c\_rec2020).
- **`registry/new-york/color-picker/parts/area.test.tsx`** *(new)* — render the area, snapshot the produced canvas pixel histogram for two formats, assert no fully-transparent pixels exist when in stretched mode and that warning paths are present in OKLCH mode (count = 2) vs P3 mode (count = 1).

## Testing strategy

- Unit tests for `findMaxChroma` (lib/color).
- Snapshot-style test for `Area` painted output: walk the canvas pixels and verify `alpha = 255` everywhere when in stretched mode, plus that the OKLCH-format render produces two SVG paths and the P3-format render produces one.
- Visual smoke test in dev: cycle through hex / p3 / oklch in the demo page, verify the area fills with no void in any combination.

## Out of scope

- Adding a Rec.2020 output format.
- Changing the format dropdown order or labels.
- Re-styling the popover or sliders.
- Per-pixel chroma-reduction rendering ("show what this color would clip to in sRGB"). The warning line conveys this; replicating it as fill would double the per-pixel cost without comparable signal.

## Open follow-ups (after this ships)

- Memoize `findMaxChroma` results across paints when the fixed axis hasn't changed (could keep a `WeakRef`-keyed cache).
- Consider a `gamut` prop override that lets consumers pin the render gamut independent of format (e.g. an OKLCH input with a sRGB-only preview).

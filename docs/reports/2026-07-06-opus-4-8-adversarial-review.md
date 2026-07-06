# Base UI variant adversarial review — `registry/new-york/fill-picker-base`
2026-07-06 · opus-4-8

## Prompt
> review base ui code and fix all issues prsitine code

## Scope
The Base UI variant of the color picker only — the 8 files under
`registry/new-york/fill-picker-base/` (6 parts + `color-picker.tsx` barrel +
`hue.test.tsx`). The shared engine (`hooks/`, `context.tsx`, `lib/`) and the
imported Radix-original parts (`root`, `area`, `css-input`, `gamut-badge`,
`contrast-readout`, `preview`, `eye-dropper`) were treated as out of scope —
they are shared, already tested, and not re-implemented by this variant.

Branch `treasure-melody`, from commit `d14b7f7`. Baseline: 103/103 tests green.
Gate mode (fix-all), refuter panel (correctness · a11y+API-conformance ·
smells/drift), every finding verified against the real `@base-ui/react@1.5.0`
source in `node_modules` before fixing, one adversarial re-verify round after.

## Fixed

| # | Sev | File(s) | Defect → fix |
|---|-----|---------|--------------|
| 1 | High | hue/lightness/alpha | **Slider had no visible keyboard focus indicator.** `focus-visible:ring-*` sat on the Thumb `<div>`, but Base UI renders the `role="slider"` `<input>` as a *child* of that div, so `:focus-visible` never matched and the input's native outline is clipped by `visuallyHidden`. → `has-[:focus-visible]:ring-*` on the Thumb (matches when the descendant input is keyboard-focused; Field-independent). Note: `data-[focused]` was rejected — that attribute only appears inside a `Field.Root`, which this variant doesn't use. |
| 2 | High | hue/lightness/alpha | **Slider control had no accessible name.** `aria-label` was on `Slider.Root` (a `role="group"`), not the `role="slider"` input. Base UI reads the thumb's name from `aria-label`/`aria-labelledby` on `Slider.Thumb` (`SliderThumb.js:229-232`). → moved `aria-label` to `Slider.Thumb`. |
| 3 | Important | hue/lightness/alpha | **Vertical gradient inverted.** Base UI anchors the vertical thumb from the bottom edge (`startEdge='bottom'`, `SliderThumb.js:193/219`), so min sits at the bottom — but the gradients were painted `to bottom` (min color at top), copied verbatim from the Radix original which positioned min at the top. → vertical branch now paints `to top`. |
| 4 | Medium | hue/lightness/alpha | **`aria-valuetext` dropped** vs the Radix original ("N degrees" / "N%"). Base UI's default value text is `undefined` when no `format`/`getAriaValueText` is given. → added `getAriaValueText` on the Thumb. |
| 5 | Medium | hue/lightness/alpha/format-switcher | **API surface split 2-vs-4.** `swatches`/`channel-input` were `forwardRef` + spread `...rest`; these four silently dropped `ref`/`id`/`data-*`/`style`, diverging from the Radix originals (all `forwardRef`) and from each other. → all four converted to `forwardRef` + `...rest`; slider interfaces `Omit` `defaultValue` (Slider.Root types it numeric); format-switcher forwards `ref`/rest to `Select.Trigger`. |
| 6 | Low | channel-input, alpha, format-switcher, hue.test | Dead `sr-only` label span (the `NumberField.Input` already has its own `aria-label`); dead `import * as React` (resolved for alpha/format-switcher by the `forwardRef` conversion, removed from the test). |

`hue.test.tsx` was strengthened: it now asserts the `role="slider"` element
resolves the "Hue" accessible name, carries `aria-valuetext="120 degrees"`, and
that the focus-ring class sits on an ancestor of the focusable input (guards the
structural assumption behind fix #1).

## Not fixed (stated rationale)

- **Drag granularity `step={1}`** (1°/1% snap on pointer drag) vs the Radix
  original's continuous ratio. Kept: `step` also drives keyboard step, and the
  original moved 1 unit per arrow key; lowering it to sub-unit would break
  keyboard parity and the `hue.test` expectation for a marginal drag-fidelity
  gain. Integer °/% is reasonable.
- **Duplicate preset strings both render checked** in `Swatches`. Pre-existing
  in the Radix original, malformed-input edge case — not a port regression.
- **`CHECKERBOARD` constant duplicated** across `alpha`/`swatches`. Pre-existing,
  low value, and the two definitions differ (12px vs 8px tile).
- **Redundant `culori`/`tooltip`/`button`/`input`/`popover` in the registry
  item's deps** — resolved transitively via the `color-picker` registryDependency;
  harmless, not a break.

## Verified-correct (refuted, no change)

- `channel-input` paste-merge: `useRenderElement` merges `[inputProps, validation,
  elementProps]` and mergeProps runs handlers right-to-left, so the user `onPaste`
  fires first; `preventDefault()` makes Base UI's internal paste bail at
  `NumberFieldInput.js:297`. The JSDoc is accurate.
- Slider `onValueChange` value shape: single (non-range) value → `number`, so
  `v as number` is correct.
- `Slider.Control` + `Slider.Thumb` without `Slider.Track`/`Indicator` is
  sufficient — thumb self-positions from context.
- `Select.Value` resolves its label from the rendered `Select.ItemText` via
  `labelsRef`; no `items` prop needed.
- Registry manifest complete: all 7 shippable files listed, `hue.test.tsx`
  correctly excluded, `@base-ui/react` in deps, `color-picker` as registryDependency.

## Verification

`pnpm typecheck` clean · `pnpm test` 103/103 · `pnpm registry:build` regenerates
`public/r/fill-picker-base.json` (7 files) · `next build` compiles + prerenders
11/11 pages. One adversarial re-verify round after the fixes returned
"DRY — no new defects".

## Out-of-scope note

The working tree carried unrelated changes not made by this review — an injected
`@artorapp/web-sdk` had patched `src/app/layout.tsx`, added `src/app/artor-review.tsx`,
and modified `package.json`/`pnpm-lock.yaml`. These were left untouched and not
committed. Also noted (not fixed): `pnpm lint` is broken because `next lint` was
removed in Next 16 and no `eslint.config.*` exists — a pre-existing repo gap.

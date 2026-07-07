# Adversarial audit — amplo-color-picker
2026-07-07 · Fable 5 (orchestrator) · Haiku 4.5 (refuter panel)

## Prompt
> /adversarial-review-codebase
> even the unmerged branch

## Scope
- **main** @ `65dc3cf` — full registry + demo site source.
- **feat/gradient-picker** (unmerged, = `origin/treasure-melody`'s sibling) @ `db25f00` — +9,691/−4,637 across 83 files vs main; includes the new Base UI gradient parts (`fill-picker-base/parts/gradient/*`, `gradient.tsx`, `fill.tsx`) added since the 2026-07-05 audit.
- **origin/treasure-melody** @ `ecc0fd6` — 7-file Base UI slider hardening (itself the output of the 2026-07-06 opus-4-8 gate review), unmerged.
- Baseline: `pnpm test` 103/103 pass, `pnpm typecheck` clean on main before the panel ran.

Mode: **audit** — findings verified, zero code edits.

Panel: 6 refuter lenses on Haiku subagents (Correctness×main, Correctness×branches, Security, Tests, Smells/reuse, A11y). Every Critical/Important claim independently re-verified against real source by the orchestrator; default REFUTED when the concrete break could not be reproduced.

## Prior-audit follow-up (2026-07-05 report)
- **C1 (hint parse convention)** — FIXED on branch (`f09bfc3`): `parseStops` now stashes a `pendingHint` and attaches it to the *next* stop, matching `formatStops`; leading/double/trailing hints reject.
- **I1 (OKLCH chroma clamped at 0.5)** — FIXED on main: chroma edit is now `Math.max(value, 0)`, unbounded above, with gamut limits deferred to `toGamut`.
- M1 (build-script path containment) — FIXED: security lens confirmed the resolve-within-root guard is in place.
- M2/M3/M4 minors — partially addressed on branch (`f09bfc3`); swatch touch target still 20px (see M-4 below).

## Findings

### CONFIRMED — Important

#### I-1. Channel edits through achromatic intermediates destroy hue (main + branch)
- **location:** `registry/new-york/color-picker/lib/channels.ts:214-222` (`fromCulori` → `h: ok.h ?? 0`) and the `hsl`/`hsb` branches at `:154-173` (`hsl.h ?? 0`).
- **claim:** Any `setColorChannel` result that lands on an achromatic color silently stores `h: 0`, and because the hook's `lastGoodHueRef` substitution is deliberately gated to *string-controlled* inputs (`use-color-picker.ts:150-158`), the object flow keeps the destroyed hue.
- **concrete break (reproduced against source):** start at `hsl(240 50% 50%)` (blue). In the HSL channel inputs, set S to `0`: `fromCulori({h:240,s:0,l:0.5})` → OKLCH achromatic → `h` undefined → stored as `0`. Set S back to `50`: the `hsl` branch reads `hsl.h ?? 0` from the now-achromatic color → `hsl(0 50% 50%)` — **red, not blue**. Same path via RGB edits to gray. This violates CLAUDE.md's own invariant ("hue and lightness must round-trip cleanly; chroma is the only lossy axis").
- **suggested fix:** thread the pre-edit `OklchColor` into `fromCulori` and preserve its `h` whenever the converted result is achromatic (mirror the hook's `isAchromatic` test); add a `s→0→50` round-trip test in `channels.test.ts`.

#### I-2. Base UI slider hardening stranded on `treasure-melody`; main and feat/gradient-picker both ship without it
- **location:** `registry/new-york/fill-picker-base/parts/{hue,lightness,alpha,format-switcher,channel-input}.tsx` on main @ `65dc3cf` and branch @ `db25f00`, vs `origin/treasure-melody` @ `ecc0fd6`.
- **claim:** The verified 2026-07-06 gate fixes exist only on the unmerged `treasure-melody` branch. Both main and the gradient branch lack: the `has-[:focus-visible]:ring-*` keyboard focus indicator (plain `focus-visible:` never matches — the `role="slider"` input is a *descendant* of the Thumb), the vertical-gradient direction fix (`to top`; Base UI anchors vertical thumbs from the bottom, so current `to bottom` paints min-at-top, inverted), `getAriaValueText`, and the forwardRef/rest-spread API parity on four parts.
- **concrete break (verified by grep):** on both main and the gradient branch, `grep has-\[:focus-visible\] fill-picker-base/parts/*.tsx` → 0 hits; all three sliders' vertical branches still paint `to bottom`. A keyboard user tabbing to any Base UI slider gets **no visible focus indicator**; a vertical slider shows its gradient inverted relative to the thumb's travel.
- **suggested fix:** merge/cherry-pick `treasure-melody` (`e0e8e8e`) into main first, then rebase `feat/gradient-picker` on it so the new Base UI gradient parts inherit the hardened conventions (the new `parts/gradient/*` files should also adopt `has-[:focus-visible]` where they own thumbs). Correctness lens independently re-verified all six treasure-melody fixes as correct — it is safe to merge.

#### I-3. Area keyboard adjustments are inaudible to screen readers (main)
- **location:** `registry/new-york/color-picker/parts/area.tsx:286-288`.
- **claim:** The 2D area is `role="application"` with the current value embedded in `aria-label`. Mutating `aria-label` on a focused `application` element is not reliably announced (NVDA/VoiceOver announce `aria-valuetext` changes on `role="slider"`, not label changes on `application`), and there is no live region — the only other ARIA in the file is `aria-hidden`.
- **concrete break:** a VoiceOver/NVDA user focuses the area and presses arrow keys; the bead moves and the color changes, but nothing is announced. The primary control of the component is silent under keyboard use.
- **suggested fix:** add a visually-hidden `aria-live="polite"` element that re-renders with `valueText` on change (debounced), or restructure toward the react-aria ColorArea pattern (two offscreen range inputs). Keep `role="application"` only if the live region is added; otherwise prefer `group` + sliders.

#### I-4. Swatches announce as a listbox but arrows do nothing (main, Radix variant)
- **location:** `registry/new-york/color-picker/parts/swatches.tsx:65-81`.
- **claim:** `role="listbox"` / `role="option"` (with `aria-selected`) promises the ARIA listbox interaction contract — roving tabindex + arrow-key navigation — but every option is an independently tabbable `<button>` with no `onKeyDown`/`tabIndex` management.
- **concrete break:** a screen reader announces "listbox"; the user presses ArrowRight to move between options and nothing happens; Tab walks through every swatch one by one instead of one Tab stop for the group. The Base UI variant (RadioGroup) does not have this problem — only the Radix-classic tree does.
- **suggested fix:** implement roving tabindex (selected option `tabIndex=0`, rest `−1`, arrow keys move focus and Home/End jump), or change semantics to `role="group"` of toggle buttons if Tab-through is the intended model.

### CONFIRMED — Minor

- **M-1. `setCenter` doesn't clamp** (`use-gradient-picker.ts:384-394`) while its siblings `setLinearStart`/`setLinearEnd` clamp via `clamp01`. All in-repo callers pre-clamp, and out-of-box centers are legal CSS, so this is API asymmetry in a published headless hook, not a reachable break. One-line fix.
- **M-2. Verbatim data-constant duplication between variants (branch):** `OPTIONS` (5 interp entries with descriptions) duplicated in both `interp-switcher.tsx` files; `SIZE_OPTIONS` (4 radial keywords) duplicated in both `radial-size-select.tsx`; `stop-list.tsx` add/project/edit logic ~90% identical between `color-picker/parts/gradient/` and `fill-picker-base/parts/gradient/`. Move the shared constants to `lib/gradient.ts` and extract a small shared stop-list helper; per CLAUDE.md, data/logic must live once in `color-picker/`.
- **M-3. Touch targets below WCAG 2.5.8 (24px AA):** slider tracks 12px (`h-3`, hue/lightness/alpha both variants), thumbs 16px, gradient stop handles 16px default, swatches 20px (`size-5`, carried from prior audit). Visual size can stay; enlarge hit areas with padding/pseudo-elements.
- **M-4. ContrastReadout metric cycle not announced** (`contrast-readout.tsx:121`): activating the toggle changes the displayed metric with no live region; SR users get no confirmation which metric is now shown.
- **M-5. Test gaps (recorded, not looped on — audit mode):**
  - `lerpHue` and `sampleStopsAt` (branch `lib/gradient.ts`) have zero direct tests — shortest-path wrap across 0° and click-to-add color sampling are unguarded.
  - `gradientLineProjection`/`adjustStopsForEndpoints` zero-length-segment branches untested (behavior verified correct — see refuted R-1).
  - No test that `parseGradient` rejects malformed stop colors (`rgb(999 0 0)`) or unknown interp spaces (falls back to `oklch` silently — worth documenting in a test).
  - `removeStop` with an unknown id (silent no-op) and `useFillPicker` `onValueChange` CSS (only substring-matched, never re-parsed) untested.
  - Negative hint percentages parse and round-trip (`-50%`); spec-legal but undocumented — pin with a test if intentional.

### REFUTED (recorded so the next round doesn't re-raise them)

- **R-1. "`gradientLineProjection` null deref when start === end"** — every caller guards (`projectStopPosition`, `reverseProjectStopPosition`, `adjustStopsForEndpoints` all `if (!proj) return …`, `gradient.ts:227-280`). No deref path exists.
- **R-2. "`sampleStopsAt` can emit NaN hue"** — `parseColor` normalizes hue with `Number.isFinite(oklch.h) ? … : 0` (`color.ts:60`) and `OklchColor.h` is a number everywhere; `lerpHue` over finite numbers can't produce NaN.
- **R-3. "`useFillPicker` controlled-mode ref goes stale across renders"** — `isControlledModeRef.current` is assigned *during render*, so any committed prop change is visible to the next event handler. The only window is same-tick (pre-rerender), which is standard controlled-component semantics, not a defect.
- **R-4. "`FieldSelect` `items` prop duplicates the JSX children"** — deliberate: Base UI `Select.Value` needs the `items` map when trigger display differs from item text; this was the fix in `d4f1404`. Documented in `field.tsx:55-58`.
- **R-5. "fill-picker-base should not import color-picker via `@/registry/...` absolute aliases"** — CLAUDE.md mandates exactly this (engine imported via path aliases, resolved by the CLI through the `color-picker` registryDependency).
- **R-6. "Gradient bar stops need live-region announcements for moves/selection"** — the stop handles are `role="slider"` elements with `aria-valuenow` (asserted in `bar.test.tsx`); screen readers natively announce value changes on a focused slider. `aria-current` marks selection.
- **R-7. Security lens: NO FINDINGS** — path-containment guard present in `build-registry.ts`; static-only route handlers; no `dangerouslySetInnerHTML`/eval/prototype-pollution sinks; gradient-parser regexes timed against pathological inputs with no catastrophic backtracking; all color/gradient output flows through validated `OklchColor` → `formatColor`/`formatGradient`.
- **R-8. treasure-melody diff itself: NO FINDINGS** — all six of its fixes independently re-verified correct by the correctness lens (see I-2: the problem is that it's unmerged, not its content).

## Loop status
Audit mode: single panel round, findings verified, no fixes applied, so no re-panel round was owed. Dedup ran against the 2026-07-05 and 2026-07-06 reports; nothing previously refuted was re-raised.

## Verification
`pnpm test` 103/103 and `pnpm typecheck` clean on main (baseline, unchanged — no edits made). Confirmed findings were each reproduced by direct source reading with the concrete break documented above; refutations cite the guarding code.

## Suggested order of work (not performed — audit mode)
1. Merge `treasure-melody` → main, rebase `feat/gradient-picker` onto it (I-2).
2. Fix hue preservation in `channels.ts` + regression test (I-1).
3. Area live-region + Swatches roving tabindex (I-3, I-4).
4. Minors M-1..M-5 opportunistically, ideally on the gradient branch before merge.

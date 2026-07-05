# Adversarial audit — amplo-color-picker
2026-07-05 · Fable 5 (orchestrator) · Haiku 4.5 (refuter panel)

## Prompt
> Hi Fable, please audit the entire codebase including unmerged prs, also start a new worktree to add a baseUI variant of this component it will be the main version alongside the Remix alternative brb use subagents with lesser models after planning

## Scope
- **main** @ `95f6f61` (treasure-melody worktree, content-identical to main) — full registry + demo site source (~67 non-test TS/TSX files).
- **PR #2** `feat/gradient-picker` @ `fe8e0da` — unmerged, +7,317/−4,711 across 64 files (gradient/fill picker, registry v1.1.0 three-item split, docs rework).
- **feat/base-ui-variant** @ `bb8ce10` — phase 1 of Base UI variant (reviewed for context; phase 2 build dispatched separately).
- Baseline: `pnpm test` 99/99 pass, `pnpm typecheck` clean on main before the panel ran.

Mode: **audit** — findings verified, zero code edits.

Panel: 5 refuter lenses (Correctness×main, Correctness×PR #2, Security, Tests, Smells/reuse, A11y) on Haiku subagents; every Critical/Important claim independently re-verified against real code by the orchestrator before acceptance.

## Findings

### CONFIRMED — Critical

#### C1. Gradient hint parse/format convention mismatch → all midpoint hints silently lost (PR #2)
- **location:** `registry/new-york/color-picker/lib/gradient.ts:373` (parse) vs `:162-165` (format), branch `feat/gradient-picker`
- **claim:** `parseStops` stores a bare-percentage hint on the **previous** stop (`stops[stops.length - 1].hint = …`), but `formatStops`'s own comment and code define a hint on stop *i* as the midpoint between stop *i−1* and *i*, emitted only when `i > 0`. The projection helper at `:275-278` shares the format convention.
- **concrete break (reproduced against branch source):** `linear-gradient(in oklch 0deg, oklch(1 0 0) 0%, 50%, oklch(0 0 0) 100%)` parses the `50%` hint onto stop[0]; `formatStops` skips `i === 0`, so round-trip output drops the hint entirely. Any parsed hint is also misinterpreted by the positioned-linear projection.
- **why tests missed it:** `gradient.test.ts:23` covers the format direction only (hint pre-placed on stop[1]); no test parses a hint.
- **suggested fix:** in `parseStops`, hold a `pendingHint` and attach it to the **next** pushed stop; add a parse→format round-trip test with a hint. (Memory note `project_deferred_midpoint_hint` says hint UI is deferred but the data layer is claimed ready — it isn't, in the parse direction.)

### CONFIRMED — Important

#### I1. OKLCH chroma channel edit hard-clamped at 0.5 (main)
- **location:** `registry/new-york/color-picker/lib/channels.ts:179`
- **claim:** `setColorChannel(color, "oklch", "c", v)` runs `clamp(value, 0, 0.5)`, silently truncating chroma, while the rest of the system deliberately treats OKLCH as unbounded (Area gamut boundary is `none` for oklch/oklab; `parseColor` accepts any non-negative chroma).
- **concrete break (verified in source):** parse `oklch(0.7 0.55 30)` (valid, storable), open the oklch channel editor, press ArrowUp on chroma → `clamp(0.555, 0, 0.5)` = 0.5; the user's 0.55 chroma is destroyed by a +0.005 increment.
- **suggested fix:** drop the upper bound (or raise well past any display gamut, e.g. 2.0); keep the channel descriptor's UI max as a slider hint only. Gamut limits belong to `toGamut` at display time, not channel edit time.

### CONFIRMED — Minor (severity downgraded from reviewer's Critical)

#### M1. Registry build script joins manifest paths without containment check
- **location:** `scripts/build-registry.ts:54` — `fs.readFileSync(path.join(ROOT, f.path))`
- **verified:** the join is unvalidated as claimed; a `"path": "../../../<file>"` entry would be inlined into the deployed JSON.
- **downgrade rationale:** `registry.json` is repo-committed; the only actor who can plant a traversal path already has commit access. No untrusted input reaches this sink. Worth a one-line `path.resolve` containment guard as defense-in-depth, not exploitable as shipped.

### CONFIRMED — Minor

#### M2. Checkerboard SVG duplicated across 7 files, two sizes
- **locations:** `parts/alpha.tsx`, `preview.tsx`, `swatches.tsx`, `contrast-readout.tsx`, `gradient/area.tsx`, `gradient/overlay.tsx`, `gradient/stop-list.tsx` (branch)
- **verified:** 7 files carry the inline data-URI; `overlay.tsx` exports one that `gradient/area.tsx` imports, but `stop-list.tsx` redeclares its own 8×8. Extract both size variants to a shared `lib/constants.ts`.

#### M3. Swatch touch targets 20×20px
- **location:** `parts/swatches.tsx:85-88` (`size-5`)
- WCAG 2.5.8 minimum is 24×24 (44×44 recommended). Enlarge hit area via padding.

#### M4. No `prefers-reduced-motion` guards on transitions
- **locations:** `parts/contrast-readout.tsx:124`, `parts/swatches.tsx:86` (`hover:scale-110`), `gradient/overlay.tsx` (branch)
- Use `motion-safe:` Tailwind variants.

#### M5. Test gaps (recorded, not looped on — audit mode)
- `parts/area.tsx` pointer math + hue re-pin (`:209-211`): the invariant is guarded at lib level (`color.test.ts` "toGamut + hue stability under drag feedback") but the component's `positionFor`/`sampleAt` mapping and keyboard paths have no direct tests.
- ChannelInput paste flow untested (behavior itself verified correct — see R1).
- `gradient/overlay.tsx` `keywordToRadii`/`edgeExtent` aspect-ratio geometry untested (branch).
- Hint parse direction untested (root cause of C1).

### REFUTED

#### R1. "ChannelInput onPaste passes unvalidated/untrimmed text downstream" (Tests lens, claimed Important)
`onPasteColor` wires to `setFromString` → `parseColor`, which trims internally (`culoriParse(input.trim())`, `color.ts`). Pasting `" red "` is gated by `parseColor(text.trim())` and succeeds downstream identically. No failure path exists; only the test-gap portion survives (folded into M5).

#### R2. "parseGradient rejects repeating-gradient syntax" (Tests lens)
False on the branch under review: `FN_RE` captures the `repeating-` prefix and `parseGradient` sets `repeating: !!m[1]` (`gradient.ts:395-400` area). The hero even defaults to a repeating radial. Reviewer read stale/main-side assumptions.

#### R3. EyeDropper silent catch as defect (Tests lens, claimed Important)
The `catch {}` around `EyeDropper.open()` swallows the rejection thrown on user-cancel (standard AbortError flow); silence is the correct UX. Test gap only.

### Clean lenses
- **Security** beyond M1: no `dangerouslySetInnerHTML`, no ReDoS-prone regexes (all anchored, linear), no prototype pollution sinks, no dynamic code execution; clipboard/EyeDropper inputs pass through `parseColor`. Dependencies are mainstream and pinned by lockfile.
- **A11y** headline claims hold: Area (`role="application"`, aria-valuetext, full keyboard incl. PageUp/Down), sliders (`role="slider"`, full aria-value*), gradient Bar/pads/StopList (roving tabindex, arrows, Delete) all verified present by the panel.
- **Conventions:** culori confined to `lib/`; compose-only barrels intact; semantic tokens throughout. PR #2's `field.tsx` extraction and RadialShape decomposition *reduce* duplication.

## Recommended order of work
1. Fix **C1** on the PR #2 branch before merge (small, contained, add round-trip test).
2. Fix **I1** on main (one-line clamp change + test).
3. Fold M1–M4 into a small hardening commit whenever convenient.
4. M5 test gaps: prioritize the Area component-level tests (flagship invariant).

## Process record
- Panel: 6 parallel Haiku subagents (5 audit lenses + 1 Sonnet builder for the separate Base UI phase-2 task, out of audit scope).
- Verification: every Critical/Important claim re-verified by the orchestrator reading the actual source (`git show` on branch refs); two Important claims and one lens claim refuted this way.
- Loop: single round; audit mode does not fix-and-re-panel. No prior-round findings to dedup against.

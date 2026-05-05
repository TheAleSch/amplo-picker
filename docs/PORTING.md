# Porting notes

Scratchpad for if/when we port the picker to Svelte, TanStack Start/Router, or
any other non-React framework. Keep this file alive — drop notes as we discover
constraints, design choices, or framework-specific gotchas.

---

## What's React-coupled today

The headless engine and the parts are React 19. Concrete couplings:

- **State engine** — `hooks/use-color-picker.ts` uses `useState`, `useMemo`,
  `useRef`, `useCallback`. ~250 lines. Pure logic; no DOM. Ports cleanly to any
  reactive primitives (Svelte 5 runes, Vue ref/computed, Solid signals).
- **Context** — `context.tsx` uses `React.createContext` + a `useContext` guard
  that throws outside `<Root>`. Replace with framework-native context (Svelte
  `setContext`/`getContext`, Vue `provide`/`inject`).
- **Parts** — `parts/*.tsx` are JSX with `forwardRef`, pointer/keyboard
  handlers, `useImperativeHandle` (Area, Hue, Lightness, Alpha). Each part is
  small; rewriting them is mechanical once the state engine is ported.
- **`color-picker.tsx`** — uses `Object.assign(DefaultColorPicker, { Root, … })`
  to expose the compound API. Svelte/Vue idiom is named exports; the namespace
  pattern doesn't translate.

## What's framework-agnostic today

Already portable as-is, no rewrite needed:

- **`lib/color.ts`** — pure TS. Uses `culori`. Conversion math, gamut tests,
  WCAG/APCA, `findMaxChroma`, `findCusp`, `gamutSignedDistance`. **This is the
  hard part of the project; ports for free.**
- **`lib/types.ts`** — type-only.
- **OKLCH-canonical state model** — the `OklchColor { l, c, h, alpha }`
  representation and the "chroma is the only lossy axis" invariant are
  framework-independent. Document them as the porting contract.
- **Area's gradient painting** — vanilla `<canvas>` + `ImageData`. Drop into any
  framework that can hand us a canvas ref.
- **SVG warning lines** — marching-squares output is a list of path strings.

## Per-target notes

### Svelte (5+)

- Use **runes** (`$state`, `$derived`, `$effect`) — closest semantic match to
  the React hook. `useColorPicker` becomes a class or a function returning an
  object with rune-backed properties.
- Compound API: export each part as a separate `.svelte` file. Consumer imports
  `{ Root, Area, Hue, … }` from a single barrel. No `Object.assign` needed.
- **Gotcha**: Svelte's `bind:this` is the ref equivalent. `forwardRef` doesn't
  exist; expose imperative handles via `export function`.
- `data-slot` carries over verbatim — Svelte passes through unknown attributes.
- Tailwind classes carry over. CSS vars carry over.
- **Open question**: how to handle the achromatic-hue substitution
  (`lastGoodHueRef`)? Svelte's reactivity reruns derivations cleanly; a `$state`
  variable updated only inside an `$effect` should work.
- Keep `culori` as the only runtime dep for parity.

### TanStack Start / TanStack Router

- TanStack Start is React, so the registry **runs as-is**. The "port" question
  here is really about the demo site:
  - Replace `next/navigation`, `next/link` with TanStack Router equivalents.
  - Move `app/` routes to TanStack's file-based router conventions
    (`routes/index.tsx` etc).
  - `globals.css` + Tailwind v4 carry over.
  - The shadcn registry CLI works against any React project; `npx shadcn add
    https://amplo.ale.design/r/color-picker.json` should drop the picker into a
    TanStack Start project unchanged. **Verify `components/ui/` target path
    matches the consumer's `components.json`** before claiming this works.
- No work needed on the registry itself for TanStack.

### Vue / Solid (speculative)

- Vue 3 with `<script setup>` + `ref`/`computed` maps 1:1 onto the hook. JSX
  parts → SFC templates. About the same effort as Svelte.
- Solid signals (`createSignal`, `createMemo`) are the closest match to React
  hooks of any framework — likely the easiest port if we ever do it.

## Decisions to make before porting

1. **Distribution model** — does the Svelte port live in this repo (multi-style
   shadcn registry, e.g. `registry/svelte/`) or a separate `amplo-color-picker-svelte`?
2. **Single source of truth** — generate the parts from a shared spec, or
   maintain in parallel? Maintaining two is the standard answer; codegen rarely
   pays off for component libraries.
3. **Test parity** — Vitest already runs the color/lib tests headlessly. The
   hook tests use Testing Library; the Svelte port would need
   `@testing-library/svelte` + same scenarios.
4. **CSS strategy for non-Tailwind consumers** — currently relies on shadcn CSS
   vars. For framework-agnostic distribution, consider shipping a base CSS file
   that defines the vars with sensible defaults, overridable.

## Open questions / things to investigate

- Display-P3 canvas paint: the `colorSpace: "display-p3"` 2D context option is
  a browser API, framework-irrelevant. Should work everywhere.
- EyeDropper API: same — browser API, no framework coupling.
- Are there any React-19-specific features we lean on? (e.g. `use()`, server
  components) — quick audit: **no**. The component is `"use client"` and uses
  only stable hooks. Good for portability.

---

*Last updated: 2026-05-05.*

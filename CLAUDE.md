# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

- `pnpm dev` — Next.js dev server (Turbopack). Runs the demo/docs site.
- `pnpm build` — runs `pnpm registry:build` then `next build`. CI builds emit registry artifacts automatically.
- `pnpm lint` — `next lint`.
- `pnpm typecheck` — `tsc --noEmit` (TS is `noEmit`-only; no separate build step).
- `pnpm test` — Vitest, single run.
- `pnpm test:watch` — Vitest watch mode.
- Single test file: `pnpm vitest run registry/new-york/color-picker/lib/color.test.ts`
- Single test by name: `pnpm vitest run -t "parses hex"`
- `pnpm registry:build` — runs `scripts/build-registry.ts` (via `tsx`). Reads `registry.json`, inlines each referenced file, and emits `public/r/<item>.json` (per-item bundle with file content) + `public/r/registry.json` (catalog index, file metadata only — schema: `https://ui.shadcn.com/schema/registry.json`). **Outputs in `public/r/*.json` are gitignored** — they are produced as a build artifact for deployment.

## Project shape

This is a **shadcn-style component registry** wrapped in a Next.js demo site. There are two source roots that should not be confused:

- `src/` — the demo/docs Next.js app (App Router). `src/app/page.tsx` is the landing demo, `src/app/docs/page.tsx` the docs page, `src/app/docs/base/page.tsx` the Base UI variant demo, `src/lib/utils.ts` holds `cn`. This code is **not** shipped to consumers.
- `registry/new-york/color-picker/` — the **original (Radix/shadcn-classic) component source** that consumers install. Everything in here is bundled by `pnpm registry:build` into a single JSON artifact and pulled via `npx shadcn@latest add https://<host>/r/color-picker.json`. The `new-york` segment is the shadcn style identifier.
- `registry/new-york/fill-picker-base/` — the **Base UI variant** (the main version going forward). It rebuilds only the parts that benefit from Base UI primitives (Hue/Lightness/Alpha on Slider, FormatSwitcher on Select, ChannelInput on NumberField, Swatches on RadioGroup) and **imports the engine and all other parts from `color-picker/` via path aliases — never copy `lib/`, `hooks/`, or `context` into this tree**. Ships as the `fill-picker-base` registry item, which lists `color-picker` as a registryDependency so the shared engine resolves via the CLI.

Path aliases (mirrored in `tsconfig.json` and `vitest.config.ts`):
- `@/*` → `src/*`
- `@/registry/*` → `registry/*`

The registry component imports `cn` from `@/lib/utils` — this aliasing works in both the dev site and tests, and shadcn rewrites the import path for end users.

## Component architecture (the published part)

Everything in `registry/new-york/color-picker/` follows a Radix-style compound API. The mental model:

1. **Canonical state is OKLCH.** `OklchColor { l, c, h, alpha }` (defined in `lib/types.ts`) is the single source of truth. Every conversion goes through this representation, so format toggles (hex / rgb / hsl / hsb / oklch / oklab / display-p3) are lossless round-trips.
2. **`hooks/use-color-picker.ts`** is the headless engine. It owns controlled/uncontrolled state, format selection, derived gamut info, derived contrast (WCAG + APCA), and the component-mutation API (`setColor`, `setComponent`, `adjustComponent`, `setFormat`, `setFromString`).
3. **`context.tsx`** exposes that state via `ColorPickerContext`. `useColorPickerContext()` throws if a part renders outside `<ColorPicker.Root>` — preserve this guard when adding new parts.
4. **`parts/*.tsx`** are thin presentational components (`Root`, `Area`, `Hue`, `Lightness`, `Alpha`, `Input`, `FormatSwitcher`, `ChannelInput`, `Swatches`, `GamutBadge`, `ContrastReadout`, `Preview`, `EyeDropper`). They read state from context, dispatch through the hook's setters, and own only their own DOM/event concerns.
5. **`color-picker.tsx`** is **compose-only** by design — there is no kitchen-sink default `<ColorPicker />` component. Following shadcn convention (Card, Dialog, Popover, Sidebar, Tabs all compose-from-parts), users build the layout they need by composing `<ColorPicker.Root>` with the parts. The barrel re-exports the parts under a `ColorPicker` namespace object (`{ Root, Area, Hue, ... }`) and surfaces all typed exports (`ColorFormat`, `OklchColor`, `useColorPicker`, `parseColor`, `formatColor`, `colorChannels`, etc.). The canonical recipe lives in the `/docs` page as a copy-paste code block — **do not reintroduce a default-layout wrapper here.**
6. **`lib/color.ts`** holds conversions, gamut tests (`isInSrgb`/`isInP3`/`isInRec2020` use a small epsilon to avoid float-edge flicker), CSS Color 4 chroma-reduction (`toGamut`), WCAG ratio, and the in-house APCA implementation. **`lib/channels.ts`** holds the per-format decompose/recompose used by `ChannelInput`. Both files import `culori`; keep `culori` out of `parts/` and the hook.

### Subtleties worth preserving

- **Hue preservation across achromatic round-trips.** `useColorPicker` keeps a `lastGoodHueRef` so that when a string-controlled value collapses to gray/black/white (where hue is undefined), the picker doesn't snap the slider to 0. The substitution is gated on `isControlledStringInput` so explicit object/uncontrolled assignments like `setComponent("h", 0)` still take effect.
- **Format-driven gamut boundary.** `<ColorPicker.Area>` traces an SVG cutoff line whose default tracks the active output format (`hex|rgb|hsl|hsb → srgb`, `p3 → p3`, `oklch|oklab → none`). The boundary is a vector overlay so it stays crisp at any DPR. Override per-instance with `gamut="..."`.
- **Display-P3 paint.** `Area` checks `window.matchMedia("(color-gamut: p3)")` once at module load and paints the saturation canvas in `display-p3` when supported. Treat `SUPPORTS_P3` as a render-hint, not a feature gate — math still happens in OKLCH.
- **Achromatic detection.** `isAchromatic` in the hook uses `HUE_EPS = 1e-4` and also treats `l <= eps` / `l >= 1 - eps` as achromatic. Don't tighten this without re-running the area-drag tests.
- **Hue pinning after gamut clamp.** `<ColorPicker.Area>` runs `toGamut` on each pick when the active gamut is bounded (sRGB/P3/Rec.2020), but `toGamut` round-trips through the target RGB and shaves ~0.5–1° of hue at the boundary. In a tight pointer-feedback loop those tiny drifts compound into a visible hue walk. The area immediately re-pins the user's intended hue after the clamp — `next = { ...toGamut(next, gamut), h: targetHue }`. **Never drop this re-pin.** Chroma is the only axis allowed to be lossy; hue and lightness must round-trip cleanly. The `toGamut + hue stability under drag feedback` tests in `lib/color.test.ts` document both the underlying drift and the re-pinning strategy — keep them green.

## Registry workflow

`registry.json` is the **source of truth** for what gets shipped. When adding or removing a part:

1. Add the file under `registry/new-york/color-picker/...`.
2. Add a corresponding entry under `items[0].files` in `registry.json` — both `path` (in-repo) and `target` (where it lands in the consumer project) are required.
3. Run `pnpm registry:build` to regenerate `public/r/color-picker.json`.
4. The site must be redeployed for consumers to see the change (the JSON is served from `public/r/`).

Note: parts that exist in code but are missing from `registry.json` won't be installed by consumers even though they're importable in the demo site. If you add a file to `parts/` and want it shipped, the manifest entry is mandatory.

## Tests

- Vitest with `happy-dom`, globals enabled, setup file `vitest.setup.ts` (loads `@testing-library/jest-dom`).
- Tests live alongside source as `*.test.ts` (e.g., `registry/new-york/color-picker/lib/color.test.ts`, `hooks/use-color-picker.test.ts`).
- Vitest reuses the same `@/` and `@/registry/` aliases, so imports match production code.

## Stack notes

- Next.js 15 (App Router, Turbopack dev) on React 19.
- Tailwind v4 beta via `@tailwindcss/postcss`. Theme tokens live in `src/app/globals.css`; the picker styles via semantic Tailwind classes (`bg-popover`, `border-border`, etc.).
- Strict TypeScript, `moduleResolution: "bundler"`. The project is ESM (`"type": "module"`).

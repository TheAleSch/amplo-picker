# Gradient picker — design

**Status:** Approved (brainstorm)
**Date:** 2026-05-09
**Branch:** `feat/gradient-picker`

## Goal

Add a `Gradient` tab to the picker, alongside the existing color picker, as the
first concrete realization of the project's `fill-picker` rename. Ship gradient
support that is composable in the same shadcn-style as the color parts: a
consumer should be able to mount only the parts they want, and a color-only
consumer should pay nothing for gradient code.

## Architecture

Three barrels, three contexts, one mental model.

```text
ColorPicker.*       — unchanged public surface (back-compat shim)
GradientPicker.*    — new gradient parts
FillPicker.*        — thin shell + tabs + panes, composes the other two
```

### Public composition (canonical recipe)

```tsx
<FillPicker.Root value={fill} onValueChange={setFill}>
  <FillPicker.Tabs>
    <FillPicker.Tab mode="color">Color</FillPicker.Tab>
    <FillPicker.Tab mode="gradient">Gradient</FillPicker.Tab>
  </FillPicker.Tabs>

  <FillPicker.Pane mode="color">
    <ColorPicker.Area />
    <ColorPicker.Hue />
    <ColorPicker.ChannelInput />
  </FillPicker.Pane>

  <FillPicker.Pane mode="gradient">
    <GradientPicker.Bar />
    <GradientPicker.TypeSwitcher />
    <GradientPicker.AngleDial />
    <GradientPicker.StopColor />
  </FillPicker.Pane>
</FillPicker.Root>
```

### Composability properties

- `FillPicker.Root` is a thin shell: holds `mode` + `value` in context, no UI.
- `FillPicker.Tabs` / `FillPicker.Tab` are optional. Skip them and the mode is
  fixed (single-mode picker).
- `FillPicker.Pane` only renders its children when `mode` matches — color and
  gradient parts are never both mounted at the same time.
- A consumer that renders only `<FillPicker.Pane mode="color">` (or skips
  `FillPicker` entirely and uses `ColorPicker` directly) tree-shakes all
  gradient code.
- A consumer that renders only `<FillPicker.Pane mode="gradient">`
  tree-shakes all color-area / hue / etc. code that they don't compose into
  `GradientPicker.StopColor`.

### Context layers

- `FillPickerContext` — `mode`, `value: Fill`, `setMode`, `setValue`. Mounted
  by `FillPicker.Root`.
- `GradientPickerContext` — gradient state, selected stop index, setters.
  Mounted by `<FillPicker.Pane mode="gradient">` (or by
  `<GradientPicker.Root>` for standalone use).
- `ColorPickerContext` — unchanged. Mounted in three places:
  1. By `<ColorPicker.Root>` (back-compat path).
  2. By `<FillPicker.Pane mode="color">`, bound to `fill.color`.
  3. By `<GradientPicker.StopColor>`, bound to the selected stop's color.

  This is the one-context-three-mount-points pattern that lets normal
  `ColorPicker.*` parts work unchanged inside the gradient editor.

## Data model

`registry/new-york/color-picker/lib/gradient.ts`:

```ts
export type GradientType = "linear" | "radial" | "conic";
export type GradientInterp =
  | "oklch"
  | "oklab"
  | "srgb"
  | "hsl"
  | "hsl-longer";

export interface GradientStop {
  color: OklchColor;
  position: number;        // 0..1
  hint?: number;           // optional CSS midpoint hint, 0..1
}

export interface LinearGradient {
  type: "linear";
  angle: number;           // degrees, 0..360
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface RadialGradient {
  type: "radial";
  shape: "circle" | "ellipse";
  center: { x: number; y: number };          // 0..1, normalized
  size: "closest-side" | "farthest-corner";
  stops: GradientStop[];
  interp: GradientInterp;
}

export interface ConicGradient {
  type: "conic";
  startAngle: number;      // degrees
  center: { x: number; y: number };          // 0..1, normalized
  stops: GradientStop[];
  interp: GradientInterp;
}

export type Gradient = LinearGradient | RadialGradient | ConicGradient;

export type Fill =
  | { kind: "color"; color: OklchColor }
  | { kind: "gradient"; gradient: Gradient };
```

### Parse / format helpers

Mirroring today's `parseColor` / `formatColor`:

- `parseGradient(css: string): Gradient | null`
- `formatGradient(g: Gradient): string`
  → emits `linear-gradient(in oklch 90deg, oklch(...) 0%, oklch(...) 100%)`
- `parseFill(css: string): Fill | null`
- `formatFill(f: Fill): string`

OKLCH is canonical. CSS strings are derived on output. Round-trip is lossless
for `interp ∈ {oklch, oklab}`; for sRGB-family interps the stops themselves
remain OKLCH and CSS still emits `in oklch` semantics unless `interp` says
otherwise.

### Stop identity

The public `GradientStop` shape has no `id` field — CSS gradients don't have
stop ids and we don't want consumers to manage them. Internally,
`useGradientPicker` assigns each stop a stable internal id when it enters
state (insertion, paste-parse, preset apply). Selected-stop tracking and
drag handles key off these internal ids, so reordering by position drag
preserves selection. Ids are stripped on emit; `onValueChange` always sees
clean `GradientStop` objects.

### Defaults

A new gradient (e.g. when the user toggles into the gradient tab for the first
time):

- `type: "linear"`
- `angle: 90`
- `stops: [{ color: oklch(1 0 0), position: 0 }, { color: oklch(0 0 0), position: 1 }]`
- `interp: "oklch"`

## Parts list

### `FillPicker.*`

| Part | Purpose |
|---|---|
| `FillPicker.Root` | Owns `value: Fill`, `onValueChange`, `mode`, defaults. Mounts `FillPickerContext`. No DOM beyond a wrapper div. |
| `FillPicker.Tabs` | Tablist wrapper. Visual styling only. |
| `FillPicker.Tab` | `mode="color" \| "gradient"`. Reads/writes mode from context. |
| `FillPicker.Pane` | `mode="color" \| "gradient"`. Renders children only when mode matches. Mounts the appropriate sub-context. |

### `GradientPicker.*` (under `parts/gradient/`)

| Part | Purpose |
|---|---|
| `GradientPicker.Root` | Standalone use (no `FillPicker` shell). Mounts `GradientPickerContext` directly. |
| `GradientPicker.Bar` | The gradient strip. Renders the live gradient preview, draggable stop handles, click-to-add, drag-down-to-remove. Owns selected-stop state. |
| `GradientPicker.TypeSwitcher` | Linear / Radial / Conic toggle. |
| `GradientPicker.AngleDial` | Circular dial + degree input. Active for linear & conic. No-op for radial. |
| `GradientPicker.CenterPad` | 2D pad for radial/conic center (x,y). Active for radial & conic. |
| `GradientPicker.RadialShape` | Circle/ellipse + size toggle. Radial only. |
| `GradientPicker.StopList` | Optional rows view: swatch, position input, delete. For "full" layout. |
| `GradientPicker.StopColor` | Mounts the selected stop into `ColorPickerContext`. Children are normal `ColorPicker.*` parts — full reuse, zero duplication. |
| `GradientPicker.InterpSwitcher` | oklch / oklab / srgb / hsl / hsl-longer dropdown. |
| `GradientPicker.Presets` | Curated grid like `Swatches`. Accepts `presets={...}` to override. |
| `GradientPicker.CssInput` | Paste/edit CSS gradient string directly. Mirrors `ColorPicker.CssInput`. |

## Layout variants (demo recipes)

These are not new code — they are compositions shown in `/docs` as
`<PreviewTabs>`, matching the existing pattern.

### Compact

```tsx
<GradientPicker.Bar />
<GradientPicker.TypeSwitcher />
<GradientPicker.StopColor>
  <ColorPicker.Hue />
  <ColorPicker.ChannelInput />
</GradientPicker.StopColor>
```

### Full

```tsx
<GradientPicker.TypeSwitcher />
<GradientPicker.Bar />
<GradientPicker.AngleDial />          {/* shows for linear/conic */}
<GradientPicker.CenterPad />          {/* shows for radial/conic */}
<GradientPicker.StopList />
<GradientPicker.StopColor>
  <ColorPicker.Area />
  <ColorPicker.Hue />
  <ColorPicker.Alpha />
  <ColorPicker.ChannelInput />
</GradientPicker.StopColor>
<GradientPicker.InterpSwitcher />
<GradientPicker.Presets />
```

### Bar-only

```tsx
<GradientPicker.Bar />
```

## File layout

```text
registry/new-york/color-picker/
  lib/gradient.ts                  ← types, parse/format
  hooks/use-gradient-picker.ts     ← gradient state machine + selected stop
  hooks/use-fill-picker.ts         ← mode + value bridge
  parts/fill/
    root.tsx
    tabs.tsx                       ← Tabs + Tab + Pane
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
  fill-picker.tsx                  ← barrel: { Color, Gradient, Fill } namespaces
```

## Registry workflow

All new files added as `registry:ui` / `registry:lib` / `registry:hook`
entries with `target: components/ui/fill-picker/...` mirroring today's path
scheme. Single registry item still — `fill-picker` — gradient parts ship in
the same artifact. `npx shadcn add` copies all files into the consumer's
`components/ui/fill-picker/` folder; their bundler then tree-shakes any
file whose exports they never import. Consumers may also delete unused
gradient files from their repo without touching the color side, since the
parts are physically separated under `parts/gradient/` and `parts/fill/`.

`pnpm registry:build` regenerates `public/r/fill-picker.json`. CI does this
automatically.

## Backward compatibility

- `<ColorPicker.Root>` keeps current signature unchanged
  (`value: OklchColor`, `onValueChange(c, hex)`). Its existing implementation
  (call `useColorPicker`, provide `ColorPickerContext`) stays as-is.
- `<FillPicker.Pane mode="color">` and `<GradientPicker.StopColor>` are
  additional independent mount points for the same pattern: each calls
  `useColorPicker` with a value bound to its own slice of state
  (`fill.color` and `selectedStop.color` respectively), and provides
  `ColorPickerContext` for its children. Three sibling mount sites of the
  same hook, no shared provider extraction needed.
- All existing `ColorPicker.Area / Hue / etc.` work unchanged inside any of
  the three mount sites — they only depend on `ColorPickerContext`.
- Existing demo (`Hero`) needs zero changes.
- Existing tests stay green.

## Subtleties to preserve

- **Hue preservation across achromatic round-trips** in `useColorPicker`
  applies to each stop independently. The selected-stop binding in
  `GradientPicker.StopColor` must not collapse hue when a stop becomes black
  or white — same `lastGoodHueRef` semantics, scoped per stop index.
- **Hue pinning after gamut clamp** in `<ColorPicker.Area>` continues to
  work unchanged when the area is mounted inside `GradientPicker.StopColor`.
- **OKLCH-canonical math** stays in the picker; gradient-to-CSS goes through
  a single `formatGradient` path that emits `in oklch` interpolation by
  default. CSS-to-OKLCH parsing on input goes through the existing
  `parseColor` per stop.

## Testing

- `lib/gradient.test.ts` — round-trip parse↔format for all three types, all
  interp spaces, edge cases (1 stop, 2 stops, hint midpoints, 0°/360°,
  Display-P3 stops).
- `hooks/use-gradient-picker.test.ts` — add / remove / reorder / move stops,
  type switch preserves stops, selected-stop tracking, defaults.
- `parts/gradient/bar.test.tsx` — pointer add/remove/drag, keyboard a11y
  (selected stop arrow keys move position).
- Existing `color.test.ts`, `use-color-picker.test.ts` stay untouched and
  green. Existing area drag-feedback hue-pinning tests must still pass when
  the area is mounted inside `GradientPicker.StopColor`.

## Demo & docs

- `/docs` page gets a new "Gradient picker" section with the three layout
  recipes as `<PreviewTabs>`.
- `Hero` stays color-only for now (it's a brand surface; gradient demo lives
  in `/docs`, and a dedicated `/playground` route can come later).

## Variants delivered

- ✓ Gradient types — linear, radial, conic
- ✓ Layouts — three demo recipes (compact / full / bar-only) on `/docs`
- ✓ Presets — `<GradientPicker.Presets>` with built-in starter set + override
- ✓ Interpolation — `<GradientPicker.InterpSwitcher>`, defaults to `oklch`

## Future work

- [ ] Mesh gradients (revisit when CSS spec stabilizes)
- [ ] Drag-on-canvas radial/conic center editor (replace numeric `CenterPad`)
- [ ] Image fill (new `Fill.kind`)
- [ ] Video fill (new `Fill.kind`)
- [ ] Gradient noise / dithering
- [ ] Multi-fill stacking (`Fill[]` value)
- [ ] Preset-to-preset animation

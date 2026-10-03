/**
 * Single source of truth for the agent-readable docs.
 * Served by /docs.md, /llms-full.txt, and consumed by the "Copy for AI" button.
 *
 * The Root props table and the hook / utility snippets come from
 * ./docs-api, shared with src/app/docs/full-docs.tsx. The prose is still
 * mirrored by hand; docs-sync.test.ts catches API drift between the two.
 */

import { GRADIENT_PART_ROWS, HOOK_CODE, ROOT_PROPS, UTILS_CODE, propsTableMarkdown, toBasePaths } from "./docs-api";

export const SITE_URL = "https://amplo.ale.design";
// Plain item names are the Base UI variant (matching shadcn's Base-UI-first
// registry, July 2026); the Radix / shadcn-classic variants carry a -radix
// suffix.
export const COLOR_PICKER_URL = `${SITE_URL}/r/color-picker.json`;
export const GRADIENT_PICKER_URL = `${SITE_URL}/r/gradient-picker.json`;
/** Default "give me everything" URL — also re-exported as REGISTRY_URL for backwards compat. */
export const FILL_PICKER_URL = `${SITE_URL}/r/fill-picker.json`;
export const COLOR_PICKER_RADIX_URL = `${SITE_URL}/r/color-picker-radix.json`;
export const GRADIENT_PICKER_RADIX_URL = `${SITE_URL}/r/gradient-picker-radix.json`;
export const FILL_PICKER_RADIX_URL = `${SITE_URL}/r/fill-picker-radix.json`;
export const REGISTRY_URL = FILL_PICKER_URL;

/** Short llms.txt index per https://llmstxt.org. */
export const LLMS_TXT = `# Amplo Fill Picker

> OKLCH-native, Display-P3-aware color / fill picker for shadcn. Composable, accessible, gamut-aware. Drop into any Next.js + Tailwind v4 app with one shadcn CLI command — pick the entry point that fits.

The picker stores all state as OKLCH (perceptually uniform) and converts to hex / rgb / hsl / hsb / oklch / oklab / display-p3 on demand. The component API follows the Radix compound pattern across three namespaces: \`ColorPicker\` (solid color), \`GradientPicker\` (linear / radial / conic gradients with CSS Color 4 interpolation), and \`FillPicker\` (a switcher that toggles between the two). There is no kitchen-sink default component; consumers compose the layout they want.

## Install

Two variants share one OKLCH engine. Plain item names are the **Base UI variant** — the default, matching shadcn's Base-UI-first registry; the Radix / shadcn-classic variants carry a \`-radix\` suffix. Entry points pull each other via shadcn \`registryDependencies\`, so files never duplicate; Base UI parts land in \`components/ui/fill-picker-base/\`, the shared engine and Radix parts in \`components/ui/fill-picker/\`.

\`\`\`sh
# Base UI (default):
# Solid color only
pnpm dlx shadcn@latest add ${COLOR_PICKER_URL}

# Gradient editor (pulls color-picker)
pnpm dlx shadcn@latest add ${GRADIENT_PICKER_URL}

# Color + gradient + the switcher — the "give me everything" default
pnpm dlx shadcn@latest add ${FILL_PICKER_URL}

# Radix / shadcn-classic variants:
pnpm dlx shadcn@latest add ${COLOR_PICKER_RADIX_URL}
pnpm dlx shadcn@latest add ${GRADIENT_PICKER_RADIX_URL}
pnpm dlx shadcn@latest add ${FILL_PICKER_RADIX_URL}
\`\`\`

## Docs

- [Full reference (markdown)](${SITE_URL}/llms-full.txt): Complete API, parts, hooks, utilities, examples, and color-space notes in a single file. Fetch this for any non-trivial integration question.
- [Docs page (HTML)](${SITE_URL}/docs): Same content, with live previews. Send \`Accept: text/markdown\` to get markdown at the same URL.
- [Registry manifest](${REGISTRY_URL}): shadcn registry JSON (files, dependencies, install target).

## Optional

- [Playground](${SITE_URL}/playground): Live preset variants of the picker.
- [Home](${SITE_URL}): Marketing landing.
`;

/** Full markdown reference. Mirrors /docs page structure. */
export const DOCS_MARKDOWN = `# Amplo Fill Picker

OKLCH-native, Display-P3-aware color / fill picker for shadcn. Composable, accessible, gamut-aware. Drop into any Next.js + Tailwind v4 app with one shadcn CLI command — pick the entry point that fits.

> **For AI agents:** This file is the canonical reference. Every API surface the user can compose is documented below. The component is shadcn-style — there is no default \`<ColorPicker />\`; consumers compose \`<ColorPicker.Root>\` with the parts they need.

## Installation

Two variants, one engine. Plain item names are the **Base UI variant** — the default, matching shadcn's Base-UI-first registry (its interactive parts are rebuilt on Base UI Slider / Select / NumberField / RadioGroup and pull the shared engine automatically). The Radix / shadcn-classic tree remains fully supported under \`-radix\` names. Base UI parts land in \`components/ui/fill-picker-base/\`; the shared engine and Radix parts in \`components/ui/fill-picker/\`.

| Need | URL |
|------|-----|
| **Solid color only (Base UI)** | \`${COLOR_PICKER_URL}\` |
| **Add gradient editing (Base UI)** | \`${GRADIENT_PICKER_URL}\` |
| **Color + gradient + a switcher (Base UI, recommended)** | \`${FILL_PICKER_URL}\` |
| Radix: solid color only | \`${COLOR_PICKER_RADIX_URL}\` (21 own files) |
| Radix: add gradient editing | \`${GRADIENT_PICKER_RADIX_URL}\` (27 own files + color-picker-radix) |
| Radix: color + gradient + a switcher | \`${FILL_PICKER_RADIX_URL}\` (6 own files + both above) |

\`\`\`sh
pnpm dlx shadcn@latest add ${FILL_PICKER_URL}
# or: npx shadcn@latest add ${FILL_PICKER_URL}
# or: bunx shadcn@latest add ${FILL_PICKER_URL}
# or: yarn dlx shadcn@latest add ${FILL_PICKER_URL}
\`\`\`

The shadcn CLI drops the Base UI parts into \`components/ui/fill-picker-base/\` (with the shared engine under \`components/ui/fill-picker/\`) and installs \`@base-ui/react\`, \`culori\` + \`@types/culori\`, \`lucide-react\`, and \`class-variance-authority\` as dependencies. Requires Tailwind v4, React 19, and **shadcn CLI 4.7.0 or newer** — install targets resolve through your \`components.json\` aliases, which older CLIs can't resolve. \`pnpm dlx shadcn@latest\` (as above) always satisfies that.

**Upgrading from a pre-2.0.0 install:** re-run the same add command with \`--overwrite\` (shadcn CLI 4.7.0+). Install paths now resolve through your \`components.json\` aliases, so files may land somewhere new — treat the freshly written set as canonical. Base UI projects can afterwards delete leftover Radix-dialect files that 2.0.0 no longer ships (the old \`components/ui/fill-picker/{color-picker,gradient-picker,fill-picker}.tsx\` barrels and the Radix-only \`parts/\` files; the release notes list them) and repoint any imports of those barrels to the \`fill-picker-base/\` ones.

Every code block below uses the **Base UI** import paths, since that is what \`${FILL_PICKER_URL}\` installs: \`@/components/ui/fill-picker-base/fill\` (everything), \`@/components/ui/fill-picker-base/color-picker\`, \`@/components/ui/fill-picker-base/gradient\`. If you installed a \`-radix\` item instead, the exports are identical but live under \`@/components/ui/fill-picker/fill-picker\`, \`@/components/ui/fill-picker/color-picker\`, and \`@/components/ui/fill-picker/gradient-picker\` — swap the import path and every snippet works unchanged. A Base UI install does **not** ship those Radix barrels, and a Radix install does not ship the \`fill-picker-base/\` ones.

## Usage

OKLCH is the lossless source of truth. Pass an \`OklchColor\` object as \`value\` for full fidelity, or any CSS Color 4 string for input convenience. Every change emits the canonical color plus a pre-serialized \`formats\` record, so a fallback (e.g. hex) is always one property access away.

\`\`\`tsx
import * as React from "react";
import { ColorPicker, parseColor } from "@/components/ui/fill-picker-base/color-picker";

export function Example() {
  // Store the canonical OklchColor; derive any string output from \`formats\`.
  const [color, setColor] = React.useState(() => parseColor("oklch(0.7 0.18 30)")!);
  const [hex, setHex] = React.useState("#cf6f4f");
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={(next, _formatted, formats) => {
        setColor(next);
        setHex(formats.hex); // fallback always available
      }}
      backgroundColor="#ffffff"
    >
      <ColorPicker.Area />
      <ColorPicker.Hue />
      <ColorPicker.ChannelInput />
    </ColorPicker.Root>
  );
}
\`\`\`

## Canonical layout (recommended starting point)

\`\`\`tsx
"use client";

import * as React from "react";
import { ColorPicker, parseColor } from "@/components/ui/fill-picker-base/color-picker";

export function ColorPickerDemo() {
  const [color, setColor] = React.useState(() => parseColor("oklch(0.7 0.18 30)")!);
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={(next) => setColor(next)}
      backgroundColor="#ffffff"
    >
      <div className="flex items-stretch gap-2">
        <ColorPicker.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
        <ColorPicker.ContrastReadout
          metrics={["wcag", "apca"]}
          showLabel={false}
          showValue={false}
          className="w-auto flex-1 justify-center"
        />
      </div>
      <ColorPicker.Area mode="oklch-cl" />
      <div className="flex flex-col gap-1.5">
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
      </div>
      <div className="flex items-center gap-2">
        <ColorPicker.FormatSwitcher className="flex-1" />
        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
      </div>
      <ColorPicker.ChannelInput showFormat={false} />
      <ColorPicker.Swatches />
    </ColorPicker.Root>
  );
}
\`\`\`

## Examples

### HSV-style area

\`areaMode="hsv-sv"\` anchors the top-left corner to white and top-right to fully saturated, like Photoshop or Framer.

\`\`\`tsx
<ColorPicker.Area mode="hsv-sv" />
\`\`\`

### Chroma × hue area

When the area is \`oklch-hc\`, swap the Hue slider for a Lightness slider.

\`\`\`tsx
<ColorPicker.Root value={color} onValueChange={setColor} backgroundColor="#ffffff">
  <ColorPicker.Area mode="oklch-hc" />
  <ColorPicker.Lightness />
  <ColorPicker.Alpha />
  <ColorPicker.ChannelInput />
</ColorPicker.Root>
\`\`\`

### Inside a Popover

\`\`\`tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

<Popover>
  <PopoverTrigger asChild>
    <button>Pick a color</button>
  </PopoverTrigger>
  <PopoverContent align="start" sideOffset={8} className="w-auto p-0 border-0 bg-transparent shadow-none">
    <ColorPicker.Root value={color} onValueChange={setColor} backgroundColor="#ffffff">
      <ColorPicker.Area />
      <ColorPicker.Hue />
      <ColorPicker.Alpha />
      <ColorPicker.ChannelInput />
    </ColorPicker.Root>
  </PopoverContent>
</Popover>
\`\`\`

### User-saved swatches

Lift the \`presets\` array and pass \`onAdd\` — the consumer owns persistence.

\`\`\`tsx
const STARTERS = ["#ffffff", "#000000", "oklch(0.7 0.18 30)"];

const [saved, setSaved] = React.useState<string[]>([]);
React.useEffect(() => {
  const raw = window.localStorage.getItem("my-saved-swatches");
  if (raw) setSaved(JSON.parse(raw));
}, []);

<ColorPicker.Swatches
  presets={[...STARTERS, ...saved]}
  onAdd={(_color, hex) => {
    setSaved((prev) => {
      if (prev.includes(hex)) return prev;
      const next = [...prev, hex];
      window.localStorage.setItem("my-saved-swatches", JSON.stringify(next));
      return next;
    });
  }}
/>
\`\`\`

## Anatomy

\`\`\`tsx
<ColorPicker.Root>
  <ColorPicker.Area />
  <ColorPicker.Preview />
  <ColorPicker.Hue />
  <ColorPicker.Lightness />     {/* used with areaMode="oklch-hc" */}
  <ColorPicker.Alpha />
  <ColorPicker.EyeDropper />
  <ColorPicker.GamutBadge />
  <ColorPicker.ChannelInput />  {/* format dropdown + per-channel fields */}
  <ColorPicker.FormatSwitcher /> {/* alt: standalone format select */}
  <ColorPicker.CssInput />       {/* alt: single CSS-string text field */}
  <ColorPicker.ContrastReadout />
  <ColorPicker.Swatches />
</ColorPicker.Root>
\`\`\`

## API: \`<ColorPicker.Root>\`

\`ColorFormat = "hex" | "rgb" | "hsl" | "hsb" | "oklch" | "oklab" | "p3"\`

${propsTableMarkdown(ROOT_PROPS)}

## API: Parts

### \`<ColorPicker.Area>\`
**Props:** \`mode\`, \`chromaMax\`, \`gamut\`, \`showWarningLines\`, \`resolution\`.

\`mode\` picks the axes:
- \`oklch-cl\` (default) — Y = OKLCH lightness, top row is white.
- \`hsv-sv\` — Y = HSV-style "value", top-left = white, top-right = saturated.
- \`oklch-hc\` — X = hue, Y = chroma. Pair with \`ColorPicker.Lightness\`.

\`gamut\` controls the render gamut and warning lines: \`"srgb" | "p3" | "rec2020" | "none"\`. Defaults to the gamut implied by the active output format. \`showWarningLines\` (default \`true\`) toggles the cutoff lines without changing the render gamut. Keyboard: arrows ±1%, Shift+arrows ±10%, Home/End, PageUp/Down.

### \`<ColorPicker.Hue>\`
**Props:** \`orientation\` (\`"horizontal" | "vertical"\`).

Hue slider. Pair with Area mode \`oklch-cl\` or \`hsv-sv\`. Mode-aware: when format is \`hsl\` or \`hsb\` the slider tracks that format's hue scale (so the bead matches the channel input H exactly); for OKLCH/OKLab it tracks canonical OKLCH hue with chroma rescaling on commit. Hex/RGB/P3 fall back to OKLCH hue.

### \`<ColorPicker.Lightness>\`
**Props:** \`orientation\`.

Lightness slider (OKLCH \`l\` 0→1). Gradient is sampled at the current hue+chroma. Pair with Area mode \`oklch-hc\`.

### \`<ColorPicker.Chroma>\`
**Props:** \`orientation\`.

Chroma slider (OKLCH \`c\` 0→0.4). The track is painted at the current hue × lightness, so the ramp shows how chroma changes the user's color. Keyboard: arrows ±0.005, Shift ±0.05, Home/End, PageUp/Down ±0.05.

### \`<ColorPicker.Alpha>\`
Opacity slider with checkerboard background.

### \`<ColorPicker.Preview>\`
40px swatch composited over \`backgroundColor\`.

### \`<ColorPicker.CssInput>\`
Single text input that parses any CSS Color 4 string on Enter/blur. Marks invalid via \`aria-invalid\`; Escape reverts.

### \`<ColorPicker.FormatSwitcher>\`
**Props:** \`formats\`.

Native \`<select>\` of formats. Reads the available list from \`<ColorPicker.Root formats={...}>\`; pass an explicit \`formats\` prop to override locally.

### \`<ColorPicker.ChannelInput>\`
**Props:** \`formats\`, \`showFormat\` (default \`true\`).

Photoshop-style multi-field input. Renders the format selector + one numeric field per channel (R/G/B/A%, H/S/L/A%, etc.) plus an alpha % field. For \`hex\` falls back to a single text field. Pass \`showFormat={false}\` when pairing with a standalone \`<FormatSwitcher />\` elsewhere in the layout (skips the inline selector). Each numeric field supports ↑/↓ to step (Shift = big step) and accepts a pasted CSS color string from any field.

### \`<ColorPicker.Swatches>\`
**Props:** \`presets\`, \`onAdd\`.

Grid of preset chips. \`presets\` accepts any CSS color strings (including wide-gamut \`color(display-p3 …)\` — they paint in their native gamut on capable displays). When \`onAdd\` is provided, renders a "+" tile after the presets that calls \`onAdd(color, hex)\`; the consumer owns persistence (lift \`presets\` and update on add — localStorage / a server / a store / etc.).

### \`<ColorPicker.GamutBadge>\`
**Props:** \`showLabel\` (default \`true\`).

Live status: sRGB / P3 / Rec.2020 / Out of gamut. Hovering shows a tooltip with the active color space. Set \`showLabel={false}\` to drop the "Gamut" prefix and render just the space name (good for cramped layouts paired with ContrastReadout in the same row).

### \`<ColorPicker.ContrastReadout>\`
**Props:** \`metrics\`, \`defaultMetric\`, \`showLabel\`, \`showValue\`, \`showBadges\` (all booleans default \`true\`).

Surfaces one contrast metric at a time. \`metrics\` is \`("wcag" | "apca")[]\` (default \`["wcag"]\`); when \`metrics.length > 1\` the readout becomes a button — click to cycle, with a tooltip on the ⇅ icon that names the next metric. Toggle \`showLabel\` / \`showValue\` / \`showBadges\` to hide the metric name, the numeric value, or the AA/AAA / body/headline / fail pills — set everything but \`showBadges\` to false for a minimal pass/fail-only badge. Each pass/fail badge has its own hover tooltip explaining the threshold (e.g. "Passes WCAG AA — body text needs ≥ 4.5:1").

### \`<ColorPicker.EyeDropper>\`
Native EyeDropper API. Renders nothing on unsupported browsers.

## API: \`useColorPicker\` hook

Headless layer powering every part. Use it directly when you want a totally custom UI but the same state machine.

\`\`\`tsx
${HOOK_CODE}
\`\`\`

## API: Color utilities

Exported from the same module:

\`\`\`tsx
${toBasePaths(UTILS_CODE)}
\`\`\`

## API: Types

Every type the picker exports. Type your own state against these rather than re-declaring the shapes.

\`\`\`tsx
interface OklchColor {
  l: number;      // 0..1 perceptual lightness
  c: number;      // chroma, unbounded above (not clamped to a display gamut)
  h: number;      // 0..360 degrees
  alpha: number;  // 0..1
}

type ColorFormat = "hex" | "rgb" | "hsl" | "hsb" | "oklch" | "oklab" | "p3";
type Gamut = "srgb" | "p3" | "rec2020";

interface GamutInfo { inSrgb: boolean; inP3: boolean; inRec2020: boolean }

interface ContrastResult {
  wcag: number;   // WCAG 2.1 ratio, 1..21
  wcagLevel: { aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean };
  apca: number;   // APCA Lc, signed: negative = light text on dark
}

type GradientType = "linear" | "radial" | "conic";
type GradientInterp = "oklch" | "oklab" | "srgb" | "hsl" | "hsl-longer";
type RadialSizeKeyword =
  | "closest-side" | "closest-corner" | "farthest-side" | "farthest-corner";

// What <FillPicker> emits
type ColorFill    = { kind: "color";    color: OklchColor };
type GradientFill = { kind: "gradient"; gradient: Gradient };
type Fill = ColorFill | GradientFill;
\`\`\`

The \`Gradient\` union itself is under "Output: state shape" below.

## Gradient picker

\`GradientPicker\` is a separate compound namespace that builds on top of the color picker. Install \`gradient-picker.json\` (pulls the color picker automatically).

\`\`\`tsx
import { GradientPicker, DEFAULT_LINEAR, type Gradient } from "@/components/ui/fill-picker-base/gradient";

export function GradientDemo() {
  const [gradient, setGradient] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={gradient} onValueChange={setGradient}>
      <GradientPicker.TypeSwitcher />          {/* linear / radial / conic */}
      <GradientPicker.Area />                  {/* live gradient + drag handles */}
      <GradientPicker.Bar editOnClick />       {/* horizontal stop strip */}
      <GradientPicker.InterpSwitcher />        {/* color space for interpolation */}
      <GradientPicker.StopList />              {/* per-stop editor popovers */}
      <GradientPicker.Presets />               {/* built-in starter ramps */}
    </GradientPicker.Root>
  );
}
\`\`\`

### Output: state shape

The canonical state is a discriminated \`Gradient\` union. Every change emits a value that round-trips losslessly through \`formatGradient\` / \`parseGradient\`. Stops always serialize as \`oklch(…)\` regardless of the per-stop display format chosen in the UI, so output is wide-gamut by default.

\`\`\`tsx
type GradientStop = {
  position: number;            // 0..1 along the bar
  color: OklchColor;
  hint?: number;               // 0..1 midpoint (data layer present; UI deferred)
  id?: string;                 // opt-in stable identity — see note below
};
type LinearGradient = {
  type: "linear";
  angle: number;               // CSS degrees (0 = up)
  start?: { x: number; y: number };  // 0..1, optional positioned linear
  end?:   { x: number; y: number };
  repeating?: boolean;
  interp: GradientInterp;
  stops: GradientStop[];
};
type RadialGradient = {
  type: "radial";
  shape: "circle" | "ellipse";
  size?: "closest-side" | "closest-corner" | "farthest-side" | "farthest-corner";
  center: { x: number; y: number };  // 0..1
  radii?: { x: number; y: number };  // 0..1, takes precedence over size (ellipse path)
  radiusPx?: number;                 // absolute px, circle path
  repeating?: boolean;
  interp: GradientInterp;
  stops: GradientStop[];
};
type ConicGradient = {
  type: "conic";
  startAngle: number;          // CSS degrees
  center: { x: number; y: number };
  repeating?: boolean;
  interp: GradientInterp;
  stops: GradientStop[];
};
type Gradient = LinearGradient | RadialGradient | ConicGradient;
\`\`\`

#### Stop identity (\`GradientStop.id\`, optional)

In **controlled** mode the picker reconciles an incoming \`value\` against its own state by stop position and array index. That cannot distinguish two stops sharing the same position: reorder them externally and the colors move between stops while the selected stop and per-stop color format stay pointing at the old ones.

Give each stop a stable \`id\` and reconciliation matches on identity instead, so selection, per-stop format, and colors all follow the right stop through any reorder. Rules:

- Ids must be unique within a gradient; duplicates are ignored and fall back to a generated id.
- All-or-nothing per gradient — a half-tagged stop array is treated as untagged.
- Don't derive the id from position or array index; that reintroduces the ambiguity.
- Ids round-trip: \`onValueChange\` echoes them back, including on stops added inside the picker, so \`onValueChange={(g) => setGradient(g)}\` is enough to persist them.
- Fully opt-in. Omit \`id\` and behavior is unchanged, and no \`id\` key appears in anything the picker emits.

\`\`\`tsx
import { formatGradient, parseGradient } from "@/components/ui/fill-picker-base/gradient";

const css = formatGradient(gradient);   // "linear-gradient(0deg in oklch, oklch(...) 0%, oklch(...) 100%)"
const back = parseGradient(css);        // Gradient | null
\`\`\`

### Interpolation

\`GradientInterp = "oklch" | "oklab" | "srgb" | "hsl" | "hsl-longer"\`. Emitted as the CSS Color 4 \`in <space>\` clause. \`oklch\` (default) gives perceptually-even ramps; \`hsl-longer\` takes the long way around the hue wheel.

### Shape controls (radial)

When \`gradient.type === "radial"\`, three controls are available:

- \`<GradientPicker.ShapeSwitcher />\` — circle ↔ ellipse (segmented toggle, role=group + aria-pressed)
- \`<GradientPicker.RadiusInput />\` — single radius in px (circle path)
- \`<GradientPicker.EllipseRadiiInput />\` — x/y radii in percent (ellipse path)
- \`<GradientPicker.RadialSizeSelect />\` — keyword form (\`closest-side\` … \`farthest-corner\`)

Setters enforce shape: \`setRadiusPx(...)\` implies \`shape: "circle"\`, \`setRadii(...)\` implies \`shape: "ellipse"\`. Toggling back via \`ShapeSwitcher\` restores the previous override (each shape's last value is stashed on flip).

### Key parts

${propsTableMarkdown(GRADIENT_PART_ROWS, "Part", "Props")}

## Fill picker (color + gradient switcher)

\`FillPicker\` adds a Solid/Gradient mode switcher on top. Install \`fill-picker.json\` (pulls both color-picker and gradient-picker).

\`\`\`tsx
import { FillPicker, GradientPicker, ColorPicker, type Fill } from "@/components/ui/fill-picker-base/fill";

export function FillDemo() {
  const [fill, setFill] = React.useState<Fill>({ kind: "color", color: { l: 0.7, c: 0.18, h: 30, alpha: 1 } });
  return (
    <FillPicker.Root value={fill} onValueChange={setFill}>
      <FillPicker.Tabs>
        <FillPicker.Tab value="color">Color</FillPicker.Tab>
        <FillPicker.Tab value="gradient">Gradient</FillPicker.Tab>
      </FillPicker.Tabs>
      <FillPicker.Pane value="color">
        <ColorPicker.Area />
        <ColorPicker.Hue />
      </FillPicker.Pane>
      <FillPicker.Pane value="gradient">
        <GradientPicker.Bar editOnClick />
        <GradientPicker.StopList />
      </FillPicker.Pane>
    </FillPicker.Root>
  );
}
\`\`\`

\`Fill = ColorFill | GradientFill\`. \`formatFill(fill)\` returns the CSS value for either branch (\`oklch(…)\` or \`linear-gradient(…)\`). \`FillPicker.Root\` animates its height across pane swaps via a ResizeObserver-driven inline px height.

## Color spaces

- **sRGB.** Baseline web gamut. Every device made in the last 30 years can render it. \`#hex\`, \`rgb()\`, \`hsl()\` all live here.
- **Display-P3.** Apple's wide-gamut space. Every recent iPhone, iPad, MacBook supports it; many newer Android phones too. About 25% wider than sRGB, especially in reds and greens. Authored as \`color(display-p3 r g b)\`.
- **OKLCH.** Perceptually uniform polar space. The same chroma value looks equally vivid across all hues; the same lightness looks equally bright. This is why all picker state is stored here — sliders feel intuitive and conversions don't drift. CSS Color 4: \`oklch(L C H)\`.
- **OKLab.** Same color space as OKLCH but in cartesian (a/b) form. Good for color-difference math, less good for UIs.

When you author a P3-or-wider color and the user's display can't render it, the browser falls back. The \`<GamutBadge>\` and the warning lines on \`<Area>\` keep you informed. Pick \`hex\`/\`rgb\`/\`hsl\`/\`hsb\` and the area fills with sRGB only — no warning line. Pick \`p3\` and a single thin line marks the sRGB cutoff inside the P3 fill. Pick \`oklch\`/\`oklab\` and two thin lines mark the sRGB and P3 cutoffs inside the Rec.2020 fill.

## Accessibility

- **Keyboard.** Every interactive part is reachable via Tab. Sliders follow the WAI-ARIA APG slider pattern (arrow keys ±1, Shift ±10, Home/End, PageUp/Down). The 2D Area and gradient pads use \`role="application"\` with \`aria-roledescription\` and a value-bearing \`aria-label\`. Segmented toggles (e.g. \`<GradientPicker.ShapeSwitcher>\`) use \`role="group"\` + \`aria-pressed\` per button.
- **Pointer + touch.** Pointer capture so drags don't escape; \`touch-none\` to suppress browser scroll while interacting.
- **Focus.** Visible focus ring on all controls via \`focus-visible:ring\`.
- **Color independence.** Gamut and contrast information is conveyed via text + ARIA, not color alone.
- **Reduced motion.** No auto-animation; inherits user preference for swatch hover scale.

## License

MIT.
`;

/**
 * Curated prompt for the "Copy for AI" button. Designed to paste into Claude/Cursor/ChatGPT.
 *
 * `composition` is the snippet the user actually built in the playground. Passing it turns
 * the prompt from "here are the docs, good luck" into "here is my exact composition, start
 * from it" — which is the whole point of having tuned the knobs. Without it the agent
 * re-derives a generic example and silently drops every choice the user just made.
 */
export function buildAiPrompt(composition?: string): string {
  const setup = composition?.trim()
    ? `
This is the exact composition I configured in the playground — start from it rather than a
blank slate, and preserve the parts and props I chose unless they conflict with my task:

\`\`\`tsx
${composition.trim()}
\`\`\`
`
    : "";

  return `I'm integrating Amplo Fill Picker — an OKLCH-native, Display-P3-aware color / fill picker for shadcn — into my Next.js + Tailwind v4 app.

Read the full reference here before answering: ${SITE_URL}/llms-full.txt

Key constraints:
- The component is shadcn-style with a Radix compound API across three namespaces:
  - \`ColorPicker\` — solid-color parts (\`Area\`, \`Hue\`, \`Lightness\`, \`Chroma\`, \`Alpha\`, \`ChannelInput\`, \`FormatSwitcher\`, \`Swatches\`, \`GamutBadge\`, \`ContrastReadout\`, \`EyeDropper\`, \`Preview\`, \`CssInput\`).
  - \`GradientPicker\` — gradient parts (\`TypeSwitcher\`, \`Area\`, \`Bar\`, \`Overlay\`, \`StopList\`, \`StopColor\`, \`InterpSwitcher\`, \`AnglePad/Input/Group\`, \`PositionPad/Input/Group\`, \`ShapeSwitcher\`, \`RadiusInput\`, \`EllipseRadiiInput\`, \`RadialSizeSelect\`, \`RepeatingToggle\`, \`ReverseStops\`, \`Presets\`, \`CssInput\`).
  - \`FillPicker\` — color/gradient mode switcher (\`Root\`, \`Tabs\`, \`Tab\`, \`Pane\`).
- There is no default \`<ColorPicker />\` / \`<GradientPicker />\` / \`<FillPicker />\` component; consumers compose each \`Root\` with the parts they need.
- Canonical state is \`OklchColor { l, c, h, alpha }\` — pass an object as \`value\` for lossless control. \`onValueChange(color, formatted, formats)\` always provides every format pre-serialized.
- Install with: \`pnpm dlx shadcn@latest add ${FILL_PICKER_URL}\` for the full bundle (color + gradient + switcher), or \`${COLOR_PICKER_URL}\` if you only need solid color. Needs shadcn CLI 4.7.0 or newer. Those are the Base UI items: the rebuilt shells land in \`components/ui/fill-picker-base/\` and the shared OKLCH engine in \`components/ui/fill-picker/\`, so import from \`@/components/ui/fill-picker-base/fill\` (or \`.../color-picker\`, \`.../gradient\`). The Radix / shadcn-classic variants are the separate \`-radix\` items (e.g. \`${FILL_PICKER_RADIX_URL}\`) and import from \`@/components/ui/fill-picker/fill-picker\`.
- If the project ALREADY has an earlier install of this picker (look for \`components/ui/fill-picker/\` or \`fill-picker-base/\`): upgrade by re-running the same add command with \`--overwrite\` (shadcn CLI 4.7.0+). Version 2.0.0 resolves install paths through the project's own \`components.json\` aliases, so files may land somewhere new — treat the freshly written set as canonical. Afterwards, in Base UI projects, delete leftover Radix-dialect files that 2.0.0 no longer ships: the old \`components/ui/fill-picker/{color-picker,gradient-picker,fill-picker}.tsx\` barrels, \`parts/{format-switcher,channel-input,swatches,hue,lightness,alpha,gamut-badge,contrast-readout}.tsx\`, and \`parts/gradient/{type-switcher,interp-switcher,radial-size-select,stop-editor-popover}.tsx\` — then repoint any imports of those barrels to \`@/components/ui/fill-picker-base/fill\` / \`.../color-picker\` / \`.../gradient\`. Do not hand-edit files inside \`components/ui/fill-picker*/\` to fix upgrade issues; re-run the add command instead.
${setup}
My task:
[describe what you want to build]
`;
}

/** The composition-free prompt, for surfaces with nothing to attach (hero, docs). */
export const AI_PROMPT = buildAiPrompt();

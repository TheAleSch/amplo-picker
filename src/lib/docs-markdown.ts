/**
 * Single source of truth for the agent-readable docs.
 * Served by /docs.md, /llms-full.txt, and consumed by the "Copy for AI" button.
 *
 * Keep this in lockstep with src/app/docs/page.tsx — when the human-facing
 * docs change, mirror the change here so agents see the same surface.
 */

export const SITE_URL = "https://amplo.ale.design";
export const REGISTRY_URL = `${SITE_URL}/r/fill-picker.json`;

/** Short llms.txt index per https://llmstxt.org. */
export const LLMS_TXT = `# Amplo Fill Picker

> OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware. Drop into any Next.js + Tailwind v4 app with one CLI command.

The picker stores all state as OKLCH (perceptually uniform) and converts to hex / rgb / hsl / hsb / oklch / oklab / display-p3 on demand. The component API follows the Radix compound pattern (\`<ColorPicker.Root>\` + parts) — there is no kitchen-sink default component; consumers compose the layout they want.

## Install

\`\`\`sh
pnpm dlx shadcn@latest add ${REGISTRY_URL}
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

OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware. Drop into any Next.js + Tailwind v4 app with one CLI command.

> **For AI agents:** This file is the canonical reference. Every API surface the user can compose is documented below. The component is shadcn-style — there is no default \`<ColorPicker />\`; consumers compose \`<ColorPicker.Root>\` with the parts they need.

## Installation

\`\`\`sh
pnpm dlx shadcn@latest add ${REGISTRY_URL}
# or: npx shadcn@latest add ${REGISTRY_URL}
# or: bunx shadcn@latest add ${REGISTRY_URL}
# or: yarn dlx shadcn@latest add ${REGISTRY_URL}
\`\`\`

The shadcn CLI drops the picker into \`components/ui/fill-picker/\` and installs \`culori\` + \`lucide-react\` as runtime dependencies. Requires Tailwind v4 and React 19.

## Usage

OKLCH is the lossless source of truth. Pass an \`OklchColor\` object as \`value\` for full fidelity, or any CSS Color 4 string for input convenience. Every change emits the canonical color plus a pre-serialized \`formats\` record, so a fallback (e.g. hex) is always one property access away.

\`\`\`tsx
import * as React from "react";
import { ColorPicker, parseColor } from "@/components/ui/color-picker/color-picker";

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
import { ColorPicker, parseColor } from "@/components/ui/color-picker/color-picker";

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`value\` | \`string \\| OklchColor\` | — | Controlled value. Pass an OklchColor object for lossless control (recommended); strings work too but lose hue when gamut-clipped to gray/black/white. The picker keeps a sticky-hue fallback for string inputs to mitigate that. |
| \`defaultValue\` | \`string \\| OklchColor\` | — | Uncontrolled initial value. |
| \`onValueChange\` | \`(color, formatted, formats) => void\` | — | Fires on every change. \`color\` is the canonical OklchColor. \`formatted\` is the active format's string. \`formats\` is a \`Record<ColorFormat, string>\` with every supported format pre-serialized. |
| \`format\` | \`ColorFormat\` | — | Controlled output format. |
| \`defaultFormat\` | \`ColorFormat\` | \`"p3"\` | Uncontrolled initial format. |
| \`onFormatChange\` | \`(format) => void\` | — | Fires on format toggle. |
| \`formats\` | \`ColorFormat[]\` | all 7 | Restricts which output formats the picker exposes — both the FormatSwitcher options and the resolved default. |
| \`backgroundColor\` | \`string \\| OklchColor\` | \`"#fff"\` | Background used for contrast metrics and Preview compositing. |

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
const {
  color,           // canonical OklchColor
  format,
  formatted,       // string in 'format'
  formats,         // ColorFormat[] — the list of allowed output formats
  formatStrings,   // Record<ColorFormat, string> — every format pre-serialized
  gamut,           // GamutInfo
  contrast,        // { wcag, wcagLevel, apca }
  setColor,        // accepts string | OklchColor
  setComponent,    // ('l'|'c'|'h'|'alpha', value) — clamped
  adjustComponent, // ('l'|'c'|'h'|'alpha', delta) — wraps for hue
  setFormat,
  setFromString,   // (s) => boolean; false on parse failure
  background,
} = useColorPicker({
  defaultValue: "#ff0000",
  backgroundColor: "#fff",
  formats: ["hex", "oklch", "p3"], // optional; defaults to all
});
\`\`\`

## API: Color utilities

Exported from the same module:

\`\`\`tsx
import {
  parseColor,    // (string) => OklchColor | null
  formatColor,   // (OklchColor, ColorFormat) => string  (sRGB/P3 outputs are gamut-mapped)
  formatAll,     // (OklchColor) => Record<ColorFormat, string>
  gamutInfo,     // (OklchColor) => { inSrgb, inP3, inRec2020 }
  toGamut,       // (OklchColor, "srgb"|"p3"|"rec2020") => OklchColor
  contrast,      // (fg, bg) => { wcag, wcagLevel, apca }
  apcaContrast,  // (fg, bg) => Lc number
  isValidColor,  // (string) => boolean
} from "@/components/ui/color-picker/color-picker";
\`\`\`

## Color spaces

- **sRGB.** Baseline web gamut. Every device made in the last 30 years can render it. \`#hex\`, \`rgb()\`, \`hsl()\` all live here.
- **Display-P3.** Apple's wide-gamut space. Every recent iPhone, iPad, MacBook supports it; many newer Android phones too. About 25% wider than sRGB, especially in reds and greens. Authored as \`color(display-p3 r g b)\`.
- **OKLCH.** Perceptually uniform polar space. The same chroma value looks equally vivid across all hues; the same lightness looks equally bright. This is why all picker state is stored here — sliders feel intuitive and conversions don't drift. CSS Color 4: \`oklch(L C H)\`.
- **OKLab.** Same color space as OKLCH but in cartesian (a/b) form. Good for color-difference math, less good for UIs.

When you author a P3-or-wider color and the user's display can't render it, the browser falls back. The \`<GamutBadge>\` and the warning lines on \`<Area>\` keep you informed. Pick \`hex\`/\`rgb\`/\`hsl\`/\`hsb\` and the area fills with sRGB only — no warning line. Pick \`p3\` and a single thin line marks the sRGB cutoff inside the P3 fill. Pick \`oklch\`/\`oklab\` and two thin lines mark the sRGB and P3 cutoffs inside the Rec.2020 fill.

## Accessibility

- **Keyboard.** Every interactive part is reachable via Tab. Sliders follow the WAI-ARIA APG slider pattern (arrow keys ±1, Shift ±10, Home/End, PageUp/Down). The 2D Area uses \`role="application"\` with \`aria-roledescription\` and \`aria-valuetext\` describing the current point.
- **Pointer + touch.** Pointer capture so drags don't escape; \`touch-none\` to suppress browser scroll while interacting.
- **Focus.** Visible focus ring on all controls via \`focus-visible:ring\`.
- **Color independence.** Gamut and contrast information is conveyed via text + ARIA, not color alone.
- **Reduced motion.** No auto-animation; inherits user preference for swatch hover scale.

## License

MIT.
`;

/** Curated prompt for the "Copy for AI" button. Designed to paste into Claude/Cursor/ChatGPT. */
export const AI_PROMPT = `I'm integrating Amplo Fill Picker — an OKLCH-native, Display-P3-aware color picker for shadcn — into my Next.js + Tailwind v4 app.

Read the full reference here before answering: ${SITE_URL}/llms-full.txt

Key constraints:
- The component is shadcn-style with a Radix compound API. There is no default \`<ColorPicker />\`; consumers compose \`<ColorPicker.Root>\` with the parts they need (\`Area\`, \`Hue\`, \`Lightness\`, \`Alpha\`, \`ChannelInput\`, \`FormatSwitcher\`, \`Swatches\`, \`GamutBadge\`, \`ContrastReadout\`, \`EyeDropper\`, \`Preview\`, \`CssInput\`).
- Canonical state is \`OklchColor { l, c, h, alpha }\` — pass an object as \`value\` for lossless control. \`onValueChange(color, formatted, formats)\` always provides every format pre-serialized.
- Install with: \`pnpm dlx shadcn@latest add ${REGISTRY_URL}\` (drops files into \`components/ui/fill-picker/\`).

My task:
[describe what you want to build]
`;

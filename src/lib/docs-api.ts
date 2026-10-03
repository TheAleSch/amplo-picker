/**
 * API reference data shared by the two copies of the docs: the HTML page
 * (`src/app/docs/full-docs.tsx`) and the agent markdown
 * (`src/lib/docs-markdown.ts`, served at /docs.md and /llms-full.txt).
 * Edit these here, once; `docs-sync.test.ts` checks the rest of the two
 * copies against the real exports.
 */
import type { UseColorPickerProps } from "@/registry/new-york/ui/fill-picker/hooks/use-color-picker";

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  desc: string;
}

/** Radix snippet paths → Base UI paths (snippets are authored against Radix). */
export const SNIPPET_PATH_SWAPS: [string, string][] = [
  ["@/components/ui/fill-picker/fill-picker", "@/components/ui/fill-picker-base/fill"],
  ["@/components/ui/fill-picker/color-picker", "@/components/ui/fill-picker-base/color-picker"],
  ["@/components/ui/fill-picker/gradient-picker", "@/components/ui/fill-picker-base/gradient"],
];

export function toBasePaths(s: string): string {
  return SNIPPET_PATH_SWAPS.reduce((acc, [from, to]) => acc.replaceAll(from, to), s);
}

export const ROOT_PROPS = [
  {
    name: "value",
    type: "string | OklchColor",
    desc: "Controlled value. Pass an OklchColor object for lossless control (recommended); strings work too but lose hue when gamut-clipped to gray/black/white. The picker keeps a sticky-hue fallback for string inputs to mitigate that.",
  },
  {
    name: "defaultValue",
    type: "string | OklchColor",
    desc: "Uncontrolled initial value.",
  },
  {
    name: "onValueChange",
    type: "(color, formatted, formats) => void",
    desc: "Fires on every change. `color` is the canonical OklchColor. `formatted` is the active format's string. `formats` is a Record<ColorFormat, string> with every supported format pre-serialized.",
  },
  {
    name: "format",
    type: "ColorFormat",
    desc: "Controlled output format.",
  },
  {
    name: "defaultFormat",
    type: "ColorFormat",
    default: '"p3"',
    desc: "Uncontrolled initial format.",
  },
  {
    name: "onFormatChange",
    type: "(format) => void",
    desc: "Fires on format toggle.",
  },
  {
    name: "formats",
    type: "ColorFormat[]",
    default: "all 7 formats",
    desc: "Restricts which output formats the picker exposes — both the FormatSwitcher options and the resolved default.",
  },
  {
    name: "backgroundColor",
    type: "string | OklchColor",
    default: "#fff",
    desc: "Background used for contrast metrics and Preview compositing.",
  },
] satisfies (PropRow & { name: keyof UseColorPickerProps })[];

export const HOOK_CODE = `const {
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
});`;

export const UTILS_CODE = `import {
  parseColor,    // (string) => OklchColor | null
  formatColor,   // (OklchColor, ColorFormat) => string  (sRGB/P3 outputs are gamut-mapped)
  formatAll,     // (OklchColor) => Record<ColorFormat, string>
  gamutInfo,     // (OklchColor) => { inSrgb, inP3, inRec2020 }
  toGamut,       // (OklchColor, "srgb"|"p3"|"rec2020") => OklchColor
  contrast,      // (fg, bg) => { wcag, wcagLevel, apca }
  apcaContrast,  // (fg, bg) => Lc number
  isValidColor,  // (string) => boolean
} from "@/components/ui/fill-picker/color-picker";`;

export const GRADIENT_PART_ROWS: PropRow[] = [
  {
    name: "<GradientPicker.Root>",
    type: "value, defaultValue, onValueChange, defaultStopColorFormat",
    desc: "Controlled or uncontrolled gradient state. `onValueChange(gradient, css)` fires with the canonical Gradient object and the pre-serialized CSS string. `defaultStopColorFormat` (default `oklch`) seeds the per-stop display format used by every StopList row and StopColor FormatSwitcher.",
    default: 'defaultStopColorFormat: "oklch"',
  },
  {
    name: "<GradientPicker.TypeSwitcher>",
    type: "—",
    desc: "Dropdown to swap linear / radial / conic. Preserves stops and interpolation across the switch.",
    default: "—",
  },
  {
    name: "<GradientPicker.ReverseStops>",
    type: "—",
    desc: "Icon button. Mirrors every stop position around 0.5 — visual order flips while ids stay attached to their colors. Hint positions flip too.",
    default: "—",
  },
  {
    name: "<GradientPicker.RepeatingToggle>",
    type: "—",
    desc: "Icon toggle. When on, emits `repeating-<type>-gradient(…)` — the stop ramp tiles instead of stretching to fill the box.",
    default: "off",
  },
  {
    name: "<GradientPicker.Bar>",
    type: "height, handleSize, editOnClick",
    desc: "Horizontal stop strip — drag handles to reposition, drag below the bar (~24px) to remove. With `editOnClick`, a tap-without-drag opens the same stop-color editor popover that StopList uses (movement-based detection: flicking a handle a pixel counts as a drag, not a tap).",
    default: "height: 12, handleSize: 16, editOnClick: false",
  },
  {
    name: "<GradientPicker.Area>",
    type: "—",
    desc: "Visual 2D pad — paints the live gradient and overlays draggable handles for direction (linear endpoints), center (radial/conic), or shape size. Pair with Bar for the canonical layout.",
    default: "—",
  },
  {
    name: "<GradientPicker.Overlay>",
    type: "—",
    desc: "Same handles as Area, but transparent — drop inside any consumer-rendered canvas (e.g. a preview frame) and the handles align to that element's box. The canvas paints the gradient itself; Overlay only contributes interaction.",
    default: "—",
  },
  {
    name: "<GradientPicker.StopList>",
    type: "showAddStop",
    desc: "Keyboard-driven listbox of stops. Each row: swatch (click → full stop-color popover bound to that stop), numeric % position with ↑/↓ nudge, inline CSS-color paste field, remove button. Trailing `+ Add stop` inserts halfway to the next neighbor (or to the previous neighbor when the selected stop is last), sampling the existing ramp.",
    default: "showAddStop: true",
  },
  {
    name: "<GradientPicker.StopColor>",
    type: "(children)",
    desc: "Mounts ColorPickerContext bound to the selected stop. Drop any `<ColorPicker.*>` parts inside to build a per-stop editor surface (Area, Hue, Chroma, Lightness, ChannelInput, FormatSwitcher, …).",
    default: "—",
  },
  {
    name: "<GradientPicker.AngleGroup>",
    type: "(children)",
    desc: "Wrapper for <AnglePad /> + <AngleInput />. Sets row layout + width split.",
    default: "—",
  },
  {
    name: "<GradientPicker.AnglePad>",
    type: "—",
    desc: "Circular dial for linear `angle` / conic `startAngle`. Drag the handle to rotate; arrow keys ±1°, Shift ±15°, Home / End.",
    default: "—",
  },
  {
    name: "<GradientPicker.AngleInput>",
    type: "—",
    desc: "Numeric ° field paired with AnglePad. Accepts any number; wraps to 0..360. ↑/↓ nudge by 1, Shift × 10.",
    default: "—",
  },
  {
    name: "<GradientPicker.PositionGroup>",
    type: "(children)",
    desc: "Wrapper for <PositionPad /> + <PositionInput /> (+ <RadiusInput /> / <EllipseRadiiInput /> for radials).",
    default: "—",
  },
  {
    name: "<GradientPicker.PositionPad>",
    type: "—",
    desc: "2D pad for radial / conic `center` (0..1 fractions). Click or drag to position.",
    default: "—",
  },
  {
    name: "<GradientPicker.PositionInput>",
    type: "—",
    desc: "Numeric x% / y% fields paired with PositionPad. ↑/↓ nudge by 1, Shift × 10.",
    default: "—",
  },
  {
    name: "<GradientPicker.ShapeSwitcher>",
    type: "—",
    desc: "Radial-only — toggles between `circle` (absolute px radius) and `ellipse` (x/y percentage radii). Each shape's last numeric override is stashed so toggling back restores it.",
    default: "—",
  },
  {
    name: "<GradientPicker.RadialSizeSelect>",
    type: "—",
    desc: "Radial-only — picks the size keyword (closest-side, closest-corner, farthest-side, farthest-corner). Mutually exclusive with RadiusInput / EllipseRadiiInput overrides.",
    default: "—",
  },
  {
    name: "<GradientPicker.RadiusInput>",
    type: "—",
    desc: "Circle-only numeric radius input. Reports px when no Area is mounted; switches to % once Area observes its container width. Empty / placeholder reverts to the active size keyword.",
    default: "—",
  },
  {
    name: "<GradientPicker.EllipseRadiiInput>",
    type: "—",
    desc: "Ellipse-only x/y radii (% of container box). Empty reverts to the active size keyword.",
    default: "—",
  },
  {
    name: "<GradientPicker.InterpSwitcher>",
    type: "—",
    desc: "Native <select> bound to `gradient.interp` (oklch / oklab / srgb / hsl / hsl-longer). Emits the matching CSS Color 4 `in <space>` clause.",
    default: 'interp: "oklch"',
  },
  {
    name: "<GradientPicker.Presets>",
    type: "presets, onAdd",
    desc: "Strip of preview tiles. Click to replace the active gradient. `onAdd(gradient, css)` (optional) wires up a trailing + tile that captures the current gradient — pair with consumer state for save-to-saved-list flows.",
    default: "—",
  },
  {
    name: "<GradientPicker.CssInput>",
    type: "—",
    desc: "Single text field — paste any CSS gradient string to replace the active gradient. Reverts to the last good value on parse failure.",
    default: "—",
  },
];

const mdCell = (s: string) => s.replace(/\|/g, "\\|");
const mdCode = (s: string) => `\`${mdCell(s)}\``;

/** Render prop rows as a GitHub-flavored markdown table. */
export function propsTableMarkdown(rows: PropRow[], first = "Prop", second = "Type"): string {
  const lines = [
    `| ${first} | ${second} | Default | Description |`,
    "|------|------|---------|-------------|",
  ];
  for (const r of rows) {
    const def = r.default === undefined ? "—" : /\s/.test(r.default) ? r.default : mdCode(r.default);
    lines.push(`| ${mdCode(r.name)} | ${mdCode(r.type)} | ${def} | ${mdCell(r.desc)} |`);
  }
  return lines.join("\n");
}

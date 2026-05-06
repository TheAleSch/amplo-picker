"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CodeBlock } from "@/components/code-block";
import { PreviewTabs } from "@/components/preview-tabs";
import { InstallTabs } from "@/components/install-tabs";

const TOC = [
  ["installation", "Installation"],
  ["usage", "Usage"],
  ["examples", "Examples"],
  ["anatomy", "Anatomy"],
  ["api-root", "API: <ColorPicker.Root>"],
  ["api-parts", "API: Parts"],
  ["api-hook", "API: useColorPicker hook"],
  ["api-utils", "API: Color utilities"],
  ["color-spaces", "Color spaces"],
  ["accessibility", "Accessibility"],
  ["publishing", "Publishing your own registry"],
] as const;

export default function DocsPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1fr_220px]">
      <article className="flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-tight">
              Color Picker
            </h1>
            <Link
              href="/playground"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Playground →
            </Link>
          </div>
          <p className="text-muted-foreground">
            OKLCH-native, Display-P3-aware color picker. Composable,
            accessible, gamut-aware. Drop into any Next.js + Tailwind v4 app
            with one CLI command.
          </p>
        </header>

        <PreviewTabs preview={<HeroExample />} code={HERO_CODE} />

        <section className="flex flex-col gap-4">
          <H2 id="installation">Installation</H2>
          <InstallTabs
            url="https://amplo.ale.design/r/color-picker.json"
            title="CLI"
            description="One command. The shadcn CLI drops the picker into components/ui/color-picker/ and installs culori + lucide-react."
          />
          <p className="text-sm text-muted-foreground">
            Replace the URL with your deployed origin if you forked the
            registry. See <a href="#publishing" className="underline">Publishing</a> below.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="usage">Usage</H2>
          <p>
            OKLCH is the lossless source of truth. Pass an{" "}
            <Code>OklchColor</Code> object as <Code>value</Code> for full
            fidelity, or any CSS Color 4 string for input convenience. Every
            change emits the canonical color plus a pre-serialized{" "}
            <Code>formats</Code> record, so a fallback (e.g. hex) is always one
            property access away.
          </p>
          <CodeBlock code={USAGE_CODE} />
        </section>

        <section className="flex flex-col gap-6">
          <H2 id="examples">Examples</H2>

          <Example
            title="HSV-style area"
            description='areaMode="hsv-sv" anchors the top-left corner to white and top-right to fully saturated, like Photoshop or Framer.'
            preview={<HsvExample />}
            code={HSV_CODE}
          />

          <Example
            title="Chroma × hue area"
            description="When the area is oklch-hc, swap the Hue slider for a Lightness slider and prune the parts you don't need."
            preview={<CompoundExample />}
            code={COMPOUND_CODE}
          />

          <Example
            title="Inside a Popover trigger"
            description="Wrap the picker in a button-driven popover when screen real estate matters. Radix collision detection picks the best side automatically."
            preview={<PopoverExample />}
            code={POPOVER_CODE}
          />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="anatomy">Anatomy</H2>
          <p>
            Following shadcn convention, there is no kitchen-sink default
            component — compose <Code>{"<ColorPicker.Root>"}</Code> with the
            parts you need. The tree below is a complete reference of what the
            registry ships.
          </p>
          <CodeBlock code={ANATOMY_CODE} />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="api-root">API: {"<ColorPicker.Root>"}</H2>
          <PropsTable rows={ROOT_PROPS} />
          <p className="text-sm text-muted-foreground">
            <Code>ColorFormat</Code> ={" "}
            <Code>
              {'"hex" | "rgb" | "hsl" | "hsb" | "oklch" | "oklab" | "p3"'}
            </Code>
            .
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="api-parts">API: Parts</H2>
          <PropsTable rows={PART_ROWS} />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="api-hook">API: useColorPicker hook</H2>
          <p>
            Headless layer powering every part. Use it directly when you want a
            totally custom UI but the same state machine.
          </p>
          <CodeBlock code={HOOK_CODE} />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="api-utils">API: Color utilities</H2>
          <p>Exported from the same module:</p>
          <CodeBlock code={UTILS_CODE} />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="color-spaces">Color spaces</H2>
          <H3>sRGB</H3>
          <p>
            The baseline web gamut. Every device made in the last 30 years can
            render it. <Code>#hex</Code>, <Code>rgb()</Code>, <Code>hsl()</Code>{" "}
            all live here.
          </p>
          <H3>Display-P3</H3>
          <p>
            Apple&apos;s wide-gamut space. Every recent iPhone, iPad, and
            MacBook supports it; many newer Android phones too. About 25% wider
            than sRGB, especially in reds and greens. Authored as{" "}
            <Code>color(display-p3 r g b)</Code>.
          </p>
          <H3>OKLCH</H3>
          <p>
            Perceptually uniform polar space. The same chroma value looks
            equally vivid across all hues; the same lightness looks equally
            bright. This is why all picker state is stored here — sliders feel
            intuitive and conversions don&apos;t drift. CSS Color 4:{" "}
            <Code>oklch(L C H)</Code>.
          </p>
          <H3>OKLab</H3>
          <p>
            Same color space as OKLCH but in cartesian (a/b) form. Good for
            color-difference math, less good for UIs.
          </p>
          <p className="text-sm text-muted-foreground">
            When you author a P3 or wider color and the user&apos;s display
            can&apos;t render it, the browser falls back. The{" "}
            <Code>{"<GamutBadge>"}</Code> and the warning lines on{" "}
            <Code>{"<Area>"}</Code> keep you informed. The Area always fills
            with in-gamut color for the active render gamut; warning lines mark
            the cutoffs of narrower gamuts <em>inside</em> the fill. Pick{" "}
            <Code>hex</Code>/<Code>rgb</Code>/<Code>hsl</Code>/<Code>hsb</Code>{" "}
            and the area fills with sRGB only — no warning line. Pick{" "}
            <Code>p3</Code> and a single thin line marks the sRGB cutoff inside
            the P3 fill. Pick <Code>oklch</Code>/<Code>oklab</Code> and{" "}
            <em>two</em> thin lines mark the sRGB and P3 cutoffs inside the
            Rec.2020 fill.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="accessibility">Accessibility</H2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong>Keyboard.</strong> Every interactive part is reachable
              via Tab. Sliders follow the WAI-ARIA APG slider pattern (arrow
              keys ±1, Shift ±10, Home/End, PageUp/Down). The 2D Area uses{" "}
              <Code>role=&quot;application&quot;</Code> with{" "}
              <Code>aria-roledescription</Code> and <Code>aria-valuetext</Code>{" "}
              describing the current point.
            </li>
            <li>
              <strong>Pointer + touch.</strong> Pointer capture so drags
              don&apos;t escape; <Code>touch-none</Code> to suppress browser
              scroll while interacting.
            </li>
            <li>
              <strong>Focus.</strong> Visible focus ring on all controls via{" "}
              <Code>focus-visible:ring</Code>.
            </li>
            <li>
              <strong>Color independence.</strong> Gamut and contrast
              information is conveyed via text + ARIA, not color alone.
            </li>
            <li>
              <strong>Reduced motion.</strong> No auto-animation; inherits user
              preference for swatch hover scale.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="publishing">Publishing your own registry</H2>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            <li>
              Edit <Code>registry.json</Code> — change <Code>name</Code>,{" "}
              <Code>homepage</Code>, item names.
            </li>
            <li>
              Run <Code>pnpm registry:build</Code> to emit{" "}
              <Code>public/r/*.json</Code>.
            </li>
            <li>Deploy the Next.js app (Vercel works out of the box).</li>
            <li>
              Users install with{" "}
              <Code>
                {"npx shadcn@latest add https://<your-host>/r/color-picker.json"}
              </Code>
              .
            </li>
          </ol>
          <p className="text-sm text-muted-foreground">
            The registry build is incremental and ships only what&apos;s listed
            in the manifest — keep <Code>registry.json</Code> as the source of
            truth.
          </p>
        </section>

        <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
          Source on{" "}
          <Link href="/" className="underline">
            home
          </Link>
          . MIT licensed.
        </footer>
      </article>

      <aside className="hidden lg:block">
        <nav className="sticky top-16 flex flex-col gap-1 text-sm">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            On this page
          </p>
          {TOC.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="py-0.5 text-muted-foreground hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
    </main>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 border-b border-border pb-2 text-2xl font-semibold tracking-tight"
    >
      <a href={`#${id}`} className="no-underline">
        {children}
      </a>
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-2 text-lg font-semibold">{children}</h3>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

interface PropRow {
  name: string;
  type: string;
  default?: string;
  desc: string;
}

function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Prop</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Default</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs">{r.name}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {r.type}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {r.default ?? "—"}
              </td>
              <td className="px-3 py-2">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Example({
  title,
  description,
  preview,
  code,
}: {
  title: string;
  description: string;
  preview: React.ReactNode;
  code: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <PreviewTabs preview={preview} code={code} />
    </div>
  );
}

/* ─────────────────────────── Live examples ─────────────────────────── */

function HeroExample() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  return (
    <div className="w-full max-w-xs">
      <CanonicalLayout color={color} setColor={setColor} areaMode="oklch-cl" />
    </div>
  );
}

function HsvExample() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  return (
    <div className="w-full max-w-xs">
      <CanonicalLayout color={color} setColor={setColor} areaMode="hsv-sv" />
    </div>
  );
}

/**
 * Demo-only convenience to render the canonical composition shown in
 * HERO_CODE. The source of truth is the code string the user copies — this
 * helper just keeps the live previews readable.
 */
function CanonicalLayout({
  color,
  setColor,
  areaMode,
}: {
  color: OklchColor;
  setColor: (c: OklchColor) => void;
  areaMode: "oklch-cl" | "hsv-sv" | "oklch-hc";
}) {
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={(next) => setColor(next)}
      backgroundColor="#ffffff"
    >
      <ColorPicker.Area mode={areaMode} />
      <div className="flex flex-col gap-1.5">
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
      </div>
      <div className="flex items-center gap-2">
        <ColorPicker.FormatSwitcher className="flex-1" />
        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
      </div>
      <ColorPicker.ChannelInput showFormat={false} />
      <div className="flex items-center justify-between gap-2">
        <ColorPicker.GamutBadge />
        <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
      </div>
      <ColorPicker.Swatches />
    </ColorPicker.Root>
  );
}

function CompoundExample() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  return (
    <div className="w-full max-w-xs">
      <ColorPicker.Root
        value={color}
        onValueChange={(next) => setColor(next)}
        backgroundColor="#ffffff"
      >
        <ColorPicker.Area mode="oklch-hc" />
        <div className="flex flex-col gap-1.5">
          <ColorPicker.Lightness />
          <ColorPicker.Alpha />
        </div>
        <div className="flex items-center gap-2">
          <ColorPicker.FormatSwitcher className="flex-1" />
          <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
        </div>
        <ColorPicker.ChannelInput showFormat={false} />
        <div className="flex items-center justify-between gap-2">
          <ColorPicker.GamutBadge />
          <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
        </div>
      </ColorPicker.Root>
    </div>
  );
}

function PopoverExample() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono hover:bg-muted/40"
        >
          <span
            aria-hidden
            className="size-5 rounded-sm border border-border"
            style={{ background: `oklch(${color.l} ${color.c} ${color.h})` }}
          />
          <span>Pick a color</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <CanonicalLayout color={color} setColor={setColor} areaMode="oklch-cl" />
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────── Code strings ─────────────────────────── */

const HERO_CODE = `"use client";

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
      <div className="flex items-center justify-between gap-2">
        <ColorPicker.GamutBadge />
        <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
      </div>
      <ColorPicker.Swatches />
    </ColorPicker.Root>
  );
}`;

const USAGE_CODE = `import * as React from "react";
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
}`;

const HSV_CODE = `<ColorPicker.Root
  value={color}
  onValueChange={(next) => setColor(next)}
  backgroundColor="#ffffff"
>
  <ColorPicker.Area mode="hsv-sv" />
  <div className="flex flex-col gap-1.5">
    <ColorPicker.Hue />
    <ColorPicker.Alpha />
  </div>
  <div className="flex items-center gap-2">
    <ColorPicker.FormatSwitcher className="flex-1" />
    <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
  </div>
  <ColorPicker.ChannelInput showFormat={false} />
  <div className="flex items-center justify-between gap-2">
    <ColorPicker.GamutBadge />
    <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
  </div>
  <ColorPicker.Swatches />
</ColorPicker.Root>`;

const COMPOUND_CODE = `<ColorPicker.Root
  value={color}
  onValueChange={(next) => setColor(next)}
  backgroundColor="#ffffff"
>
  <ColorPicker.Area mode="oklch-hc" />
  <div className="flex flex-col gap-1.5">
    <ColorPicker.Lightness />
    <ColorPicker.Alpha />
  </div>
  <div className="flex items-center gap-2">
    <ColorPicker.FormatSwitcher className="flex-1" />
    <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
  </div>
  <ColorPicker.ChannelInput showFormat={false} />
  <div className="flex items-center justify-between gap-2">
    <ColorPicker.GamutBadge />
    <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
  </div>
</ColorPicker.Root>`;

const POPOVER_CODE = `import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

<Popover>
  <PopoverTrigger asChild>
    <button>Pick a color</button>
  </PopoverTrigger>
  <PopoverContent
    align="start"
    sideOffset={8}
    collisionPadding={8}
    className="w-auto p-0 border-0 bg-transparent shadow-none"
  >
    <ColorPicker.Root
      value={color}
      onValueChange={(next) => setColor(next)}
      backgroundColor="#ffffff"
    >
      <ColorPicker.Area />
      <div className="flex flex-col gap-1.5">
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
      </div>
      <div className="flex items-center gap-2">
        <ColorPicker.FormatSwitcher className="flex-1" />
        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
      </div>
      <ColorPicker.ChannelInput showFormat={false} />
    </ColorPicker.Root>
  </PopoverContent>
</Popover>`;

const ANATOMY_CODE = `<ColorPicker.Root>
  <ColorPicker.Area />
  <ColorPicker.Preview />
  <ColorPicker.Hue />
  <ColorPicker.Lightness />     {/* used with areaMode="oklch-hc" */}
  <ColorPicker.Alpha />
  <ColorPicker.EyeDropper />
  <ColorPicker.GamutBadge />
  <ColorPicker.ChannelInput />  {/* format dropdown + per-channel fields */}
  <ColorPicker.FormatSwitcher /> {/* alt: standalone format select */}
  <ColorPicker.Input />          {/* alt: single CSS-string text field */}
  <ColorPicker.ContrastReadout />
  <ColorPicker.Swatches />
</ColorPicker.Root>`;

const HOOK_CODE = `const {
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

const UTILS_CODE = `import {
  parseColor,    // (string) => OklchColor | null
  formatColor,   // (OklchColor, ColorFormat) => string  (sRGB/P3 outputs are gamut-mapped)
  formatAll,     // (OklchColor) => Record<ColorFormat, string>
  gamutInfo,     // (OklchColor) => { inSrgb, inP3, inRec2020 }
  toGamut,       // (OklchColor, "srgb"|"p3"|"rec2020") => OklchColor
  contrast,      // (fg, bg) => { wcag, wcagLevel, apca }
  apcaContrast,  // (fg, bg) => Lc number
  isValidColor,  // (string) => boolean
} from "@/components/ui/color-picker/color-picker";`;

/* ─────────────────────────── API tables ─────────────────────────── */

const ROOT_PROPS: PropRow[] = [
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
];

const PART_ROWS: PropRow[] = [
  {
    name: "<ColorPicker.Area>",
    type: "mode, chromaMax, gamut, showWarningLines, resolution",
    desc: 'mode picks the axes: oklch-cl (Y = OKLCH lightness, top row is white), hsv-sv (Y = HSV-style "value", top-left = white, top-right = saturated), oklch-hc (X = hue, Y = chroma — pair with ColorPicker.Lightness). gamut controls the render gamut and warning lines: "srgb", "p3", "rec2020", "none". Defaults to the gamut implied by the active output format. showWarningLines (default true) toggles the cutoff lines without changing the render gamut. Keyboard: arrows ±1%, Shift+arrows ±10%, Home/End, PageUp/Down.',
    default: "—",
  },
  {
    name: "<ColorPicker.Hue>",
    type: "orientation",
    desc: 'Hue slider. orientation = "horizontal" | "vertical". Pair with Area mode "oklch-cl" or "hsv-sv". Mode-aware: when format is "hsl" or "hsb" the slider tracks that format\'s hue scale (so the bead matches the channel input H exactly); for OKLCH/OKLab it tracks canonical OKLCH hue with chroma rescaling on commit. Hex/RGB/P3 fall back to OKLCH hue.',
    default: "—",
  },
  {
    name: "<ColorPicker.Lightness>",
    type: "orientation",
    desc: 'Lightness slider (OKLCH `l` 0→1). Gradient is sampled at the current hue+chroma. Pair with Area mode "oklch-hc".',
    default: "—",
  },
  {
    name: "<ColorPicker.Alpha>",
    type: "—",
    desc: "Opacity slider with checkerboard background.",
    default: "—",
  },
  {
    name: "<ColorPicker.Preview>",
    type: "—",
    desc: "40px swatch composited over backgroundColor.",
    default: "—",
  },
  {
    name: "<ColorPicker.Input>",
    type: "—",
    desc: "Text input. Parses any CSS Color 4 string on Enter/blur, marks invalid via aria-invalid. Escape reverts.",
    default: "—",
  },
  {
    name: "<ColorPicker.FormatSwitcher>",
    type: "formats",
    desc: "Native <select> of formats. Reads the available list from <ColorPicker.Root formats={...}>; pass an explicit `formats` prop to override locally.",
    default: "—",
  },
  {
    name: "<ColorPicker.ChannelInput>",
    type: "formats, showFormat",
    desc: 'Photoshop-style multi-field input. Renders the format selector + one numeric field per channel (R/G/B/A%, H/S/L/A%, etc.) plus an alpha % field. For "hex" falls back to a single text field. Pass showFormat={false} when pairing with a standalone <FormatSwitcher /> elsewhere in the layout (skips the inline selector). Each numeric field supports ↑/↓ to step (Shift = big step) and accepts a pasted CSS color string from any field.',
    default: "showFormat=true",
  },
  {
    name: "<ColorPicker.Swatches>",
    type: "presets",
    desc: "Grid of preset chips. presets accepts any CSS color strings.",
    default: "—",
  },
  {
    name: "<ColorPicker.GamutBadge>",
    type: "—",
    desc: "Live status: sRGB / P3 / Rec.2020 / Out of gamut. Hovering shows a tooltip with the active color space.",
    default: "—",
  },
  {
    name: "<ColorPicker.ContrastReadout>",
    type: "metrics, defaultMetric, showLabel, showValue, showBadges",
    desc: 'Surfaces one contrast metric at a time. metrics is ("wcag" | "apca")[] (default ["wcag"]); when metrics.length > 1 the readout becomes a button — click to cycle. Toggle showLabel / showValue / showBadges (all default true) to hide the metric name, the numeric value, or the AA/AAA / body/headline / fail pills — set everything but showBadges to false for a minimal pass/fail-only badge.',
    default: "—",
  },
  {
    name: "<ColorPicker.EyeDropper>",
    type: "—",
    desc: "Native EyeDropper API. Renders nothing on unsupported browsers.",
    default: "—",
  },
];

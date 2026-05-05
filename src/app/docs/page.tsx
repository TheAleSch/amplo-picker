import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs · Amplo Color Picker",
  description:
    "Installation, API reference, and color-space primer for the Amplo Color Picker shadcn component.",
};

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-2xl font-semibold tracking-tight border-b border-border pb-2"
    >
      <a href={`#${id}`} className="no-underline">
        {children}
      </a>
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold mt-6">{children}</h3>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  );
}

function PropsTable({
  rows,
}: {
  rows: { name: string; type: string; default?: string; desc: string }[];
}) {
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

const TOC = [
  ["installation", "Installation"],
  ["quick-start", "Quick start"],
  ["composing", "Composing from parts"],
  ["api-default", "API: <ColorPicker />"],
  ["api-root", "API: <ColorPicker.Root>"],
  ["api-parts", "API: Parts"],
  ["api-hook", "API: useColorPicker hook"],
  ["api-utils", "API: Color utilities"],
  ["color-spaces", "Color spaces primer"],
  ["accessibility", "Accessibility"],
  ["publishing", "Publishing your own registry"],
] as const;

export default function DocsPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-[1fr_220px]">
      <article className="prose-neutral flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight">Documentation</h1>
          <p className="max-w-2xl text-muted-foreground">
            OKLCH-native, Display-P3-aware color picker for shadcn. Composable,
            accessible, gamut-aware.
          </p>
        </header>

        <H2 id="installation">Installation</H2>
        <p>
          Install the component into any Next.js + Tailwind v4 app via the
          shadcn CLI:
        </p>
        <Pre>
          npx shadcn@latest add https://amplo.ale.design/r/color-picker.json
        </Pre>
        <p className="text-sm text-muted-foreground">
          Replace the URL with your deployed origin if you forked. The CLI
          drops files under <Code>components/ui/color-picker/</Code> and pulls
          in <Code>culori</Code> + <Code>lucide-react</Code> as runtime deps.
        </p>

        <H2 id="quick-start">Quick start</H2>
        <p>
          OKLCH is the lossless source of truth — pass an{" "}
          <Code>OklchColor</Code> object as <Code>value</Code> for full fidelity,
          or pass any CSS string when you only need hex/rgb input convenience.
          Every change emits the canonical color plus a{" "}
          <Code>formats</Code> record covering all output formats, so a
          fallback (e.g. hex) is always one property access away.
        </p>
        <Pre>{`import { ColorPicker, parseColor } from "@/components/ui/color-picker/color-picker";

export function Example() {
  // Store the canonical OklchColor; derive any string output from \`formats\`.
  const [color, setColor] = React.useState(() => parseColor("oklch(0.7 0.18 30)")!);
  const [hex, setHex] = React.useState("#cf6f4f");
  return (
    <ColorPicker
      value={color}
      onValueChange={(next, _formatted, formats) => {
        setColor(next);
        setHex(formats.hex); // fallback always available
      }}
      backgroundColor="#ffffff"
      apca
    />
  );
}`}</Pre>

        <H2 id="composing">Composing from parts</H2>
        <p>
          The default <Code>{"<ColorPicker />"}</Code> renders all parts in a
          canonical layout. To rebuild the UI from scratch, use the named
          subcomponents — every part reads from the same context, so you can
          omit, reorder, or duplicate them freely.
        </p>
        <Pre>{`<ColorPicker.Root value={color} onValueChange={(next) => setColor(next)}>
  <ColorPicker.Area mode="oklch-cl" />
  <div className="flex items-center gap-2">
    <ColorPicker.Preview />
    <div className="flex-1 flex flex-col gap-1.5">
      <ColorPicker.Hue />
      <ColorPicker.Alpha />
    </div>
    <ColorPicker.EyeDropper />
  </div>
  <div className="flex justify-end">
    <ColorPicker.GamutBadge />
  </div>
  <div className="flex items-stretch gap-2">
    <ColorPicker.FormatSwitcher />
    <div className="flex-1"><ColorPicker.Input /></div>
  </div>
  <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
  <ColorPicker.Swatches presets={["#fff", "#000", "oklch(0.7 0.18 30)"]} />
</ColorPicker.Root>`}</Pre>

        <H2 id="api-default">API: {"<ColorPicker />"}</H2>
        <p>
          Default styled component. Composes all parts in the canonical
          layout. Inherits all <Code>ColorPicker.Root</Code> props plus:
        </p>
        <PropsTable
          rows={[
            {
              name: "areaMode",
              type: '"oklch-cl" | "hsv-sv" | "oklch-hc"',
              default: '"oklch-cl"',
              desc: "Axes used by the 2D area. See <ColorPicker.Area> for details.",
            },
            {
              name: "apca",
              type: "boolean",
              default: "false",
              desc: "Shorthand: when true, the ContrastReadout exposes both WCAG and APCA and the user can click to toggle between them. For finer control (APCA-only, custom default, etc.) compose the parts directly and use ContrastReadout's `metrics` prop.",
            },
            {
              name: "hideEyeDropper",
              type: "boolean",
              default: "false",
              desc: "Hide the EyeDropper button regardless of browser support.",
            },
          ]}
        />

        <H2 id="api-root">API: {"<ColorPicker.Root>"}</H2>
        <PropsTable
          rows={[
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
              desc: "Fires on every change. `color` is the canonical OklchColor (lossless source of truth). `formatted` is the active format's string. `formats` is a Record<ColorFormat, string> with every supported format pre-serialized — handy when you need both an oklch source and a hex fallback.",
            },
            {
              name: "format",
              type: "ColorFormat",
              desc: "Controlled output format.",
            },
            {
              name: "defaultFormat",
              type: "ColorFormat",
              default: '"hex"',
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
              desc: "Restricts which output formats the picker exposes — both the FormatSwitcher options and the resolved default. If `defaultFormat` isn't in the list, the first allowed format is used instead.",
            },
            {
              name: "backgroundColor",
              type: "string | OklchColor",
              default: "#fff",
              desc: "Background used for contrast metrics and Preview compositing.",
            },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          <Code>ColorFormat</Code> ={" "}
          <Code>{'"hex" | "rgb" | "hsl" | "hsb" | "oklch" | "oklab" | "p3"'}</Code>
          .
        </p>

        <H2 id="api-parts">API: Parts</H2>
        <PropsTable
          rows={[
            {
              name: "<ColorPicker.Area>",
              type: "mode, chromaMax, gamut, resolution",
              desc: "2D canvas. mode picks the axes: oklch-cl (Y = OKLCH lightness, top row is white, max-saturation at mid-Y — perceptually uniform), hsv-sv (Y = HSV-style \"value\", top-left = white, top-right = fully saturated, bottom = black — OKHSV-feeling like Photoshop/Framer), oklch-hc (X = hue, Y = chroma — pair with ColorPicker.Lightness). All three modes always fill the square with in-gamut color. gamut controls the render gamut and warning lines: \"srgb\" no lines, \"p3\" sRGB cutoff, \"rec2020\" sRGB + P3 cutoffs, \"none\" raw OKLCH plane up to chromaMax. Defaults to the gamut implied by the active output format (hex/rgb/hsl/hsb → srgb, p3 → p3, oklch/oklab → rec2020). chromaMax is ignored unless gamut === \"none\". Keyboard: arrows ±1%, Shift+arrows ±10%, Home/End, PageUp/Down.",
            },
            {
              name: "<ColorPicker.Hue>",
              type: "orientation",
              desc: 'Hue slider. orientation = "horizontal" | "vertical". Pair with Area mode "oklch-cl" or "hsv-sv" — those modes hold hue fixed, so this slider drives the missing axis.',
            },
            {
              name: "<ColorPicker.Lightness>",
              type: "orientation",
              desc: 'Lightness slider (OKLCH `l` 0→1). orientation = "horizontal" | "vertical". Gradient is sampled at the current hue+chroma so users see how lightness affects _their_ color, not a generic black→white ramp. Pair with Area mode "oklch-hc" — that mode holds lightness fixed.',
            },
            {
              name: "<ColorPicker.Alpha>",
              type: "—",
              desc: "Opacity slider with checkerboard background.",
            },
            {
              name: "<ColorPicker.Preview>",
              type: "—",
              desc: "40px swatch composited over backgroundColor.",
            },
            {
              name: "<ColorPicker.Input>",
              type: "—",
              desc: "Text input. Parses any CSS Color 4 string on Enter/blur, marks invalid via aria-invalid. Escape reverts.",
            },
            {
              name: "<ColorPicker.FormatSwitcher>",
              type: "formats",
              desc: "Native <select> of formats. By default reads the available list from <ColorPicker.Root formats={...}>; pass an explicit `formats` prop to override locally. Keyboard-navigable via the browser's built-in select control.",
            },
            {
              name: "<ColorPicker.Swatches>",
              type: "presets",
              desc: "Grid of preset chips. presets accepts any CSS color strings.",
            },
            {
              name: "<ColorPicker.GamutBadge>",
              type: "—",
              desc: "Live status: sRGB / Display-P3 / Rec.2020 / Out of gamut.",
            },
            {
              name: "<ColorPicker.ContrastReadout>",
              type: "metrics, defaultMetric",
              desc: 'Surfaces one contrast metric at a time. metrics is ("wcag" | "apca")[] (default ["wcag"]); the first one is shown by default. When metrics.length > 1 the readout becomes a button — click it to cycle to the next metric. defaultMetric overrides the initial selection. WCAG body shows ratio + AA/AAA badges; APCA body shows Lc plus a body/headline/fail badge per APCA bronze thresholds.',
            },
            {
              name: "<ColorPicker.EyeDropper>",
              type: "—",
              desc: "Native EyeDropper API. Renders nothing on unsupported browsers.",
            },
          ]}
        />

        <H2 id="api-hook">API: useColorPicker hook</H2>
        <p>
          Headless layer powering every part. Use it directly when you want a
          totally custom UI but the same state machine.
        </p>
        <Pre>{`const {
  color,           // canonical OklchColor
  format,
  formatted,       // string in 'format'
  formats,         // ColorFormat[] — the list of allowed output formats
  formatStrings,   // Record<ColorFormat, string> — every format pre-serialized; use formatStrings.hex for a fallback alongside formatStrings.oklch
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
});`}</Pre>

        <H2 id="api-utils">API: Color utilities</H2>
        <p>Exported from the same module:</p>
        <Pre>{`import {
  parseColor,    // (string) => OklchColor | null
  formatColor,   // (OklchColor, ColorFormat) => string  (sRGB/P3 outputs are gamut-mapped first)
  formatAll,     // (OklchColor) => Record<ColorFormat, string>  — same as the third arg of onValueChange
  gamutInfo,     // (OklchColor) => { inSrgb, inP3, inRec2020 }
  toGamut,       // (OklchColor, "srgb"|"p3"|"rec2020") => OklchColor
  contrast,      // (fg, bg) => { wcag, wcagLevel, apca }
  apcaContrast,  // (fg, bg) => Lc number
  isValidColor,  // (string) => boolean
} from "@/components/ui/color-picker/color-picker";`}</Pre>

        <H2 id="color-spaces">Color spaces primer</H2>
        <H3>sRGB</H3>
        <p>
          The baseline web gamut. Every device made in the last 30 years can
          render it. <Code>#hex</Code>, <Code>rgb()</Code>, <Code>hsl()</Code>{" "}
          all live here.
        </p>
        <H3>Display-P3</H3>
        <p>
          Apple's wide-gamut space. Every recent iPhone, iPad, and MacBook
          supports it; many newer Android phones too. About 25% wider than
          sRGB, especially in reds and greens. Authored as{" "}
          <Code>color(display-p3 r g b)</Code>.
        </p>
        <H3>OKLCH</H3>
        <p>
          Perceptually uniform polar space. The same chroma value looks
          equally vivid across all hues; the same lightness looks equally
          bright. This is why all picker state is stored here — sliders feel
          intuitive and conversions don't drift. CSS Color 4:{" "}
          <Code>oklch(L C H)</Code>.
        </p>
        <H3>OKLab</H3>
        <p>
          Same color space as OKLCH but in cartesian (a/b) form. Good for
          color-difference math, less good for UIs.
        </p>
        <p className="text-sm text-muted-foreground">
          When you author a P3 or wider color and the user's display can't
          render it, the browser falls back. The <Code>{"<GamutBadge>"}</Code>{" "}
          and the warning lines on <Code>{"<Area>"}</Code> keep you informed.
          The Area always fills with in-gamut color for the active render gamut;
          warning lines mark the cutoffs of narrower gamuts <em>inside</em> the
          fill. Pick <Code>hex</Code>/<Code>rgb</Code>/<Code>hsl</Code>/
          <Code>hsb</Code> and the area fills with sRGB only — no warning line.
          Pick <Code>p3</Code> and a single thin line marks the sRGB cutoff
          inside the P3 fill. Pick <Code>oklch</Code>/<Code>oklab</Code> and{" "}
          <em>two</em> thin lines mark the sRGB and P3 cutoffs inside the
          Rec.2020 fill.
        </p>

        <H2 id="accessibility">Accessibility</H2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Keyboard.</strong> Every interactive part is reachable via
            Tab. Sliders follow the WAI-ARIA APG slider pattern (arrow keys
            ±1, Shift ±10, Home/End, PageUp/Down). The 2D Area uses{" "}
            <Code>role="application"</Code> with{" "}
            <Code>aria-roledescription</Code> and <Code>aria-valuetext</Code>{" "}
            describing the current point.
          </li>
          <li>
            <strong>Pointer + touch.</strong> Pointer capture so drags don't
            escape; <Code>touch-none</Code> to suppress browser scroll while
            interacting.
          </li>
          <li>
            <strong>Focus.</strong> Visible focus ring on all controls via{" "}
            <Code>focus-visible:ring</Code>.
          </li>
          <li>
            <strong>Color independence.</strong> Gamut and contrast information
            is conveyed via text + ARIA, not color alone.
          </li>
          <li>
            <strong>Reduced motion.</strong> No auto-animation; inherits user
            preference for swatch hover scale.
          </li>
        </ul>

        <H2 id="publishing">Publishing your own registry</H2>
        <ol className="list-decimal pl-5 space-y-1.5">
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
            <Code>{"npx shadcn@latest add https://<your-host>/r/color-picker.json"}</Code>
            .
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          The registry build is incremental and ships only what's listed in
          the manifest — keep <Code>registry.json</Code> as the source of
          truth.
        </p>

        <footer className="border-t border-border pt-8 mt-8 text-sm text-muted-foreground">
          Source on{" "}
          <Link href="/" className="underline">
            home
          </Link>
          . MIT licensed.
        </footer>
      </article>

      <aside className="hidden lg:block">
        <nav className="sticky top-16 flex flex-col gap-1 text-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            On this page
          </p>
          {TOC.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-muted-foreground hover:text-foreground py-0.5"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
    </main>
  );
}

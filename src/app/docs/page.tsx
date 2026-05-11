"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import {
  GradientPicker,
  FillPicker,
  DEFAULT_LINEAR,
  formatGradient,
} from "@/registry/new-york/color-picker/fill-picker";
import type {
  Gradient,
  Fill,
} from "@/registry/new-york/color-picker/fill-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CodeBlock } from "@/components/code-block";
import { PreviewTabs } from "@/components/preview-tabs";
import { InstallTabs } from "@/components/install-tabs";
import { CopyForAi } from "@/components/copy-for-ai";

const TOC = [
  ["installation", "Installation"],
  ["usage", "Usage"],
  ["examples", "Examples"],
  ["gradient-picker", "Gradient picker"],
  ["gradient-area", "Visual Area pad"],
  ["gradient-overlay", "Overlay (on your canvas)"],
  ["gradient-radial-size", "Radial size + extent keywords"],
  ["gradient-interp", "Interpolation"],
  ["fill-picker", "Fill picker (tabs)"],
  ["anatomy", "Anatomy"],
  ["api-root", "API: <ColorPicker.Root>"],
  ["api-parts", "API: Parts"],
  ["api-hook", "API: useColorPicker hook"],
  ["api-utils", "API: Color utilities"],
  ["color-spaces", "Color spaces"],
  ["accessibility", "Accessibility"],
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
          <CopyForAi className="mt-2" />
        </header>

        <PreviewTabs preview={<HeroExample />} code={HERO_CODE} />

        <section className="flex flex-col gap-4">
          <H2 id="installation">Installation</H2>
          <InstallTabs
            url="https://amplo.ale.design/r/fill-picker.json"
            title="CLI"
            description="One command. The shadcn CLI drops the picker into components/ui/fill-picker/ and installs culori + lucide-react."
          />
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
            title="Soft-proof out-of-display colors"
            description={SOFT_PROOF_DESCRIPTION}
            preview={<SoftProofExample />}
            code={SOFT_PROOF_CODE}
          />

          <Example
            title="Inside a Popover trigger"
            description="Wrap the picker in a button-driven popover when screen real estate matters. Radix collision detection picks the best side automatically."
            preview={<PopoverExample />}
            code={POPOVER_CODE}
          />

          <Example
            title="User-saved swatches"
            description="Lift the presets array and pass onAdd — the consumer owns persistence. Below is a localStorage demo; swap setItem for fetch() to save server-side."
            preview={<SavedSwatchesExample />}
            code={SAVED_SWATCHES_CODE}
          />
        </section>

        <section className="flex flex-col gap-6">
          <H2 id="gradient-picker">Gradient picker</H2>
          <p>
            <Code>{"<GradientPicker.Root>"}</Code> manages a{" "}
            <Code>Gradient</Code> value (linear, radial, or conic) and exposes
            the same composable part pattern as the color picker. Combine it
            with <Code>{"<ColorPicker.*>"}</Code> parts inside{" "}
            <Code>{"<GradientPicker.StopColor>"}</Code> to build any depth of
            stop-color editor you need.
          </p>

          <Example
            title="Compact"
            description="A gradient bar with a type switcher and a lightweight Hue + ChannelInput stop editor — the minimum viable gradient picker."
            preview={<GradientCompactDemo />}
            code={GRADIENT_COMPACT_CODE}
          />

          <Example
            title="Full"
            description="All gradient parts composed together: type switcher, bar, the visual Area pad, angle dial, center pad, radial shape, stop list, full color editor, interpolation switcher, and presets."
            preview={<GradientFullDemo />}
            code={GRADIENT_FULL_CODE}
          />

          <Example
            title="Bar-only"
            description="Just the gradient bar — useful as an inline preview strip or when you want to drive a fully custom stop-editing UI yourself."
            preview={<GradientBarOnlyDemo />}
            code={GRADIENT_BAR_ONLY_CODE}
          />

          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Keyboard.</strong>{" "}
            <Code>Bar</Code> stops respond to ← / → (±1%, ±5% with Shift) and
            Delete / Backspace to remove. <Code>AngleDial</Code> responds to
            arrow keys (±1°, ±15° with Shift) and Home / End. Every{" "}
            <Code>Area</Code> handle is focusable and editable from the
            keyboard too — see the section below. <Code>StopList</Code> is a
            listbox — Enter or Space select the focused row, Delete /
            Backspace removes it. Every interactive part exposes a{" "}
            <Code>data-slot</Code> attribute (
            <Code>gradient-bar</Code>, <Code>gradient-area</Code>,{" "}
            <Code>gradient-angle-dial</Code>, <Code>gradient-center-pad</Code>,
            {" "}<Code>gradient-stop-list</Code>, etc.) for
            unstyled-targetable composition.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="gradient-area">Visual Area pad</H2>
          <p>
            <Code>{"<GradientPicker.Area>"}</Code> is a 2D pad that paints the
            live gradient and overlays draggable handles on top — a visual
            complement to <Code>{"<GradientPicker.AngleDial>"}</Code> and{" "}
            <Code>{"<GradientPicker.CenterPad>"}</Code>. The handles are{" "}
            <em>type-adaptive</em>:
          </p>
          <ul className="ml-5 list-disc text-sm text-muted-foreground [&_strong]:text-foreground">
            <li>
              <strong>Linear.</strong> Two endpoint handles connected by a
              dashed line. By default the line passes through the box center
              and dragging rotates <Code>gradient.angle</Code>. The first
              free drag promotes the gradient to <em>positioned</em> mode by
              setting <Code>gradient.start</Code> and{" "}
              <Code>gradient.end</Code> — endpoints can then sit anywhere
              inside the box, and the line follows them. CSS{" "}
              <Code>linear-gradient</Code> cannot represent an offset line
              natively, so on emit the angle is derived from{" "}
              <Code>end − start</Code> and stop positions are re-mapped into
              the projected segment, giving the visual offset for free in
              pure CSS. <Code>parseGradient</Code> cannot recover{" "}
              <Code>start</Code>/<Code>end</Code> from the emitted form —
              they are dropped on round-trip through a CSS string.
              <Code>setAngle</Code> (e.g. via{" "}
              <Code>{"<GradientPicker.AngleDial>"}</Code>) clears both
              endpoints to return to the angle-only model.
            </li>
            <li>
              <strong>Radial.</strong> Center handle for{" "}
              <Code>gradient.center</Code> plus an edge handle that drives{" "}
              <Code>gradient.radii</Code> — an optional{" "}
              <Code>{"{ x, y }"}</Code> pair (fractions of box width / height)
              that overrides the keyword <Code>shape</Code> +{" "}
              <Code>size</Code> form at emit time. Until the user touches the
              edge handle, the radii stay <Code>undefined</Code> and the
              keyword form is emitted verbatim.
            </li>
            <li>
              <strong>Conic.</strong> Center handle plus a dial handle locked
              on a ring around it; rotating the dial drives{" "}
              <Code>gradient.startAngle</Code>.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Keyboard.</strong> Every
            handle is a focusable <Code>{"<button>"}</Code> with appropriate{" "}
            <Code>role</Code> / <Code>aria-*</Code>. The conic dial — and
            the linear endpoints in their angle-only default mode — nudge
            the angle by ±1° (±15° with Shift), Home / End jump to 0° /
            359°. Once a linear gradient is in positioned mode, the linear
            endpoint arrows nudge the corresponding endpoint by ±1% (±5%
            with Shift) in the box. The center handle nudges{" "}
            <Code>gradient.center</Code> by ±1% per arrow (±5% with Shift),
            Home recenters to (50%, 50%). The radial edge handle nudges{" "}
            <Code>gradient.radii</Code> by ±1% (±5% with Shift); Shift+drag
            on pointer locks the ellipse to a visual circle on screen.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="gradient-overlay">Overlay (handles on your canvas)</H2>
          <p>
            <Code>{"<GradientPicker.Overlay>"}</Code> is{" "}
            <Code>{"<GradientPicker.Area>"}</Code> minus the painted
            background — just the dashed line, endpoint handles, middle
            stop swatches, and (for radial / conic) the center +
            edge/dial handles. Drop it over any element you control on a
            canvas and the user can edit the gradient directly on the
            object it will be applied to. Works identically for linear,
            radial, and conic gradients; same context, same setters,
            same keyboard.
          </p>
          <p className="text-sm text-muted-foreground">
            The host container must establish a positioning context (e.g.{" "}
            <Code>position: relative</Code>) and represent the same
            coordinate space the gradient will be applied to. The
            overlay's root is <Code>pointer-events-none</Code> so empty
            regions pass clicks through to the canvas object beneath;
            the handle buttons themselves are{" "}
            <Code>pointer-events-auto</Code> so they always receive input.
            If the host is transformed (rotated / scaled), handle
            positions will not align — keep transforms off the host.
          </p>

          <Example
            title="Overlay on a custom canvas object"
            description="The same handles as Area, but the painted gradient lives on a consumer-owned div instead of inside the picker. Use this when you want users to edit the gradient directly on the object on their canvas."
            preview={<GradientOverlayDemo />}
            code={GRADIENT_OVERLAY_CODE}
          />

          <Example
            title="Picker beside an external canvas"
            description="Compact picker controls on one side, a larger canvas-style preview on the other — both wired up inside a single <GradientPicker.Root> so editing either side updates the other in real time. This is the pattern to reach for when the picker lives in a side panel and the gradient is applied to an object on the main stage."
            preview={<GradientCanvasDemo />}
            code={GRADIENT_CANVAS_CODE}
          />
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="gradient-radial-size">Radial size and extent keywords</H2>
          <p>
            CSS <Code>radial-gradient</Code> can describe the ellipse in two
            ways: an <em>extent keyword</em> that auto-resizes the ellipse
            relative to the gradient box, or explicit{" "}
            <Code>{"<length-percentage>{1,2}"}</Code> radii. The picker
            preserves both forms via the optional{" "}
            <Code>gradient.radii</Code> field — when set, explicit numeric
            radii are emitted; when unset, the keyword form is emitted from{" "}
            <Code>shape</Code> + <Code>size</Code>.
          </p>
          <PropsTable rows={EXTENT_KEYWORD_ROWS} />
          <p className="text-sm text-muted-foreground">
            All four keywords are typed as{" "}
            <Code>RadialSizeKeyword</Code> (exported from the picker barrel)
            and are round-tripped by <Code>parseGradient</Code>{" "}
            /&nbsp;<Code>formatGradient</Code>. The two extremes —{" "}
            <Code>closest-side</Code> and <Code>farthest-corner</Code> —
            cover most use cases; <Code>closest-corner</Code> and{" "}
            <Code>farthest-side</Code> are there for round-tripping
            handwritten CSS without losing information.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <H2 id="gradient-interp">Interpolation</H2>
          <p>
            <Code>{"<GradientPicker.InterpSwitcher>"}</Code> is a native{" "}
            <Code>{"<select>"}</Code> bound to <Code>gradient.interp</Code>. It
            picks the color space the browser blends through{" "}
            <em>between</em> stops — stop positions and stop colors are
            untouched. Each option emits the matching CSS Color 4{" "}
            <Code>{"in <space>"}</Code> clause when the gradient is serialized:
          </p>
          <PropsTable rows={INTERP_ROWS} />
          <p className="text-sm text-muted-foreground">
            Default is <Code>oklch</Code>. The component reads from and writes
            to <Code>{"<GradientPicker.Root>"}</Code> context (throws if
            rendered outside it). It accepts every standard{" "}
            <Code>SelectHTMLAttributes</Code> prop (<Code>className</Code>,{" "}
            <Code>disabled</Code>, <Code>onBlur</Code>, etc.) and forwards a
            ref to the underlying <Code>{"<select>"}</Code>; <Code>value</Code>,{" "}
            <Code>onChange</Code>, and <Code>aria-label</Code> are managed
            internally and any passed values for those will be overwritten.
          </p>
        </section>

        <section className="flex flex-col gap-6">
          <H2 id="fill-picker">Fill picker (tabs)</H2>
          <p>
            <Code>{"<FillPicker.Root>"}</Code> bundles solid color and gradient
            into a single component with{" "}
            <Code>{"<FillPicker.Tabs>"}</Code> /{" "}
            <Code>{"<FillPicker.Tab>"}</Code> on top and a{" "}
            <Code>{"<FillPicker.Pane mode=...>"}</Code> per side. The value is a{" "}
            <Code>Fill</Code> discriminated union ({" "}
            <Code>{'{ kind: "color", color }'}</Code> or{" "}
            <Code>{'{ kind: "gradient", gradient }'}</Code>); each pane mounts
            its own picker bound to the matching slice, and switching tabs
            preserves both sides.
          </p>

          <Example
            title="Solid + Gradient"
            description="Tabs inside the picker. The Solid pane uses the canonical color tree; the Gradient pane uses the full gradient tree. One state, one component."
            preview={<FillPickerTabsDemo />}
            code={FILL_PICKER_TABS_CODE}
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
      <div className="flex items-stretch gap-2">
        <ColorPicker.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
        <ColorPicker.ContrastReadout
          metrics={["wcag", "apca"]}
          showLabel={false}
          showValue={false}
          className="w-auto flex-1 justify-center"
        />
      </div>
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
        <div className="flex items-stretch gap-2">
          <ColorPicker.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
          <ColorPicker.ContrastReadout
            metrics={["wcag", "apca"]}
            showLabel={false}
            showValue={false}
            className="w-auto flex-1 justify-center"
          />
        </div>
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
      </ColorPicker.Root>
    </div>
  );
}

function SoftProofExample() {
  const [a, setA] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.32 30)")!,
  );
  const [b, setB] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.32 30)")!,
  );
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          softProof off (per-channel clip)
        </span>
        <ColorPicker.Root
          value={a}
          onValueChange={(c) => setA(c)}
          backgroundColor="#ffffff"
          defaultFormat="oklch"
        >
          <ColorPicker.Area gamut="rec2020" />
          <ColorPicker.Hue />
        </ColorPicker.Root>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          softProof on (chroma reduced in OKLCH)
        </span>
        <ColorPicker.Root
          value={b}
          onValueChange={(c) => setB(c)}
          backgroundColor="#ffffff"
          defaultFormat="oklch"
        >
          <ColorPicker.Area gamut="rec2020" softProof />
          <ColorPicker.Hue />
        </ColorPicker.Root>
      </div>
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

function SavedSwatchesExample() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  const [saved, setSaved] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem("amplo-saved-swatches");
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  const presets = React.useMemo(
    () => ["#ffffff", "#000000", "oklch(0.7 0.18 30)", ...saved],
    [saved],
  );

  return (
    <div className="w-full max-w-xs">
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
        <ColorPicker.ChannelInput />
        <ColorPicker.Swatches
          presets={presets}
          onAdd={(_c, hex) => {
            setSaved((prev) => {
              if (prev.includes(hex)) return prev;
              const next = [...prev, hex];
              try {
                window.localStorage.setItem(
                  "amplo-saved-swatches",
                  JSON.stringify(next),
                );
              } catch {}
              return next;
            });
          }}
        />
      </ColorPicker.Root>
    </div>
  );
}

function GradientCompactDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <div className="w-full max-w-xs">
      <GradientPicker.Root value={g} onValueChange={setG}>
        <GradientPicker.Bar />
        <GradientPicker.TypeSwitcher />
        <GradientPicker.StopColor>
          <ColorPicker.Hue />
          <ColorPicker.ChannelInput />
        </GradientPicker.StopColor>
      </GradientPicker.Root>
    </div>
  );
}

function GradientFullDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <div className="w-full max-w-xs">
      <GradientPicker.Root value={g} onValueChange={setG}>
        <div className="flex items-center justify-between">
          <GradientPicker.TypeSwitcher />
          <GradientPicker.ReverseStops />
        </div>
        <GradientPicker.Bar />
        <GradientPicker.Area />
        <GradientPicker.AngleDial />
        <GradientPicker.CenterPad />
        <GradientPicker.RadialShape />
        <GradientPicker.StopList />
        <GradientPicker.StopColor>
          <ColorPicker.Area />
          <ColorPicker.Hue />
          <ColorPicker.Alpha />
          <ColorPicker.ChannelInput />
        </GradientPicker.StopColor>
        <GradientPicker.InterpSwitcher />
        <GradientPicker.Presets />
      </GradientPicker.Root>
    </div>
  );
}

function GradientOverlayDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <GradientPicker.Root value={g} onValueChange={setG}>
        <div className="flex items-center justify-between">
          <GradientPicker.TypeSwitcher />
          <GradientPicker.ReverseStops />
        </div>
        {/* The "canvas object" — could be anything the consumer renders.
           Place the Overlay as a sibling inside the same relative parent
           and the handles align to that element's box. */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-md border border-border bg-muted">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: formatGradient(g) }}
          />
          <GradientPicker.Overlay />
        </div>
        <GradientPicker.Bar />
      </GradientPicker.Root>
    </div>
  );
}

function GradientCanvasDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Picker controls — sit in a side panel. */}
        <div className="flex w-full max-w-[18rem] flex-col gap-2">
          <div className="flex items-center justify-between">
            <GradientPicker.TypeSwitcher />
            <GradientPicker.ReverseStops />
          </div>
          <GradientPicker.Bar />
          <GradientPicker.StopList />
        </div>
        {/* External "canvas object" — paint the gradient on a sibling
           element inside the same Root so the Overlay handles align to
           this box and edits flow back through the shared context. */}
        <div className="relative aspect-square w-full max-w-md flex-1 overflow-hidden rounded-md border border-border bg-muted sm:min-w-48">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: formatGradient(g) }}
          />
          <GradientPicker.Overlay />
        </div>
      </div>
    </GradientPicker.Root>
  );
}

function GradientBarOnlyDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <div className="w-full max-w-xs">
      <GradientPicker.Root value={g} onValueChange={setG}>
        <GradientPicker.Bar />
      </GradientPicker.Root>
    </div>
  );
}

function FillPickerTabsDemo() {
  const [fill, setFill] = React.useState<Fill>(() => ({
    kind: "color",
    color: parseColor("oklch(0.7 0.18 30)")!,
  }));
  return (
    <FillPicker.Root value={fill} onValueChange={setFill} className="w-full max-w-xs">
      <FillPicker.Tabs className="self-stretch">
        <FillPicker.Tab mode="color" className="flex-1">
          Solid
        </FillPicker.Tab>
        <FillPicker.Tab mode="gradient" className="flex-1">
          Gradient
        </FillPicker.Tab>
      </FillPicker.Tabs>

      <FillPicker.Pane mode="color" className="flex flex-col gap-2">
        <ColorPicker.Area />
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
        <ColorPicker.ChannelInput />
      </FillPicker.Pane>

      <FillPicker.Pane mode="gradient" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <GradientPicker.TypeSwitcher />
          <GradientPicker.ReverseStops />
        </div>
        <GradientPicker.Bar />
        <GradientPicker.Area />
        <GradientPicker.AngleDial />
        <GradientPicker.CenterPad />
        <GradientPicker.StopList />
        <GradientPicker.StopColor>
          <ColorPicker.Hue />
          <ColorPicker.ChannelInput />
        </GradientPicker.StopColor>
        <GradientPicker.InterpSwitcher />
      </FillPicker.Pane>
    </FillPicker.Root>
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
  <div className="flex items-stretch gap-2">
    <ColorPicker.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
    <ColorPicker.ContrastReadout
      metrics={["wcag", "apca"]}
      showLabel={false}
      showValue={false}
      className="w-auto flex-1 justify-center"
    />
  </div>
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
  <ColorPicker.Swatches />
</ColorPicker.Root>`;

const COMPOUND_CODE = `<ColorPicker.Root
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
</ColorPicker.Root>`;

const SOFT_PROOF_DESCRIPTION =
  "When the render gamut exceeds your monitor's (e.g. rec2020 on a P3 display), unrenderable colors fall back to per-channel RGB clipping by default — that produces a hue-shifted, posterized strip near the canvas edge that doesn't correspond to any real wide-gamut color. softProof flips the strategy: out-of-display samples are chroma-reduced in OKLCH, preserving hue and lightness while the chroma envelope flattens to your monitor's surface. Same OKLCH value gets committed when you click — the proof only changes how unrenderable regions are *painted*, not how they're authored. Compare the two pickers below; differences are clearest at the right edge in rec2020 mode.";

const SOFT_PROOF_CODE = `<ColorPicker.Root
  value={color}
  onValueChange={setColor}
  defaultFormat="oklch"
>
  <ColorPicker.Area gamut="rec2020" softProof />
  <ColorPicker.Hue />
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

const SAVED_SWATCHES_CODE = `"use client";

import * as React from "react";
import { ColorPicker, parseColor } from "@/components/ui/color-picker/color-picker";

const STARTERS = ["#ffffff", "#000000", "oklch(0.7 0.18 30)"];

export function PickerWithSavedSwatches() {
  const [color, setColor] = React.useState(() => parseColor("oklch(0.7 0.18 30)")!);
  const [saved, setSaved] = React.useState<string[]>([]);

  // Load on mount.
  React.useEffect(() => {
    const raw = window.localStorage.getItem("my-saved-swatches");
    if (raw) setSaved(JSON.parse(raw));
  }, []);

  return (
    <ColorPicker.Root value={color} onValueChange={setColor} backgroundColor="#ffffff">
      <ColorPicker.Area mode="oklch-cl" />
      <ColorPicker.Hue />
      <ColorPicker.ChannelInput />
      <ColorPicker.Swatches
        presets={[...STARTERS, ...saved]}
        onAdd={(_color, hex) => {
          setSaved((prev) => {
            if (prev.includes(hex)) return prev;
            const next = [...prev, hex];
            window.localStorage.setItem("my-saved-swatches", JSON.stringify(next));
            // Or hit your server: fetch("/api/swatches", { method: "POST", body: JSON.stringify({ hex }) })
            return next;
          });
        }}
      />
    </ColorPicker.Root>
  );
}`;

const GRADIENT_COMPACT_CODE = `"use client";

import * as React from "react";
import {
  ColorPicker,
  GradientPicker,
  DEFAULT_LINEAR,
} from "@/components/ui/color-picker/fill-picker";
import type { Gradient } from "@/components/ui/color-picker/fill-picker";

export function GradientCompactDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <GradientPicker.Bar />
      <GradientPicker.TypeSwitcher />
      <GradientPicker.StopColor>
        <ColorPicker.Hue />
        <ColorPicker.ChannelInput />
      </GradientPicker.StopColor>
    </GradientPicker.Root>
  );
}`;

const GRADIENT_FULL_CODE = `"use client";

import * as React from "react";
import {
  ColorPicker,
  GradientPicker,
  DEFAULT_LINEAR,
} from "@/components/ui/color-picker/fill-picker";
import type { Gradient } from "@/components/ui/color-picker/fill-picker";

export function GradientFullDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <div className="flex items-center justify-between">
        <GradientPicker.TypeSwitcher />
        <GradientPicker.ReverseStops />
      </div>
      <GradientPicker.Bar />
      <GradientPicker.Area />
      <GradientPicker.AngleDial />
      <GradientPicker.CenterPad />
      <GradientPicker.RadialShape />
      <GradientPicker.StopList />
      <GradientPicker.StopColor>
        <ColorPicker.Area />
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
        <ColorPicker.ChannelInput />
      </GradientPicker.StopColor>
      <GradientPicker.InterpSwitcher />
      <GradientPicker.Presets />
    </GradientPicker.Root>
  );
}`;

const GRADIENT_CANVAS_CODE = `"use client";

import * as React from "react";
import {
  GradientPicker,
  DEFAULT_LINEAR,
  formatGradient,
} from "@/components/ui/color-picker/fill-picker";
import type { Gradient } from "@/components/ui/color-picker/fill-picker";

export function GradientCanvasDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex w-full max-w-72 flex-col gap-2">
          <div className="flex items-center justify-between">
            <GradientPicker.TypeSwitcher />
            <GradientPicker.ReverseStops />
          </div>
          <GradientPicker.Bar />
          <GradientPicker.StopList />
        </div>
        <div className="relative aspect-square w-full max-w-md flex-1 overflow-hidden rounded-md border">
          <div
            className="absolute inset-0"
            style={{ background: formatGradient(g) }}
          />
          <GradientPicker.Overlay />
        </div>
      </div>
    </GradientPicker.Root>
  );
}`;

const GRADIENT_OVERLAY_CODE = `"use client";

import * as React from "react";
import {
  GradientPicker,
  DEFAULT_LINEAR,
  formatGradient,
} from "@/components/ui/color-picker/fill-picker";
import type { Gradient } from "@/components/ui/color-picker/fill-picker";

export function GradientOverlayDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <div className="flex items-center justify-between">
        <GradientPicker.TypeSwitcher />
        <GradientPicker.ReverseStops />
      </div>
      {/* Your canvas object — the Overlay aligns to its box. */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-md border">
        <div
          className="absolute inset-0"
          style={{ background: formatGradient(g) }}
        />
        <GradientPicker.Overlay />
      </div>
      <GradientPicker.Bar />
    </GradientPicker.Root>
  );
}`;

const GRADIENT_BAR_ONLY_CODE = `"use client";

import * as React from "react";
import {
  GradientPicker,
  DEFAULT_LINEAR,
} from "@/components/ui/color-picker/fill-picker";
import type { Gradient } from "@/components/ui/color-picker/fill-picker";

export function GradientBarOnlyDemo() {
  const [g, setG] = React.useState<Gradient>(DEFAULT_LINEAR);
  return (
    <GradientPicker.Root value={g} onValueChange={setG}>
      <GradientPicker.Bar />
    </GradientPicker.Root>
  );
}`;

const FILL_PICKER_TABS_CODE = `"use client";

import * as React from "react";
import {
  ColorPicker,
  GradientPicker,
  FillPicker,
  parseColor,
} from "@/components/ui/color-picker/fill-picker";
import type { Fill } from "@/components/ui/color-picker/fill-picker";

export function FillPickerTabsDemo() {
  const [fill, setFill] = React.useState<Fill>(() => ({
    kind: "color",
    color: parseColor("oklch(0.7 0.18 30)")!,
  }));
  return (
    <FillPicker.Root value={fill} onValueChange={setFill}>
      <FillPicker.Tabs className="self-stretch">
        <FillPicker.Tab mode="color" className="flex-1">Solid</FillPicker.Tab>
        <FillPicker.Tab mode="gradient" className="flex-1">Gradient</FillPicker.Tab>
      </FillPicker.Tabs>

      <FillPicker.Pane mode="color" className="flex flex-col gap-2">
        <ColorPicker.Area />
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
        <ColorPicker.ChannelInput />
      </FillPicker.Pane>

      <FillPicker.Pane mode="gradient" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <GradientPicker.TypeSwitcher />
          <GradientPicker.ReverseStops />
        </div>
        <GradientPicker.Bar />
        <GradientPicker.Area />
        <GradientPicker.AngleDial />
        <GradientPicker.CenterPad />
        <GradientPicker.StopList />
        <GradientPicker.StopColor>
          <ColorPicker.Hue />
          <ColorPicker.ChannelInput />
        </GradientPicker.StopColor>
        <GradientPicker.InterpSwitcher />
      </FillPicker.Pane>
    </FillPicker.Root>
  );
}`;

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
  <ColorPicker.CssInput />       {/* alt: single CSS-string text field */}
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

const EXTENT_KEYWORD_ROWS: PropRow[] = [
  {
    name: '"closest-side"',
    type: "closest-side",
    desc: "Ellipse / circle ends at the nearest box edge. Smallest, snuggest gradient — the inner colors get the most room.",
    default: "—",
  },
  {
    name: '"closest-corner"',
    type: "closest-corner",
    desc: "Ends at the closest corner of the box. Slightly larger than closest-side. Rarely used directly but kept for round-tripping handwritten CSS.",
    default: "—",
  },
  {
    name: '"farthest-side"',
    type: "farthest-side",
    desc: "Ends at the farthest edge of the box. Bigger than closest-corner but smaller than farthest-corner.",
    default: "—",
  },
  {
    name: '"farthest-corner"',
    type: "farthest-corner",
    desc: "Ends at the farthest corner of the box. Fills the most space — the CSS default.",
    default: "default",
  },
];

const INTERP_ROWS: PropRow[] = [
  {
    name: '"oklch"',
    type: "in oklch",
    desc: "Perceptually uniform polar interpolation. Hue arcs the short way; chroma/lightness blend evenly. No muddy mid-tones; the canonical default and what every example in this site uses.",
    default: "default",
  },
  {
    name: '"oklab"',
    type: "in oklab",
    desc: "Perceptually uniform but cartesian (no hue circle). Slightly less vivid than oklch for far-apart hues but avoids hue overshoot when stops sit on opposite sides of the wheel.",
    default: "—",
  },
  {
    name: '"srgb"',
    type: "in srgb",
    desc: "Per-channel linear interpolation in sRGB. Matches the legacy browser default; produces gray/muddy midpoints for far-apart hues. Use when you need byte-identical output to a pre-CSS-Color-4 design tool.",
    default: "—",
  },
  {
    name: '"hsl"',
    type: "in hsl",
    desc: "HSL interpolation taking the *shorter* path around the hue wheel. Stays vivid through the midpoint (no gray) but can produce surprising hue choices when stops are nearly opposite.",
    default: "—",
  },
  {
    name: '"hsl-longer"',
    type: "in hsl longer hue",
    desc: "HSL interpolation forced to take the *longer* arc. Two close hues sweep through the entire opposite half of the wheel — the rainbow effect.",
    default: "—",
  },
];

const PART_ROWS: PropRow[] = [
  {
    name: "<ColorPicker.Area>",
    type: "mode, chromaMax, gamut, showWarningLines, resolution, softProof",
    desc: 'mode picks the axes: oklch-cl (Y = OKLCH lightness, top row is white), hsv-sv (Y = HSV-style "value", top-left = white, top-right = saturated), oklch-hc (X = hue, Y = chroma — pair with ColorPicker.Lightness). gamut controls the render gamut and warning lines: "srgb", "p3", "rec2020", "none". Defaults to the gamut implied by the active output format. showWarningLines (default true) toggles the cutoff lines without changing the render gamut. softProof (default false) chroma-reduces out-of-display colors in OKLCH instead of letting srgbEncode per-channel-clip them — hue and lightness stay true past the display gamut at the cost of a flatter chroma boundary. Useful when render gamut exceeds the user\'s display (e.g. rec2020 on a P3 monitor) and you\'d rather see a hue-faithful soft proof than a hue-shifted clip. Keyboard: arrows ±1%, Shift+arrows ±10%, Home/End, PageUp/Down.',
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
    name: "<ColorPicker.CssInput>",
    type: "—",
    desc: "Single text input that parses any CSS Color 4 string on Enter/blur. Marks invalid via aria-invalid; Escape reverts.",
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
    type: "presets, onAdd",
    desc: "Grid of preset chips. presets accepts any CSS color strings (including wide-gamut color(display-p3 …) — they paint in their native gamut on capable displays). When onAdd is provided, renders a “+” tile after the presets that calls onAdd(color, hex); the consumer owns persistence (lift presets and update on add — localStorage / a server / a store / etc.).",
    default: "—",
  },
  {
    name: "<ColorPicker.GamutBadge>",
    type: "showLabel",
    desc: 'Live status: sRGB / P3 / Rec.2020 / Out of gamut. Hovering shows a shadcn Tooltip with the active color space. Set showLabel={false} to drop the "Gamut" prefix and render just the space name (good for cramped layouts paired with ContrastReadout in the same row).',
    default: "showLabel=true",
  },
  {
    name: "<ColorPicker.ContrastReadout>",
    type: "metrics, defaultMetric, showLabel, showValue, showBadges",
    desc: 'Surfaces one contrast metric at a time. metrics is ("wcag" | "apca")[] (default ["wcag"]); when metrics.length > 1 the readout becomes a button — click to cycle, with a tooltip on the ⇅ icon that names the next metric. Toggle showLabel / showValue / showBadges (all default true) to hide the metric name, the numeric value, or the AA/AAA / body/headline / fail pills — set everything but showBadges to false for a minimal pass/fail-only badge. Each pass/fail badge has its own hover tooltip explaining the threshold (e.g. "Passes WCAG AA — body text needs ≥ 4.5:1").',
    default: "—",
  },
  {
    name: "<ColorPicker.EyeDropper>",
    type: "—",
    desc: "Native EyeDropper API. Renders nothing on unsupported browsers.",
    default: "—",
  },
];

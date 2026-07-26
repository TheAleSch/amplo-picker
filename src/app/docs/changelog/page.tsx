import Link from "next/link";
import { CopyPrompt } from "@/components/copy-prompt";

interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
  /** Deeper reading for this release. */
  docs?: { href: string; label: string };
  /**
   * Optional agent-ready migration. Present when a release changes behavior
   * consumers may have built against — paste into a coding agent and it makes
   * the change in their codebase.
   */
  migration?: { title: string; summary: string; prompt: string };
}

const STOP_ID_MIGRATION = `# Migration: opt into gradient stop ids (amplo-color-picker 1.2.0)

## Context
\`GradientStop\` gained an optional \`id?: string\`. It is opt-in — if the app
does not use it, nothing needs to change and this migration can be skipped.

Without ids, a **controlled** \`<GradientPicker.Root value={...}>\` reconciles an
incoming gradient against its internal state by stop position and array index.
That cannot distinguish two stops sharing the same position, so reordering them
externally moves the colors between stops while the selected stop and per-stop
color format stay pointing at the old ones.

## When to apply
Apply ONLY if the app both:
1. renders \`<GradientPicker.Root>\` (or \`<FillPicker.Pane mode="gradient">\`) in
   controlled mode — i.e. passes \`value\`, not just \`defaultValue\`; AND
2. can produce a gradient where two stops share the same \`position\`, or
   reorders/rebuilds the \`stops\` array outside the picker (drag-to-reorder,
   collaborative edits, undo/redo, server sync).

If neither holds, make NO changes and report that the app is unaffected.

## Task
1. Find every controlled use of the gradient picker and trace where the
   \`Gradient\` value is created and stored.
2. Give each stop a stable \`id\` at the point stops are first created. Reuse an
   identifier that already exists in the domain model (a database row id, for
   example) rather than inventing a parallel one. Do NOT derive the id from the
   stop's position or array index — that reintroduces the exact ambiguity this
   fixes.
3. Ids must be unique within a single gradient. Duplicates are ignored by the
   picker and fall back to a generated id.
4. It is all-or-nothing per gradient: a half-tagged stop array is treated as
   untagged. Make sure every stop of a gradient gets one.
5. Ids round-trip — \`onValueChange\` echoes them back, including on stops added
   inside the picker — so \`onValueChange={(g) => setGradient(g)}\` is enough to
   persist them. Do not strip \`id\` when storing, and do not regenerate ids on
   every render.
6. If gradients are serialized (localStorage, a database, an API), confirm the
   stored shape tolerates the extra \`id\` field. Add it to any schema or
   validator that rejects unknown keys.

## Verify
- Build and typecheck cleanly.
- With two stops at the same position, select one, change its color, then
  reorder the stops array externally: the selection and the edited color must
  stay on the same stop.
- An app that opts out must see byte-identical behavior, and no \`id\` key in
  anything \`onValueChange\` emits.
`;

const RELEASES: Release[] = [
  {
    version: "1.2.0",
    date: "2026-07-26",
    title: "Sample chips lose their halo; opt-in gradient stop identity",
    changes: [
      "Color swatches, gradient presets and the preview no longer draw an outer border. A solid border around a color sample steals a pixel from the sample and reads as a halo — glaring around a dark chip on a light surface, invisible around a dark chip on a dark surface, i.e. missing exactly where an edge helps. They now use a translucent hairline drawn inside the chip, which recedes on saturated colors and only asserts itself on pale ones, flipping tone per theme.",
      "GradientStop gained an optional id. Supply one per stop and a controlled picker reconciles on identity instead of position and array index — so selection, per-stop color format, and colors follow the right stop through any reorder, including the case position alone cannot describe: two stops sharing a position. Ids round-trip through onValueChange, so storing whatever the picker emits is enough to keep them.",
      "Not a breaking change: omit the id and reconciliation behaves exactly as before, and no id key appears in anything the picker emits.",
      "Fixed: an out-of-order stops array passed via defaultValue, value or setGradient emitted CSS with decreasing stop percentages, which browsers clamp into a flat ramp. Stops are now sorted on entry.",
      "Fixed: clicking \u201cAdd stop\u201d on a gradient with no stops threw an error instead of adding one.",
      "Fixed: the gradient CSS field could overwrite a newer external update with stale text when blurred without being edited.",
      "Fixed: keyboard-deleting a stop on the gradient bar dropped focus to the page body instead of a neighboring stop, and refused silently when only one stop remained. It now moves focus and announces the refusal.",
      "Fixed: the Base UI Hue, Alpha and Lightness sliders dropped a forwarded ref, so consumer refs stayed null.",
    ],
    docs: {
      href: "/docs#gradient-output",
      label: "Gradient state shape, including GradientStop.id",
    },
    migration: {
      title: "Adopt gradient stop ids",
      summary:
        "Only needed if you render the gradient picker in controlled mode AND can have two stops at the same position (or reorder stops outside the picker). Everyone else can skip it — the prompt says so and stops.",
      prompt: STOP_ID_MIGRATION,
    },
  },
  {
    version: "1.1.0",
    date: "2026-07-06",
    title: "Base UI variant — now the default",
    changes: [
      "New Base UI variant of the picker, built on Base UI primitives (Slider, Select, NumberField, RadioGroup). It shares the exact same OKLCH engine and compound API as the original, so behavior and fixes stay in lockstep.",
      "Base UI is now the default variant. The Radix-backed original moved to /docs/radix — switch between them anytime with the toggle at the top of the docs and playground.",
      "Accessibility fix: the Base UI sliders now expose their accessible name on the underlying range input (aria-label moved from the wrapper to the thumb).",
      "Docs and playground gained a Base UI / Radix switcher; install commands and copy-paste code follow the selected variant.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-04",
    title: "Initial release",
    changes: [
      "OKLCH-native, Display-P3-aware color / fill picker distributed as a shadcn registry.",
      "Compose-only parts: Area, Hue, Lightness, Alpha, FormatSwitcher, ChannelInput, Swatches, GamutBadge, ContrastReadout, Preview, EyeDropper, and CssInput.",
      "Lossless format toggles (hex / rgb / hsl / hsb / oklch / oklab / display-p3), WCAG + APCA contrast metrics, gamut detection with soft-proofing, and full keyboard accessibility.",
    ],
  },
];

function formatDate(iso: string) {
  // Parse as local calendar parts to avoid a UTC day-shift.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <Link
            href="/docs"
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
          >
            Docs
          </Link>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground">
          Notable changes to the color picker, newest first.
        </p>
      </header>

      <ol className="mt-12 flex flex-col gap-12">
        {RELEASES.map((r) => (
          <li key={r.version} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                v{r.version}
              </h2>
              <span className="font-mono text-sm text-muted-foreground">
                {formatDate(r.date)}
              </span>
              <span className="text-lg text-muted-foreground">{r.title}</span>
            </div>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              {r.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            {r.docs && (
              <Link
                href={r.docs.href}
                className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {r.docs.label} →
              </Link>
            )}
            {r.migration && (
              <CopyPrompt
                title={r.migration.title}
                summary={r.migration.summary}
                prompt={r.migration.prompt}
              />
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}

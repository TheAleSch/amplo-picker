import Link from "next/link";
import { CopyPrompt } from "@/components/copy-prompt";

/**
 * A group of entries under one heading ("Improvements", "Bug fixes", …).
 * `label` is optional so older, ungrouped releases keep rendering as a plain
 * list rather than being retrofitted into categories they were never written
 * against.
 */
interface ChangeGroup {
  label?: string;
  items: string[];
}

interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: ChangeGroup[];
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
    title: "Cleaner color samples, and gradient stops you can track by id",
    changes: [
      {
        label: "Improvements",
        items: [
          "Color samples no longer have a ring around them. Swatches, gradient presets and the preview each drew a thin grey border, which looked like a halo — obvious around a dark color on a light page, and invisible around a dark color on a dark page, so it showed up in the one place it wasn't wanted. The edge is now drawn faintly inside the sample instead: it fades away on strong colors and only shows on pale ones, so a near-white swatch still has a visible edge.",
          "Gradient stops can now carry an id. If you control the gradient from your own state, the picker used to work out which stop was which by where it sat on the bar. That falls apart when two stops sit in the same spot — reorder them and the colors could end up on the wrong stop. Give each stop an id and the picker follows it exactly, so the selected stop, its color, and its chosen format all stay together.",
          "Stop ids are optional and nothing changes if you skip them. Leave them out and the picker behaves exactly as it did before, and never adds an id to what it hands back.",
          "All the picker's types are now listed in the docs in one place, under API: Types — several were mentioned in the docs without ever being written down.",
        ],
      },
      {
        label: "Bug fixes",
        items: [
          "A gradient whose stops weren't listed in order came out as a single flat color instead of a gradient, with nothing reported. The picker now puts them in order first.",
          "Adding a stop to a gradient that had no stops crashed instead of adding one.",
          "The gradient CSS box could undo a change made elsewhere in your app: click into the box, have something else update the gradient, click away without typing, and the old text was put back. It now leaves the newer value alone.",
          "Deleting a stop with the keyboard on the gradient bar sent focus back to the top of the page, so you couldn't carry on with the keyboard. It now moves to the next stop along. Trying to delete the last remaining stop did nothing at all with no explanation; it now says why.",
          "The Base UI hue, alpha and lightness sliders ignored a ref passed to them, so it was always empty.",
        ],
      },
    ],
    docs: {
      href: "/docs#gradient-output",
      label: "How gradient state is shaped, including stop ids",
    },
    migration: {
      title: "Adopt gradient stop ids",
      summary:
        "Only needed if you drive the gradient picker from your own state AND can end up with two stops in the same spot (or reorder stops outside the picker). If that isn't you, skip it — the prompt checks first and stops.",
      prompt: STOP_ID_MIGRATION,
    },
  },
  {
    version: "1.1.0",
    date: "2026-07-06",
    title: "Base UI variant — now the default",
    changes: [
      { items: [
      "New Base UI variant of the picker, built on Base UI primitives (Slider, Select, NumberField, RadioGroup). It shares the exact same OKLCH engine and compound API as the original, so behavior and fixes stay in lockstep.",
      "Base UI is now the default variant. The Radix-backed original moved to /docs/radix — switch between them anytime with the toggle at the top of the docs and playground.",
      "Accessibility fix: the Base UI sliders now expose their accessible name on the underlying range input (aria-label moved from the wrapper to the thumb).",
      "Docs and playground gained a Base UI / Radix switcher; install commands and copy-paste code follow the selected variant.",
      ] },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-04",
    title: "Initial release",
    changes: [
      { items: [
      "OKLCH-native, Display-P3-aware color / fill picker distributed as a shadcn registry.",
      "Compose-only parts: Area, Hue, Lightness, Alpha, FormatSwitcher, ChannelInput, Swatches, GamutBadge, ContrastReadout, Preview, EyeDropper, and CssInput.",
      "Lossless format toggles (hex / rgb / hsl / hsb / oklch / oklab / display-p3), WCAG + APCA contrast metrics, gamut detection with soft-proofing, and full keyboard accessibility.",
      ] },
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
            {r.changes.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-2">
                {group.label && (
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </h3>
                )}
                <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
                  {group.items.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
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

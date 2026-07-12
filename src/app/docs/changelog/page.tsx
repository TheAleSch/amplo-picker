import Link from "next/link";

interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

const RELEASES: Release[] = [
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
          </li>
        ))}
      </ol>
    </main>
  );
}

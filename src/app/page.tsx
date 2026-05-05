"use client";

import * as React from "react";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";

export default function Home() {
  const [color, setColor] = React.useState("oklch(0.7 0.18 30)");
  const [bg, setBg] = React.useState("#ffffff");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          shadcn registry · v0.1
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">Amplo Picker</h1>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/TheAleSch/amplo-picker"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/60"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              GitHub
            </a>
            <iframe
              src="https://ghbtns.com/github-btn.html?user=TheAleSch&repo=amplo-picker&type=star&count=true"
              title="Star TheAleSch/amplo-picker on GitHub"
              frameBorder="0"
              scrolling="0"
              width="110"
              height="20"
            />
          </div>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware.
          Drop into any Next.js + Tailwind v4 app with one CLI command.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Default styled
          </h2>
          <ColorPicker
            value={color}
            onValueChange={(_, formatted) => setColor(formatted)}
            backgroundColor={bg}
            apca
          />
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
            {color}
          </pre>
        </div>

        <div
          className="hidden self-stretch border-l border-border lg:block"
          aria-hidden
        />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Composed (chroma × hue mode)
          </h2>
          <ColorPicker.Root
            value={color}
            onValueChange={(_, formatted) => setColor(formatted)}
            backgroundColor={bg}
          >
            <ColorPicker.Area mode="oklch-hc" />
            <div className="flex items-center gap-2">
              <ColorPicker.Preview />
              <div className="flex flex-1 flex-col gap-1.5">
                <ColorPicker.Hue />
                <ColorPicker.Alpha />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <ColorPicker.GamutBadge />
              <ColorPicker.EyeDropper />
            </div>
            <ColorPicker.Input />
            <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
          </ColorPicker.Root>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Background for contrast
        </h2>
        <div className="flex flex-wrap gap-2">
          {["#ffffff", "#0a0a0a", "oklch(0.95 0.02 250)", "oklch(0.2 0.03 30)"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBg(b)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-mono"
              style={{
                background: b,
                color: b === "#ffffff" || b.startsWith("oklch(0.95") ? "#000" : "#fff",
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border border-border p-8"
        style={{ background: bg, color }}
      >
        <h2 className="mb-2 text-2xl font-semibold">Live preview</h2>
        <p className="text-base">
          The quick brown fox jumps over the lazy dog. This text is rendered with the
          chosen color over the chosen background — the contrast metric updates live.
        </p>
      </section>

      <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
        Built for shadcn registry distribution. See{" "}
        <a href="/docs" className="underline">
          docs
        </a>{" "}
        for the API.
      </footer>
    </main>
  );
}

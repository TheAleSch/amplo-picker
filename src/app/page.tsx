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
        <h1 className="text-4xl font-semibold tracking-tight">Amplo Color Picker</h1>
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

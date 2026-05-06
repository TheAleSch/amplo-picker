"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor, formatAll } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hero } from "@/components/hero";

export default function Home() {
  // OKLCH is the lossless source of truth; hex is derived for display/fallback.
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  const [bg, setBg] = React.useState("#ffffff");
  const formats = React.useMemo(() => formatAll(color), [color]);

  return (
    <>
      <Hero />
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16">
      <section className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Canonical composition
          </h2>
          <p className="text-sm text-muted-foreground">
            Compose <code className="font-mono">ColorPicker.Root</code> with the
            parts you need. See the <Link href="/docs" className="underline">docs</Link> for the
            full recipe.
          </p>
          <CanonicalPicker
            color={color}
            setColor={setColor}
            bg={bg}
            areaMode="oklch-cl"
          />
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
            {formats.oklch}
            {"\n"}
            {formats.hex}
          </pre>
        </div>

        <div
          className="hidden self-stretch border-l border-border lg:block"
          aria-hidden
        />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Compose your own (chroma × hue)
          </h2>
          <p className="text-sm text-muted-foreground">
            Replace the Hue slider with Lightness when the area is{" "}
            <code className="font-mono">oklch-hc</code>. Drop ChannelInput,
            simplify the row, prune Swatches.
          </p>
          <ColorPicker.Root
            value={color}
            onValueChange={(next) => setColor(next)}
            backgroundColor={bg}
          >
            <ColorPicker.Area mode="oklch-hc" />
            <div className="flex items-center gap-2">
              <ColorPicker.Preview />
              <div className="flex flex-1 flex-col gap-1.5">
                <ColorPicker.Lightness />
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
          Area mode — perceptual vs. OKHSV
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Same color, same render gamut, two layouts. <code className="font-mono">oklch-cl</code> puts
          OKLCH lightness on the Y axis — the top row is white (perceptually correct, max-saturation
          lives at mid-Y). <code className="font-mono">hsv-sv</code> uses HSV-style "value" anchored
          to the gamut cusp — top-left is white, top-right is fully saturated, like Photoshop or Framer.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              <code className="font-mono">{`<ColorPicker.Area mode="oklch-cl" />`}</code>
            </p>
            <CanonicalPicker
              color={color}
              setColor={setColor}
              bg={bg}
              areaMode="oklch-cl"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              <code className="font-mono">{`<ColorPicker.Area mode="hsv-sv" />`}</code>
            </p>
            <CanonicalPicker
              color={color}
              setColor={setColor}
              bg={bg}
              areaMode="hsv-sv"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Trigger pattern
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Wrap the picker in a button-driven popover when screen real estate
          matters. Click outside or press Escape to dismiss.
        </p>
        <ColorTriggerDemo color={color} setColor={setColor} bg={bg} />
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
        style={{ background: bg, color: formats.oklch }}
      >
        <h2 className="mb-2 text-2xl font-semibold">Live preview</h2>
        <p className="text-base">
          The quick brown fox jumps over the lazy dog. This text is rendered with the
          chosen color over the chosen background — the contrast metric updates live.
        </p>
      </section>

      <footer className="border-t border-border pt-8 text-sm text-muted-foreground">
        Built for shadcn registry distribution. Read the{" "}
        <Link href="/docs" className="underline">
          docs
        </Link>{" "}
        or tinker in the{" "}
        <Link href="/playground" className="underline">
          playground
        </Link>
        .
      </footer>
      </main>
    </>
  );
}

function ColorTriggerDemo({
  color,
  setColor,
  bg,
}: {
  color: OklchColor;
  setColor: (c: OklchColor) => void;
  bg: string;
}) {
  const display = formatAll(color);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-mono hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className="size-5 rounded-sm border border-border"
            style={{ background: display.oklch }}
          />
          <span>{display.hex}</span>
          <svg
            aria-hidden
            viewBox="0 0 12 12"
            className="size-3 text-muted-foreground"
          >
            <path
              d="M3 4.5l3 3 3-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </PopoverTrigger>
      {/* Radix picks the best side automatically when the chosen one would
          overflow (collisionPadding default 0). align="start" anchors to the
          trigger's leading edge; w-auto lets the picker drive the width. */}
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className="w-auto p-0 border-0 bg-transparent shadow-none"
      >
        <CanonicalPicker
          color={color}
          setColor={setColor}
          bg={bg}
          areaMode="oklch-cl"
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Demo-site convenience wrapper around the canonical composition. Not part
 * of the registry — the source of truth for the layout lives on the docs
 * page as a copy-paste recipe so consumers own it directly.
 */
function CanonicalPicker({
  color,
  setColor,
  bg,
  areaMode,
}: {
  color: OklchColor;
  setColor: (c: OklchColor) => void;
  bg: string;
  areaMode: "oklch-cl" | "hsv-sv" | "oklch-hc";
}) {
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={(next) => setColor(next)}
      backgroundColor={bg}
    >
      <ColorPicker.Area mode={areaMode} />
      <div className="flex items-center gap-2">
        <ColorPicker.Preview />
        <div className="flex flex-1 flex-col gap-1.5">
          <ColorPicker.Hue />
          <ColorPicker.Alpha />
        </div>
        <ColorPicker.EyeDropper />
      </div>
      <div className="flex items-center justify-end">
        <ColorPicker.GamutBadge />
      </div>
      <ColorPicker.ChannelInput />
      <ColorPicker.ContrastReadout metrics={["wcag", "apca"]} />
      <ColorPicker.Swatches />
    </ColorPicker.Root>
  );
}

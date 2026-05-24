"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPickerBase } from "@/registry/new-york/fill-picker-base/color-picker";

export default function BaseUIDocsPage() {
  const [value, setValue] = React.useState("oklch(0.7 0.18 250)");

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">
          ← back to docs
        </Link>
        <h1 className="text-3xl font-semibold">Base UI variant</h1>
        <p className="text-muted-foreground">
          Same compound API as the original color picker — Hue, Lightness, Alpha,
          and FormatSwitcher are rebuilt on top of{" "}
          <a
            href="https://base-ui.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Base UI
          </a>{" "}
          primitives (Slider + Select). Everything else reuses the original
          engine and parts.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-popover p-4 shadow-sm">
        <ColorPickerBase.Root
          value={value}
          onValueChange={(_, formatted) => setValue(formatted)}
        >
          <div className="space-y-4">
            <ColorPickerBase.Area className="h-48 w-full" />
            <ColorPickerBase.Hue />
            <ColorPickerBase.Lightness />
            <ColorPickerBase.Alpha />
            <div className="flex items-center gap-3">
              <ColorPickerBase.Preview />
              <div className="flex-1">
                <ColorPickerBase.FormatSwitcher />
              </div>
            </div>
            <ColorPickerBase.ChannelInput />
            <div className="flex items-center justify-between gap-2">
              <ColorPickerBase.GamutBadge />
              <ColorPickerBase.ContrastReadout />
            </div>
            <ColorPickerBase.Swatches />
          </div>
        </ColorPickerBase.Root>
      </section>

      <section className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Current value</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 text-xs">
          {value}
        </pre>
      </section>
    </main>
  );
}

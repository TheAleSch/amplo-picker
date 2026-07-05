"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPickerBase } from "@/registry/new-york/fill-picker-base/color-picker";
import { InstallTabs } from "@/components/install-tabs";

export default function BaseUIDocsPage() {
  const [value, setValue] = React.useState("oklch(0.7 0.18 250)");
  const [presets, setPresets] = React.useState<string[]>([
    "oklch(0.95 0 0)",
    "oklch(0.75 0 0)",
    "oklch(0.5 0 0)",
    "oklch(0.25 0 0)",
    "oklch(0.05 0 0)",
    "oklch(0.7 0.18 30)",
    "oklch(0.7 0.18 90)",
    "oklch(0.7 0.18 150)",
    "oklch(0.7 0.18 210)",
    "oklch(0.7 0.18 270)",
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">
          ← back to docs
        </Link>
        <h1 className="text-3xl font-semibold">Base UI variant</h1>
        <p className="text-muted-foreground">
          Same compound API as the original color picker, rebuilt on top of{" "}
          <a
            href="https://base-ui.com"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Base UI
          </a>{" "}
          primitives: Hue/Lightness/Alpha on Slider, FormatSwitcher on Select,
          ChannelInput on NumberField, and Swatches on RadioGroup. Area,
          Preview, GamutBadge, ContrastReadout, EyeDropper, and CssInput are
          unchanged — they reuse the original engine and parts directly.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Installation</h2>
        <InstallTabs
          url="https://amplo.ale.design/r/fill-picker-base.json"
          title="CLI"
          description="Installs @base-ui/react, culori, and lucide-react, and pulls in the shared color-picker engine as a registry dependency."
        />
      </section>

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
              <ColorPickerBase.EyeDropper />
            </div>
            <ColorPickerBase.ChannelInput />
            <div className="flex items-center justify-between gap-2">
              <ColorPickerBase.GamutBadge />
              <ColorPickerBase.ContrastReadout />
            </div>
            <ColorPickerBase.Swatches
              presets={presets}
              onAdd={(_, hex) => setPresets((prev) => [...prev, hex])}
            />
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

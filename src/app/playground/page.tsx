"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type {
  ColorFormat,
  OklchColor,
} from "@/registry/new-york/color-picker/lib/types";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

const ALL_FORMATS: ColorFormat[] = [
  "hex",
  "rgb",
  "hsl",
  "hsb",
  "oklch",
  "oklab",
  "p3",
];

type AreaMode = "oklch-cl" | "hsv-sv" | "oklch-hc";

const AREA_MODES: Array<{ value: AreaMode; label: string; hint: string }> = [
  {
    value: "oklch-cl",
    label: "oklch-cl",
    hint: "OKLCH lightness on Y. Pair with Hue.",
  },
  {
    value: "hsv-sv",
    label: "hsv-sv",
    hint: "HSV-style value, Photoshop-feeling. Pair with Hue.",
  },
  {
    value: "oklch-hc",
    label: "oklch-hc",
    hint: "Hue × chroma. Pair with Lightness.",
  },
];

const BG_PRESETS = [
  "#ffffff",
  "#0a0a0a",
  "oklch(0.95 0.02 250)",
  "oklch(0.2 0.03 30)",
];

type PartKey =
  | "area"
  | "hue"
  | "lightness"
  | "alpha"
  | "preview"
  | "channelInput"
  | "input"
  | "formatSwitcher"
  | "swatches"
  | "gamutBadge"
  | "contrastReadout"
  | "eyeDropper";

type PartsState = Record<PartKey, boolean>;

const ALL_OFF: PartsState = {
  area: false,
  hue: false,
  lightness: false,
  alpha: false,
  preview: false,
  channelInput: false,
  input: false,
  formatSwitcher: false,
  swatches: false,
  gamutBadge: false,
  contrastReadout: false,
  eyeDropper: false,
};

interface VariantOverrides {
  areaMode?: AreaMode;
  defaultFormat?: ColorFormat;
  channelShowFormat?: boolean;
  gamutShowLabel?: boolean;
  contrastShowLabel?: boolean;
  contrastShowValue?: boolean;
  contrastShowBadges?: boolean;
  /** Render the format+eyedropper row AFTER the channel input instead of before. */
  formatRowAfterChannel?: boolean;
  /** Render the eyedropper inline to the LEFT of the slider stack (Figma-style). */
  eyedropperBesideSliders?: boolean;
  /** Override the picker container max width (px). Defaults to DEFAULT_MAX_WIDTH. */
  maxWidth?: number;
  /** Override the Area part height (px). Falls back to the Area default when undefined. */
  areaHeight?: number;
}

const DEFAULT_MAX_WIDTH = 320;

const VARIANTS: Array<{
  name: string;
  hint: string;
  parts: PartsState;
} & VariantOverrides> = [
  {
    name: "Canonical",
    hint: "Mirrors the home hero: gamut + contrast on top, area, sliders, format/eyedropper, channel input, swatches.",
    areaMode: "oklch-cl",
    defaultFormat: "p3",
    channelShowFormat: false,
    gamutShowLabel: false,
    contrastShowLabel: false,
    contrastShowValue: false,
    contrastShowBadges: true,
    parts: {
      ...ALL_OFF,
      area: true,
      hue: true,
      alpha: true,
      formatSwitcher: true,
      eyeDropper: true,
      channelInput: true,
      gamutBadge: true,
      contrastReadout: true,
      swatches: true,
    },
  },
  {
    name: "Compact",
    hint: "Area + sliders + channel input — no swatches, no a11y readout.",
    parts: {
      ...ALL_OFF,
      area: true,
      hue: true,
      alpha: true,
      channelInput: true,
    },
  },
  {
    name: "Minimal",
    hint: "Area + hue. Smallest still-useful picker.",
    parts: { ...ALL_OFF, area: true, hue: true },
  },
  {
    name: "Sliders only",
    hint: "Hue/lightness/alpha + channel input. No 2D area.",
    parts: {
      ...ALL_OFF,
      hue: true,
      lightness: true,
      alpha: true,
      channelInput: true,
    },
  },
  {
    name: "Area only",
    hint: "Just the 2D canvas — pair with your own slider/input UI.",
    parts: { ...ALL_OFF, area: true },
  },
  {
    name: "Framer",
    hint: "Area + hue/alpha + numeric channels, then format dropdown + eyedropper underneath. Mirrors Framer's color popover.",
    areaMode: "hsv-sv",
    areaHeight: 140,
    maxWidth: 260,
    channelShowFormat: false,
    formatRowAfterChannel: true,
    parts: {
      ...ALL_OFF,
      area: true,
      hue: true,
      alpha: true,
      channelInput: true,
      formatSwitcher: true,
      eyeDropper: true,
    },
  },
  {
    name: "Figma",
    hint: "Contrast on top, area, eyedropper beside hue + alpha rail, format inline with channels. Mirrors Figma's color popover.",
    areaMode: "oklch-cl",
    channelShowFormat: true,
    eyedropperBesideSliders: true,
    maxWidth: 240,
    parts: {
      ...ALL_OFF,
      contrastReadout: true,
      area: true,
      hue: true,
      alpha: true,
      eyeDropper: true,
      channelInput: true,
    },
  },
  {
    name: "A11y review",
    hint: "Area + sliders + WCAG/APCA readout. Use when contrast is the main job.",
    parts: {
      ...ALL_OFF,
      area: true,
      hue: true,
      alpha: true,
      gamutBadge: true,
      contrastReadout: true,
    },
  },
];

const PARTS: Array<{ key: PartKey; label: string }> = [
  { key: "area", label: "Area" },
  { key: "hue", label: "Hue" },
  { key: "lightness", label: "Lightness" },
  { key: "alpha", label: "Alpha" },
  { key: "preview", label: "Preview" },
  { key: "channelInput", label: "ChannelInput" },
  { key: "input", label: "Input" },
  { key: "formatSwitcher", label: "FormatSwitcher" },
  { key: "swatches", label: "Swatches" },
  { key: "gamutBadge", label: "GamutBadge" },
  { key: "contrastReadout", label: "ContrastReadout" },
  { key: "eyeDropper", label: "EyeDropper" },
];

export default function PlaygroundPage() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  const [bg, setBg] = React.useState("#ffffff");
  const [areaMode, setAreaMode] = React.useState<AreaMode>("oklch-cl");
  const [formats, setFormats] = React.useState<ColorFormat[]>([...ALL_FORMATS]);
  const [defaultFormat, setDefaultFormat] = React.useState<ColorFormat>("p3");
  const [showWarningLines, setShowWarningLines] = React.useState(true);
  // Initial display knob state mirrors VARIANTS[0] (Canonical = Hero) so the
  // first paint matches the active variant tab.
  const [showChannelFormat, setShowChannelFormat] = React.useState(
    VARIANTS[0].channelShowFormat ?? true,
  );
  const [contrastMetrics, setContrastMetrics] = React.useState<("wcag" | "apca")[]>(
    ["wcag", "apca"],
  );
  const [contrastShowLabel, setContrastShowLabel] = React.useState(
    VARIANTS[0].contrastShowLabel ?? true,
  );
  const [contrastShowValue, setContrastShowValue] = React.useState(
    VARIANTS[0].contrastShowValue ?? true,
  );
  const [contrastShowBadges, setContrastShowBadges] = React.useState(
    VARIANTS[0].contrastShowBadges ?? true,
  );
  const [gamutShowLabel, setGamutShowLabel] = React.useState(
    VARIANTS[0].gamutShowLabel ?? false,
  );
  const [savedSwatches, setSavedSwatches] = React.useState<string[]>([]);
  const [formatRowAfterChannel, setFormatRowAfterChannel] = React.useState(
    VARIANTS[0].formatRowAfterChannel ?? false,
  );
  const [eyedropperBesideSliders, setEyedropperBesideSliders] = React.useState(
    VARIANTS[0].eyedropperBesideSliders ?? false,
  );
  const [parts, setParts] = React.useState<PartsState>(VARIANTS[0].parts);
  const [containerMaxWidth, setContainerMaxWidth] = React.useState<number>(
    VARIANTS[0].maxWidth ?? DEFAULT_MAX_WIDTH,
  );
  const [areaHeight, setAreaHeight] = React.useState<number | undefined>(
    VARIANTS[0].areaHeight,
  );

  const toggleFormat = (f: ColorFormat) => {
    setFormats((prev) => {
      if (prev.includes(f)) {
        // Keep at least one format selected — empty array would break the picker.
        return prev.length > 1 ? prev.filter((x) => x !== f) : prev;
      }
      return [...prev, f].sort(
        (a, b) => ALL_FORMATS.indexOf(a) - ALL_FORMATS.indexOf(b),
      );
    });
  };

  const togglePart = (k: PartKey) =>
    setParts((p) => ({ ...p, [k]: !p[k] }));

  const code = React.useMemo(
    () =>
      buildSnippet({
        areaMode,
        formats,
        defaultFormat,
        showWarningLines,
        showChannelFormat,
        contrastMetrics,
        contrastShowLabel,
        contrastShowValue,
        contrastShowBadges,
        gamutShowLabel,
        formatRowAfterChannel,
        eyedropperBesideSliders,
        bg,
        parts,
      }),
    [
      areaMode,
      formats,
      defaultFormat,
      showWarningLines,
      showChannelFormat,
      contrastMetrics,
      contrastShowLabel,
      contrastShowValue,
      contrastShowBadges,
      gamutShowLabel,
      formatRowAfterChannel,
      eyedropperBesideSliders,
      bg,
      parts,
    ],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← Home
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight">Playground</h1>
          <Link
            href="/docs"
            className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            Docs →
          </Link>
        </div>
        <p className="max-w-2xl text-muted-foreground">
          Compose <code className="font-mono">ColorPicker.Root</code> with the
          parts you want. Toggle, tweak, copy the generated JSX. State lives
          in this page only — refreshing resets the canvas.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {VARIANTS.map((v) => {
              const active = partsEqual(parts, v.parts);
              return (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => {
                    setParts(v.parts);
                    if (v.areaMode) setAreaMode(v.areaMode);
                    if (v.defaultFormat) {
                      setDefaultFormat(v.defaultFormat);
                      if (!formats.includes(v.defaultFormat)) {
                        setFormats((prev) =>
                          [...prev, v.defaultFormat!].sort(
                            (a, b) =>
                              ALL_FORMATS.indexOf(a) - ALL_FORMATS.indexOf(b),
                          ),
                        );
                      }
                    }
                    if (v.channelShowFormat !== undefined)
                      setShowChannelFormat(v.channelShowFormat);
                    else if (v.parts.channelInput && !v.parts.formatSwitcher)
                      setShowChannelFormat(true);
                    else if (v.parts.formatSwitcher) setShowChannelFormat(false);
                    if (v.gamutShowLabel !== undefined)
                      setGamutShowLabel(v.gamutShowLabel);
                    if (v.contrastShowLabel !== undefined)
                      setContrastShowLabel(v.contrastShowLabel);
                    if (v.contrastShowValue !== undefined)
                      setContrastShowValue(v.contrastShowValue);
                    if (v.contrastShowBadges !== undefined)
                      setContrastShowBadges(v.contrastShowBadges);
                    setFormatRowAfterChannel(v.formatRowAfterChannel ?? false);
                    setEyedropperBesideSliders(v.eyedropperBesideSliders ?? false);
                    setContainerMaxWidth(v.maxWidth ?? DEFAULT_MAX_WIDTH);
                    setAreaHeight(v.areaHeight);
                  }}
                  title={v.hint}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
          <div
            className="flex min-h-110 items-center justify-center rounded-xl border border-border p-8"
            style={{ background: bg }}
          >
            <div className="w-full" style={{ maxWidth: containerMaxWidth }}>
              <ColorPicker.Root
                value={color}
                onValueChange={(c) => setColor(c)}
                backgroundColor={bg}
                formats={formats}
                defaultFormat={defaultFormat}
              >
                {(parts.gamutBadge ||
                  (parts.contrastReadout && contrastMetrics.length > 0)) && (
                  <div className="flex items-stretch gap-2">
                    {parts.gamutBadge && (
                      <ColorPicker.GamutBadge
                        showLabel={gamutShowLabel}
                        className="w-auto flex-1 justify-center"
                      />
                    )}
                    {parts.contrastReadout && contrastMetrics.length > 0 && (
                      <ColorPicker.ContrastReadout
                        metrics={contrastMetrics}
                        showLabel={contrastShowLabel}
                        showValue={contrastShowValue}
                        showBadges={contrastShowBadges}
                        className="w-auto flex-1 justify-center"
                      />
                    )}
                  </div>
                )}
                {parts.area && (
                  <ColorPicker.Area
                    mode={areaMode}
                    showWarningLines={showWarningLines}
                    style={areaHeight ? { height: areaHeight } : undefined}
                  />
                )}
                {parts.preview && <ColorPicker.Preview />}
                {(parts.hue || parts.lightness || parts.alpha) && (
                  eyedropperBesideSliders && parts.eyeDropper ? (
                    <div className="flex items-center gap-2">
                      <ColorPicker.EyeDropper />
                      <div className="flex flex-1 flex-col gap-1.5">
                        {parts.hue && <ColorPicker.Hue />}
                        {parts.lightness && <ColorPicker.Lightness />}
                        {parts.alpha && <ColorPicker.Alpha />}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {parts.hue && <ColorPicker.Hue />}
                      {parts.lightness && <ColorPicker.Lightness />}
                      {parts.alpha && <ColorPicker.Alpha />}
                    </div>
                  )
                )}
                {!formatRowAfterChannel &&
                  (parts.formatSwitcher ||
                    (parts.eyeDropper && !eyedropperBesideSliders)) && (
                    <div className="flex items-center gap-2">
                      {parts.formatSwitcher && (
                        <ColorPicker.FormatSwitcher className="flex-1" />
                      )}
                      {parts.eyeDropper && !eyedropperBesideSliders && (
                        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
                      )}
                    </div>
                  )}
                {parts.channelInput && (
                  <ColorPicker.ChannelInput showFormat={showChannelFormat} />
                )}
                {formatRowAfterChannel &&
                  (parts.formatSwitcher ||
                    (parts.eyeDropper && !eyedropperBesideSliders)) && (
                    <div className="flex items-center gap-2">
                      {parts.formatSwitcher && (
                        <ColorPicker.FormatSwitcher className="flex-1" />
                      )}
                      {parts.eyeDropper && !eyedropperBesideSliders && (
                        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
                      )}
                    </div>
                  )}
                {parts.input && <ColorPicker.CssInput />}
                {parts.swatches && (
                  <ColorPicker.Swatches
                    presets={["#fff", "#000", "oklch(0.7 0.18 30)", ...savedSwatches]}
                    onAdd={(_c, hex) =>
                      setSavedSwatches((prev) =>
                        prev.includes(hex) ? prev : [...prev, hex],
                      )
                    }
                  />
                )}
              </ColorPicker.Root>
            </div>
          </div>

          <CodeBlock code={code} />
        </div>

        <aside className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
          <Knob label="areaMode">
            <div className="flex flex-col gap-1.5">
              {AREA_MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer items-start gap-2"
                >
                  <input
                    type="radio"
                    name="areaMode"
                    checked={areaMode === m.value}
                    onChange={() => setAreaMode(m.value)}
                    className="mt-1"
                  />
                  <div className="flex flex-col">
                    <span className="font-mono text-xs">{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.hint}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </Knob>

          <Knob label="formats">
            <div className="flex flex-wrap gap-1.5">
              {ALL_FORMATS.map((f) => {
                const on = formats.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFormat(f)}
                    className={cn(
                      "rounded border px-2 py-1 font-mono text-xs transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </Knob>

          <Knob label="defaultFormat">
            <select
              value={defaultFormat}
              onChange={(e) => {
                const next = e.target.value as ColorFormat;
                setDefaultFormat(next);
                if (!formats.includes(next)) {
                  setFormats((prev) =>
                    [...prev, next].sort(
                      (a, b) => ALL_FORMATS.indexOf(a) - ALL_FORMATS.indexOf(b),
                    ),
                  );
                }
              }}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 font-mono text-xs uppercase shadow-xs"
            >
              {ALL_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Knob>

          <Knob label="showWarningLines">
            <Toggle value={showWarningLines} onChange={setShowWarningLines} />
          </Knob>

          <Knob label="ChannelInput.showFormat">
            <Toggle value={showChannelFormat} onChange={setShowChannelFormat} />
          </Knob>

          <Knob label="ContrastReadout.metrics">
            <div className="flex flex-wrap gap-1.5">
              {(["wcag", "apca"] as const).map((m) => {
                const on = contrastMetrics.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setContrastMetrics((prev) =>
                        prev.includes(m)
                          ? prev.filter((x) => x !== m)
                          : ([...prev, m] as ("wcag" | "apca")[]),
                      )
                    }
                    className={cn(
                      "rounded border px-2 py-1 font-mono text-xs uppercase",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </Knob>

          <Knob label="ContrastReadout.showLabel">
            <Toggle value={contrastShowLabel} onChange={setContrastShowLabel} />
          </Knob>
          <Knob label="ContrastReadout.showValue">
            <Toggle value={contrastShowValue} onChange={setContrastShowValue} />
          </Knob>
          <Knob label="ContrastReadout.showBadges">
            <Toggle value={contrastShowBadges} onChange={setContrastShowBadges} />
          </Knob>

          <Knob label="GamutBadge.showLabel">
            <Toggle value={gamutShowLabel} onChange={setGamutShowLabel} />
          </Knob>

          <Knob label="parts">
            <div className="grid grid-cols-2 gap-1.5">
              {PARTS.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={parts[p.key]}
                    onChange={() => togglePart(p.key)}
                  />
                  <span className="font-mono text-xs">{p.label}</span>
                </label>
              ))}
            </div>
          </Knob>

          <Knob label="backgroundColor">
            <div className="flex flex-wrap gap-1.5">
              {BG_PRESETS.map((b) => {
                const isLight = b === "#ffffff" || b.startsWith("oklch(0.95");
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBg(b)}
                    aria-pressed={bg === b}
                    className={cn(
                      "rounded border px-2 py-1 font-mono text-[10px]",
                      bg === b ? "border-foreground" : "border-border",
                    )}
                    style={{
                      background: b,
                      color: isLight ? "#000" : "#fff",
                    }}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </Knob>
        </aside>
      </div>
    </main>
  );
}

function partsEqual(a: PartsState, b: PartsState): boolean {
  return (Object.keys(a) as PartKey[]).every((k) => a[k] === b[k]);
}

function buildSnippet({
  areaMode,
  formats,
  defaultFormat,
  showWarningLines,
  showChannelFormat,
  contrastMetrics,
  contrastShowLabel,
  contrastShowValue,
  contrastShowBadges,
  gamutShowLabel,
  formatRowAfterChannel,
  eyedropperBesideSliders,
  bg,
  parts,
}: {
  areaMode: AreaMode;
  formats: ColorFormat[];
  defaultFormat: ColorFormat;
  showWarningLines: boolean;
  showChannelFormat: boolean;
  contrastMetrics: ("wcag" | "apca")[];
  contrastShowLabel: boolean;
  contrastShowValue: boolean;
  contrastShowBadges: boolean;
  gamutShowLabel: boolean;
  formatRowAfterChannel: boolean;
  eyedropperBesideSliders: boolean;
  bg: string;
  parts: Record<PartKey, boolean>;
}) {
  const lines: string[] = [];
  lines.push(`<ColorPicker.Root`);
  lines.push(`  value={color}`);
  lines.push(`  onValueChange={setColor}`);
  lines.push(`  backgroundColor=${JSON.stringify(bg)}`);
  if (formats.length !== ALL_FORMATS.length)
    lines.push(`  formats={${JSON.stringify(formats)}}`);
  if (defaultFormat !== "p3")
    lines.push(`  defaultFormat=${JSON.stringify(defaultFormat)}`);
  lines.push(`>`);

  const hasContrast = parts.contrastReadout && contrastMetrics.length > 0;
  if (parts.gamutBadge || hasContrast) {
    lines.push(`  <div className="flex items-stretch gap-2">`);
    if (parts.gamutBadge) {
      const gp: string[] = [];
      if (!gamutShowLabel) gp.push(`showLabel={false}`);
      gp.push(`className="w-auto flex-1 justify-center"`);
      lines.push(`    <ColorPicker.GamutBadge ${gp.join(" ")} />`);
    }
    if (hasContrast) {
      const props: string[] = [`metrics={${JSON.stringify(contrastMetrics)}}`];
      if (!contrastShowLabel) props.push(`showLabel={false}`);
      if (!contrastShowValue) props.push(`showValue={false}`);
      if (!contrastShowBadges) props.push(`showBadges={false}`);
      props.push(`className="w-auto flex-1 justify-center"`);
      lines.push(`    <ColorPicker.ContrastReadout ${props.join(" ")} />`);
    }
    lines.push(`  </div>`);
  }

  if (parts.area) {
    const areaProps = `mode="${areaMode}"${showWarningLines ? "" : " showWarningLines={false}"}`;
    lines.push(`  <ColorPicker.Area ${areaProps} />`);
  }

  if (parts.preview) lines.push(`  <ColorPicker.Preview />`);

  const sliders: string[] = [];
  if (parts.hue) sliders.push(`<ColorPicker.Hue />`);
  if (parts.lightness) sliders.push(`<ColorPicker.Lightness />`);
  if (parts.alpha) sliders.push(`<ColorPicker.Alpha />`);
  if (sliders.length) {
    if (eyedropperBesideSliders && parts.eyeDropper) {
      lines.push(`  <div className="flex items-center gap-2">`);
      lines.push(`    <ColorPicker.EyeDropper />`);
      lines.push(`    <div className="flex flex-1 flex-col gap-1.5">`);
      sliders.forEach((s) => lines.push(`      ${s}`));
      lines.push(`    </div>`);
      lines.push(`  </div>`);
    } else {
      lines.push(`  <div className="flex flex-col gap-1.5">`);
      sliders.forEach((s) => lines.push(`    ${s}`));
      lines.push(`  </div>`);
    }
  }

  const formatRow = () => {
    const showEyedrop = parts.eyeDropper && !eyedropperBesideSliders;
    if (!parts.formatSwitcher && !showEyedrop) return;
    lines.push(`  <div className="flex items-center gap-2">`);
    if (parts.formatSwitcher)
      lines.push(`    <ColorPicker.FormatSwitcher className="flex-1" />`);
    if (showEyedrop)
      lines.push(`    <ColorPicker.EyeDropper className="h-8 w-full flex-1" />`);
    lines.push(`  </div>`);
  };

  if (!formatRowAfterChannel) formatRow();

  if (parts.channelInput)
    lines.push(
      `  <ColorPicker.ChannelInput${showChannelFormat ? "" : " showFormat={false}"} />`,
    );

  if (formatRowAfterChannel) formatRow();
  if (parts.input) lines.push(`  <ColorPicker.CssInput />`);

  if (parts.swatches)
    lines.push(
      `  <ColorPicker.Swatches presets={[…]} onAdd={(_c, hex) => savePreset(hex)} />`,
    );

  lines.push(`</ColorPicker.Root>`);
  return lines.join("\n");
}

function Knob({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "inline-flex h-5 w-9 items-center rounded-full border border-border transition-colors",
        value ? "bg-foreground" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "size-4 rounded-full bg-background shadow transition-transform",
          value ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

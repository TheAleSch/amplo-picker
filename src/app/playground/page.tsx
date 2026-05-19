"use client";

import * as React from "react";
import Link from "next/link";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import {
  GradientPicker,
  FillPicker,
  DEFAULT_LINEAR,
  formatGradient,
  formatFill,
  BUILTIN_GRADIENT_PRESETS,
  type Gradient,
  type Fill,
} from "@/registry/new-york/color-picker/fill-picker";
import { parseColor, formatColor } from "@/registry/new-york/color-picker/lib/color";
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

type GradientPartKey =
  | "typeSwitcher"
  | "bar"
  | "area"
  | "shapeSwitcher"
  | "positionPad"
  | "positionInput"
  | "anglePad"
  | "angleInput"
  | "radiusInput"
  | "ellipseRadiiInput"
  | "radialSizeSelect"
  | "stopList"
  | "stopColor"
  | "stopSwatches"
  | "interpSwitcher"
  | "presets"
  | "cssInput"
  | "reverseStops";

type GradientPartsState = Record<GradientPartKey, boolean>;

const GRADIENT_PARTS_DEFAULT: GradientPartsState = {
  typeSwitcher: true,
  reverseStops: true,
  bar: true,
  area: true,
  shapeSwitcher: true,
  positionPad: true,
  positionInput: true,
  anglePad: true,
  angleInput: true,
  radiusInput: true,
  ellipseRadiiInput: false,
  radialSizeSelect: false,
  stopList: true,
  stopColor: true,
  stopSwatches: false,
  interpSwitcher: false,
  presets: true,
  cssInput: false,
};

const GRADIENT_PARTS: Array<{ key: GradientPartKey; label: string }> = [
  { key: "typeSwitcher", label: "TypeSwitcher" },
  { key: "reverseStops", label: "ReverseStops" },
  { key: "bar", label: "Bar" },
  { key: "area", label: "Area" },
  { key: "shapeSwitcher", label: "ShapeSwitcher" },
  { key: "positionPad", label: "PositionPad" },
  { key: "positionInput", label: "PositionInput" },
  { key: "anglePad", label: "AnglePad" },
  { key: "angleInput", label: "AngleInput" },
  { key: "radiusInput", label: "RadiusInput" },
  { key: "ellipseRadiiInput", label: "EllipseRadiiInput" },
  { key: "radialSizeSelect", label: "RadialSizeSelect" },
  { key: "stopList", label: "StopList" },
  { key: "stopColor", label: "StopColor" },
  { key: "stopSwatches", label: "StopColor.Swatches" },
  { key: "interpSwitcher", label: "InterpSwitcher" },
  { key: "presets", label: "Presets" },
  { key: "cssInput", label: "CssInput" },
];

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
    areaMode: "hsv-sv",
    channelShowFormat: true,
    eyedropperBesideSliders: true,
    maxWidth: 240,
    areaHeight: 216,
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
    name: "Chroma × hue",
    hint: "areaMode='oklch-hc' puts hue + chroma on the canvas, so swap the Hue slider for a Lightness slider. Mirrors the docs sample.",
    areaMode: "oklch-hc",
    channelShowFormat: false,
    parts: {
      ...ALL_OFF,
      gamutBadge: true,
      contrastReadout: true,
      area: true,
      lightness: true,
      alpha: true,
      formatSwitcher: true,
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
    () => parseColor("#2a2a2a")!,
  );
  const [activeFormat, setActiveFormat] = React.useState<ColorFormat>("p3");
  const bg = React.useMemo(
    () => formatColor(color, activeFormat),
    [color, activeFormat],
  );
  const [areaMode, setAreaMode] = React.useState<AreaMode>("oklch-cl");
  const [formats, setFormats] = React.useState<ColorFormat[]>([...ALL_FORMATS]);
  const [defaultFormat, setDefaultFormat] = React.useState<ColorFormat>("p3");
  const [showWarningLines, setShowWarningLines] = React.useState(true);
  const [softProof, setSoftProof] = React.useState(false);
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
  const [containerMaxWidth, setContainerMaxWidth] = React.useState<number | undefined>(
    VARIANTS[0].maxWidth,
  );
  const [areaHeight, setAreaHeight] = React.useState<number | undefined>(
    VARIANTS[0].areaHeight,
  );
  const [fillMode, setFillMode] = React.useState<"color" | "gradient" | "fill">(
    "color",
  );
  const [gradientParts, setGradientParts] = React.useState<GradientPartsState>(
    GRADIENT_PARTS_DEFAULT,
  );
  const toggleGradientPart = (k: GradientPartKey) =>
    setGradientParts((p) => ({ ...p, [k]: !p[k] }));
  const [gradient, setGradient] = React.useState<Gradient>(DEFAULT_LINEAR);
  const [savedGradients, setSavedGradients] = React.useState<string[]>([]);
  const addGradientPreset = React.useCallback((_g: Gradient, css: string) => {
    setSavedGradients((prev) => (prev.includes(css) ? prev : [...prev, css]));
  }, []);
  const gradientPresets = React.useMemo(
    () => [...BUILTIN_GRADIENT_PRESETS, ...savedGradients],
    [savedGradients],
  );
  const [fill, setFill] = React.useState<Fill>(() => ({
    kind: "color",
    color: parseColor("oklch(0.7 0.18 30)")!,
  }));
  const gradientCss = React.useMemo(() => formatGradient(gradient), [gradient]);
  const fillCss = React.useMemo(() => formatFill(fill), [fill]);
  const previewBg =
    fillMode === "gradient" ? gradientCss : fillMode === "fill" ? fillCss : bg;

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
        softProof,
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
      softProof,
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
          <div
            role="tablist"
            aria-label="Fill mode"
            className="inline-flex w-fit items-center gap-1 rounded-md bg-muted p-1"
          >
            {(
              [
                ["color", "Solid"],
                ["gradient", "Gradient"],
                ["fill", "Fill (tabs)"],
              ] as const
            ).map(([m, label]) => {
              const active = fillMode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-state={active ? "active" : "inactive"}
                  onClick={() => setFillMode(m)}
                  className={cn(
                    "rounded-sm px-3 py-1 text-xs font-medium outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {fillMode === "color" && (
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
                      setActiveFormat(v.defaultFormat);
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
                    setContainerMaxWidth(v.maxWidth);
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
          )}
          <div
            className="flex min-h-110 items-center justify-center rounded-xl border border-border p-8"
            style={{ background: previewBg }}
          >
            <div
              style={
                containerMaxWidth !== undefined
                  ? { width: "100%", maxWidth: containerMaxWidth }
                  : {
                      width: "fit-content",
                      minWidth: DEFAULT_MAX_WIDTH,
                      maxWidth: "100%",
                    }
              }
            >
              {fillMode === "color" && (
              <ColorPicker.Root
                value={color}
                onValueChange={(c) => setColor(c)}
                backgroundColor={bg}
                formats={formats}
                format={activeFormat}
                onFormatChange={setActiveFormat}
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
                    softProof={softProof}
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
              )}
              {fillMode === "gradient" && (
                <GradientPicker.Root
                  value={gradient}
                  onValueChange={setGradient}
                >
                  {(gradientParts.typeSwitcher || gradientParts.reverseStops) && (
                    <div className="flex items-center justify-between">
                      {gradientParts.typeSwitcher ? (
                        <GradientPicker.TypeSwitcher />
                      ) : (
                        <span />
                      )}
                      {gradientParts.reverseStops && <GradientPicker.ReverseStops />}
                    </div>
                  )}
                  {gradientParts.bar && <GradientPicker.Bar />}
                  {gradientParts.area && <GradientPicker.Area />}
                  {gradientParts.shapeSwitcher && <GradientPicker.ShapeSwitcher />}
                  {gradientParts.positionPad && <GradientPicker.PositionPad />}
                  {gradientParts.positionInput && <GradientPicker.PositionInput />}
                  {gradientParts.anglePad && <GradientPicker.AnglePad />}
                  {gradientParts.angleInput && <GradientPicker.AngleInput />}
                  {gradientParts.radiusInput && <GradientPicker.RadiusInput />}
                  {gradientParts.ellipseRadiiInput && <GradientPicker.EllipseRadiiInput />}
                  {gradientParts.radialSizeSelect && <GradientPicker.RadialSizeSelect />}
                  {gradientParts.stopColor && (
                    <GradientPicker.StopColor>
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
                      {gradientParts.stopSwatches && (
                        <ColorPicker.Swatches
                          presets={["#fff", "#000", "oklch(0.7 0.18 30)"]}
                        />
                      )}
                    </GradientPicker.StopColor>
                  )}
                  {gradientParts.stopList && <GradientPicker.StopList />}
                  {gradientParts.interpSwitcher && <GradientPicker.InterpSwitcher />}
                  {gradientParts.presets && (
                    <GradientPicker.Presets
                      presets={gradientPresets}
                      onAdd={addGradientPreset}
                    />
                  )}
                  {gradientParts.cssInput && <GradientPicker.CssInput />}
                </GradientPicker.Root>
              )}
              {fillMode === "fill" && (
                <FillPicker.Root value={fill} onValueChange={setFill}>
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
                    {(gradientParts.typeSwitcher || gradientParts.reverseStops) && (
                      <div className="flex items-center justify-between">
                        {gradientParts.typeSwitcher ? (
                          <GradientPicker.TypeSwitcher />
                        ) : (
                          <span />
                        )}
                        {gradientParts.reverseStops && <GradientPicker.ReverseStops />}
                      </div>
                    )}
                    {gradientParts.bar && <GradientPicker.Bar />}
                    {gradientParts.area && <GradientPicker.Area />}
                    {gradientParts.shapeSwitcher && <GradientPicker.ShapeSwitcher />}
                    {gradientParts.positionPad && <GradientPicker.PositionPad />}
                    {gradientParts.positionInput && <GradientPicker.PositionInput />}
                    {gradientParts.anglePad && <GradientPicker.AnglePad />}
                    {gradientParts.angleInput && <GradientPicker.AngleInput />}
                    {gradientParts.radiusInput && <GradientPicker.RadiusInput />}
                    {gradientParts.ellipseRadiiInput && <GradientPicker.EllipseRadiiInput />}
                    {gradientParts.radialSizeSelect && <GradientPicker.RadialSizeSelect />}
                    {gradientParts.stopColor && (
                      <GradientPicker.StopColor>
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
                        {gradientParts.stopSwatches && (
                          <ColorPicker.Swatches
                            presets={["#fff", "#000", "oklch(0.7 0.18 30)"]}
                          />
                        )}
                      </GradientPicker.StopColor>
                    )}
                    {gradientParts.stopList && <GradientPicker.StopList />}
                    {gradientParts.interpSwitcher && <GradientPicker.InterpSwitcher />}
                    {gradientParts.presets && (
                    <GradientPicker.Presets
                      presets={gradientPresets}
                      onAdd={addGradientPreset}
                    />
                  )}
                    {gradientParts.cssInput && <GradientPicker.CssInput />}
                  </FillPicker.Pane>
                </FillPicker.Root>
              )}
            </div>
          </div>

          {fillMode === "color" ? (
            <CodeBlock code={code} />
          ) : fillMode === "gradient" ? (
            <CodeBlock
              code={`${buildGradientSnippet(gradientParts)}\n\n/* Output CSS */\n${gradientCss}`}
            />
          ) : (
            <CodeBlock
              code={`${buildFillSnippet(gradientParts)}\n\n/* Output CSS */\n${fillCss}`}
            />
          )}
        </div>

        {fillMode === "color" && (
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
                setActiveFormat(next);
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

          <Knob label="softProof">
            <Toggle value={softProof} onChange={setSoftProof} />
            <p className="text-xs text-muted-foreground">
              Chroma-reduce out-of-display colors in OKLCH instead of
              per-channel clipping. Hue stays true past the display gamut at
              the cost of a flatter chroma boundary.
            </p>
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
            <p className="text-xs text-muted-foreground">
              Tracks the picker output. Drag the area or sliders to change it.
            </p>
            <div
              className="mt-1 h-8 rounded-md border border-border"
              style={{ background: bg }}
              aria-label={`Background ${bg}`}
            />
          </Knob>
        </aside>
        )}
        {fillMode !== "color" && (
        <aside className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
          <Knob label="parts">
            <div className="grid grid-cols-2 gap-1.5">
              {GRADIENT_PARTS.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={gradientParts[p.key]}
                    onChange={() => toggleGradientPart(p.key)}
                  />
                  <span className="font-mono text-xs">{p.label}</span>
                </label>
              ))}
            </div>
          </Knob>
          <Knob label="output">
            <p className="text-xs text-muted-foreground">
              Tracks the picker output. Drag stops, change angle, or pick a preset.
            </p>
            <div
              className="mt-1 h-12 rounded-md border border-border"
              style={{ background: previewBg }}
              aria-label="Output preview"
            />
          </Knob>
        </aside>
        )}
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
  softProof,
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
  softProof: boolean;
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
    const areaProps = [
      `mode="${areaMode}"`,
      showWarningLines ? "" : " showWarningLines={false}",
      softProof ? " softProof" : "",
    ].join("");
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

function buildGradientPartsLines(
  parts: GradientPartsState,
  indent: string,
  stopColorChildren: string[],
): string[] {
  const lines: string[] = [];
  if (parts.typeSwitcher || parts.reverseStops) {
    lines.push(`${indent}<div className="flex items-center justify-between">`);
    if (parts.typeSwitcher)
      lines.push(`${indent}  <GradientPicker.TypeSwitcher />`);
    else lines.push(`${indent}  <span />`);
    if (parts.reverseStops)
      lines.push(`${indent}  <GradientPicker.ReverseStops />`);
    lines.push(`${indent}</div>`);
  }
  if (parts.bar) lines.push(`${indent}<GradientPicker.Bar />`);
  if (parts.area) lines.push(`${indent}<GradientPicker.Area />`);
  if (parts.shapeSwitcher) lines.push(`${indent}<GradientPicker.ShapeSwitcher />`);
  if (parts.positionPad) lines.push(`${indent}<GradientPicker.PositionPad />`);
  if (parts.positionInput) lines.push(`${indent}<GradientPicker.PositionInput />`);
  if (parts.anglePad) lines.push(`${indent}<GradientPicker.AnglePad />`);
  if (parts.angleInput) lines.push(`${indent}<GradientPicker.AngleInput />`);
  if (parts.radiusInput) lines.push(`${indent}<GradientPicker.RadiusInput />`);
  if (parts.ellipseRadiiInput) lines.push(`${indent}<GradientPicker.EllipseRadiiInput />`);
  if (parts.radialSizeSelect) lines.push(`${indent}<GradientPicker.RadialSizeSelect />`);
  if (parts.stopColor) {
    lines.push(`${indent}<GradientPicker.StopColor>`);
    stopColorChildren.forEach((c) => lines.push(`${indent}  ${c}`));
    lines.push(`${indent}</GradientPicker.StopColor>`);
  }
  if (parts.stopList) lines.push(`${indent}<GradientPicker.StopList />`);
  if (parts.interpSwitcher) lines.push(`${indent}<GradientPicker.InterpSwitcher />`);
  if (parts.presets) lines.push(`${indent}<GradientPicker.Presets />`);
  if (parts.cssInput) lines.push(`${indent}<GradientPicker.CssInput />`);
  return lines;
}

function stopColorChildren(includeSwatches: boolean): string[] {
  const lines = [
    "<ColorPicker.Area />",
    `<div className="flex flex-col gap-1.5">`,
    "  <ColorPicker.Hue />",
    "  <ColorPicker.Alpha />",
    "</div>",
    `<div className="flex items-center gap-2">`,
    `  <ColorPicker.FormatSwitcher className="flex-1" />`,
    `  <ColorPicker.EyeDropper className="h-8 w-full flex-1" />`,
    "</div>",
    "<ColorPicker.ChannelInput showFormat={false} />",
  ];
  if (includeSwatches)
    lines.push(`<ColorPicker.Swatches presets={["#fff", "#000", "oklch(0.7 0.18 30)"]} />`);
  return lines;
}

function buildGradientSnippet(parts: GradientPartsState): string {
  const lines: string[] = [];
  lines.push(`<GradientPicker.Root value={gradient} onValueChange={setGradient}>`);
  buildGradientPartsLines(parts, "  ", stopColorChildren(parts.stopSwatches)).forEach(
    (l) => lines.push(l),
  );
  lines.push(`</GradientPicker.Root>`);
  return lines.join("\n");
}

function buildFillSnippet(parts: GradientPartsState): string {
  const lines: string[] = [];
  lines.push(`<FillPicker.Root value={fill} onValueChange={setFill}>`);
  lines.push(`  <FillPicker.Tabs className="self-stretch">`);
  lines.push(`    <FillPicker.Tab mode="color" className="flex-1">Solid</FillPicker.Tab>`);
  lines.push(`    <FillPicker.Tab mode="gradient" className="flex-1">Gradient</FillPicker.Tab>`);
  lines.push(`  </FillPicker.Tabs>`);
  lines.push(`  <FillPicker.Pane mode="color" className="flex flex-col gap-2">`);
  lines.push(`    <ColorPicker.Area />`);
  lines.push(`    <ColorPicker.Hue />`);
  lines.push(`    <ColorPicker.Alpha />`);
  lines.push(`    <ColorPicker.ChannelInput />`);
  lines.push(`  </FillPicker.Pane>`);
  lines.push(`  <FillPicker.Pane mode="gradient" className="flex flex-col gap-2">`);
  buildGradientPartsLines(parts, "    ", stopColorChildren(parts.stopSwatches)).forEach(
    (l) => lines.push(l),
  );
  lines.push(`  </FillPicker.Pane>`);
  lines.push(`</FillPicker.Root>`);
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

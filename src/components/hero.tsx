"use client";

import * as React from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { GodRayCanvas } from "./godray-canvas";
import { InstallTabs } from "./install-tabs";
import { CopyForAi } from "./copy-for-ai";
import { AMPLO_MARK_PATH, AMPLO_MARK_VIEWBOX } from "./amplo-mark";
import {
  ColorPicker,
  FillPicker,
  GradientPicker,
  BUILTIN_GRADIENT_PRESETS,
  type Fill,
} from "@/registry/new-york/color-picker/fill-picker";
import {
  ColorPickerBase,
  FillPickerBase,
  GradientPickerBase,
} from "@/registry/new-york/fill-picker-base/fill";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";
import { cn } from "@/lib/utils";

type Variant = "base" | "radix";

// Mark renders inline in the left column. Halo center + width are measured
// from the actual DOM rect each frame so the godray canvas tracks the mark
// regardless of viewport / breakpoint.
const MARK_FALLBACK = { center: { x: 0.5, y: 0.3 }, width: 0.2 };

function useMeasuredMark(
  sectionRef: React.RefObject<HTMLElement | null>,
  markRef: React.RefObject<HTMLElement | null>,
) {
  const [v, setV] = React.useState(MARK_FALLBACK);
  React.useEffect(() => {
    const measure = () => {
      const sec = sectionRef.current;
      const mk = markRef.current;
      if (!sec || !mk) return;
      const sr = sec.getBoundingClientRect();
      const mr = mk.getBoundingClientRect();
      if (sr.width === 0 || sr.height === 0) return;
      const next = {
        center: {
          x: (mr.left - sr.left + mr.width / 2) / sr.width,
          y: (mr.top - sr.top + mr.height / 2) / sr.height,
        },
        width: mr.width / sr.width,
      };
      // Bail when nothing changed — a fresh object every call would
      // re-render the whole Hero (both pickers included) for free.
      setV((prev) =>
        prev.center.x === next.center.x &&
        prev.center.y === next.center.y &&
        prev.width === next.width
          ? prev
          : next,
      );
    };
    measure();
    // Mark and section scroll together, so their *relative* geometry only
    // changes on layout changes — the ResizeObserver covers those; no
    // scroll listener (it forced layout on every scroll frame).
    const ro = new ResizeObserver(measure);
    if (sectionRef.current) ro.observe(sectionRef.current);
    if (markRef.current) ro.observe(markRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [sectionRef, markRef]);
  return v;
}

type HaloParams = {
  colorSpace: "srgb" | "display-p3";
  fpsCap: number;
  bloomDivisor: number;
  bloom: number;
  intensity: number;
  blurStride: number;
  blurPasses: number;
  lodStep: number;
  lodCount: number;
  whitepoint: number;
  hueSpeed: number;
  haloHueOffset: number;
  swirlL: number;
  swirlC: number;
  haloL: number;
  haloC: number;
};

// Wide-gamut Display-P3 swatches — pure primaries plus vivid in-betweens.
// These exceed the sRGB gamut and only render correctly on P3 displays.
const P3_VIVID_PRESETS = [
  "color(display-p3 1 0 0)",
  "color(display-p3 1 0.45 0)",
  "color(display-p3 1 0.9 0)",
  "color(display-p3 0.4 1 0)",
  "color(display-p3 0 1 0.4)",
  "color(display-p3 0 1 1)",
  "color(display-p3 0 0.5 1)",
  "color(display-p3 0.4 0 1)",
  "color(display-p3 0.85 0 1)",
  "color(display-p3 1 0 0.6)",
];

const DEFAULT_HALO: HaloParams = {
  colorSpace: "display-p3",
  fpsCap: 90,
  bloomDivisor: 8,
  bloom: 6.4,
  intensity: 1.7,
  blurStride: 30,
  blurPasses: 4,
  lodStep: 2.6,
  lodCount: 4,
  whitepoint: 1.1,
  hueSpeed: 1.0,
  haloHueOffset: 0,
  swirlL: 0.66,
  swirlC: 0.36,
  haloL: 0.47,
  haloC: 0.14,
};

export function Hero() {
  const [halo, setHalo] = React.useState<HaloParams>(DEFAULT_HALO);
  const [frameStats, setFrameStats] = React.useState<{
    fps: number;
    gpuMs: number | null;
  } | null>(null);
  const [variant, setVariant] = React.useState<Variant>("base");
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const markRef = React.useRef<HTMLDivElement | null>(null);
  const { center, width } = useMeasuredMark(sectionRef, markRef);

  // flex-1 + overflow-hidden: the hero fills the layout's viewport-height
  // flex column minus the footer, so the page itself never scrolls. Tall
  // content (the gradient tab on short windows) scrolls *inside* the
  // content div, beneath the floating toolbar.
  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-0 flex-1 overflow-hidden bg-background text-foreground"
    >
      <GodRayCanvas
        className="absolute inset-0"
        markCenterFraction={center}
        markWidthFraction={width}
        bloomDivisor={halo.bloomDivisor}
        colorSpace={halo.colorSpace}
        fpsCap={halo.fpsCap}
        onFrameStats={setFrameStats}
        bloom={halo.bloom}
        intensity={halo.intensity}
        blurStride={halo.blurStride}
        blurPasses={halo.blurPasses}
        lodStep={halo.lodStep}
        lodCount={halo.lodCount}
        whitepoint={halo.whitepoint}
        hueSpeed={halo.hueSpeed}
        haloHueOffset={halo.haloHueOffset}
        swirlL={halo.swirlL}
        swirlC={halo.swirlC}
        haloL={halo.haloL}
        haloC={halo.haloC}
      />

      <Toolbar />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col overflow-y-auto px-6 pb-8 pt-20 lg:px-16 lg:pb-16 lg:pt-24">
        <div className="flex flex-1 flex-col items-center justify-center gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left column: mark + centered title + subtitle */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div
              ref={markRef}
              className="w-full max-w-70"
              style={{ aspectRatio: `${333} / ${290}` }}
            >
              <svg
                viewBox={AMPLO_MARK_VIEWBOX}
                aria-hidden
                className="pointer-events-none h-full w-full"
              >
                <path
                  d={AMPLO_MARK_PATH}
                  fill="#000"
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-5xl">
              Amplo Picker
            </h1>
            <p className="max-w-[300px] text-sm leading-[1.5] text-foreground/70 sm:max-w-[480px] sm:text-base">
              OKLCH-native, Display-P3-aware fill picker for shadcn.
              Composable, accessible, gamut-aware.
            </p>
          </div>

          {/* Right column: picker */}
          <div className="flex w-full justify-center">
            <HeroPicker variant={variant} />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-3 lg:mt-12">
          <div
            role="tablist"
            aria-label="Component variant"
            className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1"
          >
            {(["base", "radix"] as const).map((v) => {
              const isActive = variant === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "base" ? (
                    <span className="inline-flex items-center gap-1.5">
                      Base UI
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        New
                      </span>
                    </span>
                  ) : (
                    "Radix UI"
                  )}
                </button>
              );
            })}
          </div>
          <InstallTabs
            url={
              variant === "base"
                ? "https://amplo.ale.design/r/fill-picker.json"
                : "https://amplo.ale.design/r/fill-picker-radix.json"
            }
            className="w-full max-w-md"
          />
          <CopyForAi className="w-full max-w-md justify-center" />
        </div>
      </div>

      <HaloTuner value={halo} onChange={setHalo} stats={frameStats} />
    </section>
  );
}

// Tuner field spec: key, label, min, max, step.
type NumericHaloKey = Exclude<keyof HaloParams, "colorSpace">;
const TUNER_FIELDS: Array<[NumericHaloKey, string, number, number, number]> = [
  ["fpsCap", "fps cap", 30, 240, 5],
  ["bloomDivisor", "bloom res ÷", 1, 8, 1],
  ["bloom", "bloom", 0, 12, 0.1],
  ["intensity", "intensity", 0, 3, 0.05],
  ["blurStride", "blur stride", 1, 60, 1],
  ["blurPasses", "blur passes", 1, 8, 1],
  ["lodStep", "lod step", 0.2, 4, 0.1],
  ["lodCount", "lod count", 1, 8, 1],
  ["whitepoint", "whitepoint", 0.2, 4, 0.05],
  ["hueSpeed", "hue speed", 0, 4, 0.05],
  ["haloHueOffset", "halo hue Δ", -3.14, 3.14, 0.01],
  ["swirlL", "fill L", 0, 1, 0.01],
  ["swirlC", "fill C", 0, 0.5, 0.005],
  ["haloL", "halo L", 0, 1, 0.01],
  ["haloC", "halo C", 0, 0.5, 0.005],
];

/**
 * Dev-only floating panel for live-tuning the godray shader. Every slider
 * streams straight into GodRayCanvas uniforms via paramsRef (no GL rebuild)
 * except `bloom res ÷`, which reallocates the bloom buffers (brief re-init).
 */
function HaloTuner({
  value,
  onChange,
  stats,
}: {
  value: HaloParams;
  onChange: (v: HaloParams) => void;
  stats: { fps: number; gpuMs: number | null } | null;
}) {
  const [open, setOpen] = React.useState(false);
  // In production the tuner is hidden until the user types "tunehalo"
  // anywhere on the page (not while focused in an input). Dev builds show
  // the button straight away.
  const [unlocked, setUnlocked] = React.useState(
    process.env.NODE_ENV !== "production",
  );
  React.useEffect(() => {
    if (unlocked) return;
    const SECRET = "tunehalo";
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer === SECRET) {
        setUnlocked(true);
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked]);
  const [copied, setCopied] = React.useState(false);
  // NOTE: keep this return below every hook — early returns above a hook
  // violate the Rules of Hooks once `unlocked` flips.
  if (!unlocked) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-lg border border-border bg-background/80 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium">Halo tuner</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {copied ? "copied!" : "copy JSON"}
              </button>
              <button
                type="button"
                onClick={() => onChange(DEFAULT_HALO)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                reset
              </button>
            </div>
          </div>
          {/* Framerate: left number is the real render rate (fps cap and
              vsync apply); "max" is the theoretical rate the GPU could
              sustain, derived from measured GPU frame time. */}
          <div className="mb-2 rounded bg-muted/60 px-2 py-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {stats
              ? `${stats.fps.toFixed(0)} fps` +
                (stats.gpuMs !== null
                  ? ` · gpu ${stats.gpuMs.toFixed(2)}ms ≈ ${(1000 / stats.gpuMs).toFixed(0)} fps max`
                  : " · gpu timer n/a")
              : "measuring…"}
          </div>
          <div className="mb-2 grid grid-cols-[76px_1fr] items-center gap-2 text-[11px]">
            <span className="truncate text-muted-foreground">colorspace</span>
            <div className="flex gap-1">
              {(["display-p3", "srgb"] as const).map((cs) => (
                <button
                  key={cs}
                  type="button"
                  onClick={() => onChange({ ...value, colorSpace: cs })}
                  className={cn(
                    "rounded border px-2 py-0.5",
                    value.colorSpace === cs
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {cs === "display-p3" ? "P3" : "sRGB"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {TUNER_FIELDS.map(([key, label, min, max, step]) => (
              <label key={key} className="grid grid-cols-[76px_1fr_40px] items-center gap-2 text-[11px]">
                <span className="truncate text-muted-foreground">{label}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value[key]}
                  onChange={(e) =>
                    onChange({ ...value, [key]: Number(e.target.value) })
                  }
                  className="h-1 w-full accent-foreground"
                />
                <span className="text-right font-mono tabular-nums">
                  {value[key] % 1 === 0 ? value[key] : value[key].toFixed(2)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow backdrop-blur hover:text-foreground"
      >
        {open ? "close tuner" : "tune halo"}
      </button>
    </div>
  );
}



/**
 * Hero-only variant of GradientShapeControls that omits angle controls —
 * the visual Area pad above already exposes direction by dragging the
 * gradient line endpoints, so a separate AnglePad would be redundant.
 */
function HeroGradientShapeControls({ GP }: { GP: typeof GradientPicker }) {
  const ctx = useGradientPickerContext();
  if (ctx.gradient.type === "linear") return null;
  if (ctx.gradient.type === "radial") {
    return (
      <div className="flex flex-col gap-2">
        <GP.ShapeSwitcher />
        <GP.PositionGroup>
          <GP.PositionPad />
          <GP.PositionInput />
          {ctx.gradient.shape === "circle" && (
            <GP.RadiusInput className="flex-1" />
          )}
        </GP.PositionGroup>
      </div>
    );
  }
  // conic
  return (
    <GP.PositionGroup>
      <GP.PositionPad />
      <GP.PositionInput />
    </GP.PositionGroup>
  );
}

function HeroPicker({ variant }: { variant: Variant }) {
  // Hero defaults to the Solid tab — that's the most familiar surface
  // for first-time visitors. Gradient mode is one click away; toggling
  // to it falls back to FillPicker's own gradient default.
  const [fill, setFill] = React.useState<Fill>(() => ({
    kind: "color",
    color: parseColor("oklch(0.7 0.18 30)")!,
  }));
  const [savedSwatches, setSavedSwatches] = React.useState<string[]>([]);
  const swatches = React.useMemo(
    () => [...P3_VIVID_PRESETS, ...savedSwatches],
    [savedSwatches],
  );
  const addSwatch = React.useCallback((_c: OklchColor, hex: string) => {
    setSavedSwatches((prev) => (prev.includes(hex) ? prev : [...prev, hex]));
  }, []);
  const [savedGradients, setSavedGradients] = React.useState<string[]>([]);
  const gradientPresets = React.useMemo(
    () => [...BUILTIN_GRADIENT_PRESETS, ...savedGradients],
    [savedGradients],
  );
  const addGradient = React.useCallback((_g: unknown, css: string) => {
    setSavedGradients((prev) => (prev.includes(css) ? prev : [...prev, css]));
  }, []);

  // Both variants expose the identical namespace; the Base UI objects are
  // structurally compatible with the Radix ones (same pattern as the
  // playground's variant switcher), so the casts are safe.
  const FP = (variant === "base"
    ? (FillPickerBase as unknown as typeof FillPicker)
    : FillPicker) as typeof FillPicker;
  const CP = (variant === "base"
    ? (ColorPickerBase as unknown as typeof ColorPicker)
    : ColorPicker) as typeof ColorPicker;
  const GP = (variant === "base"
    ? (GradientPickerBase as unknown as typeof GradientPicker)
    : GradientPicker) as typeof GradientPicker;

  return (
    <FP.Root
      value={fill}
      onValueChange={setFill}
      className="w-full max-w-70 gap-3"
    >
      <FP.Tabs className="self-stretch">
        <FP.Tab mode="color" className="flex-1">
          Solid
        </FP.Tab>
        <FP.Tab mode="gradient" className="flex-1">
          Gradient
        </FP.Tab>
      </FP.Tabs>

      <FP.Pane mode="color" className="flex flex-col gap-3">
        <div className="flex items-stretch gap-2">
          <CP.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
          <CP.ContrastReadout
            metrics={["wcag", "apca"]}
            showLabel={false}
            showValue={false}
            className="w-auto flex-1 justify-center"
          />
        </div>
        <CP.Area mode="oklch-cl" />
        <div className="flex flex-col gap-1.5">
          <CP.Hue />
          <CP.Alpha />
        </div>
        <div className="flex items-center gap-2">
          <CP.FormatSwitcher className="flex-1" />
          <CP.EyeDropper className="h-8 w-full flex-1" />
        </div>
        <CP.ChannelInput showFormat={false} />
        <CP.Swatches presets={swatches} onAdd={addSwatch} />
      </FP.Pane>

      <FP.Pane mode="gradient" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <GP.TypeSwitcher />
          <div className="flex items-center gap-1">
            <GP.RepeatingToggle />
            <GP.ReverseStops />
          </div>
        </div>
        <GP.Bar />
        <GP.Area />
        <HeroGradientShapeControls GP={GP} />
        <GP.StopList />
        <GP.Presets presets={gradientPresets} onAdd={addGradient} />
      </FP.Pane>
    </FP.Root>
  );
}

function Toolbar() {
  return (
    <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 text-white backdrop-blur-md sm:top-6">
      <Link
        href="/docs"
        className="rounded-full px-3 py-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
      >
        Docs
      </Link>
      <Link
        href="/playground"
        className="rounded-full px-3 py-1 text-sm font-medium text-white/80 transition-colors hover:text-white"
      >
        Playground
      </Link>
      <ThemeToggle />
      <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />
      <a
        href="https://github.com/TheAleSch/amplo-picker"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="View on GitHub"
      >
        <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        <span className="hidden sm:inline">GitHub</span>
      </a>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark" | null>(null);

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };

  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-8 items-center justify-center rounded-full text-white/80 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {theme === null ? (
        <span aria-hidden className="size-4" />
      ) : isDark ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}

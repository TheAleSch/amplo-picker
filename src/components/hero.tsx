"use client";

import * as React from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { GodRayCanvas } from "./godray-canvas";
import { InstallTabs } from "./install-tabs";
import { CopyForAi } from "./copy-for-ai";
import { AMPLO_MARK_PATH, AMPLO_MARK_VIEWBOX } from "./amplo-mark";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";

// Mark renders inline in the left column. Halo center + width are measured
// from the actual DOM rect each frame so the godray canvas tracks the mark
// regardless of viewport / breakpoint.
const MARK_ASPECT = 290 / 333;
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
      setV({
        center: {
          x: (mr.left - sr.left + mr.width / 2) / sr.width,
          y: (mr.top - sr.top + mr.height / 2) / sr.height,
        },
        width: mr.width / sr.width,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (sectionRef.current) ro.observe(sectionRef.current);
    if (markRef.current) ro.observe(markRef.current);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [sectionRef, markRef]);
  return v;
}

type HaloParams = {
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
  bloom: 6,
  intensity: 1,
  blurStride: 30,
  blurPasses: 4,
  lodStep: 2.6,
  lodCount: 4,
  whitepoint: 1.0,
  hueSpeed: 1.0,
  haloHueOffset: 0,
  swirlL: 0.66,
  swirlC: 0.36,
  haloL: 0.47,
  haloC: 0.14,
};

export function Hero() {
  const [halo, setHalo] = React.useState<HaloParams>(DEFAULT_HALO);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const markRef = React.useRef<HTMLDivElement | null>(null);
  const { center, width } = useMeasuredMark(sectionRef, markRef);

  return (
    <section
      ref={sectionRef}
      className="relative isolate min-h-screen overflow-hidden bg-background text-foreground"
    >
      <GodRayCanvas
        className="absolute inset-0"
        markCenterFraction={center}
        markWidthFraction={width}
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

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-8 pt-20 lg:px-16 lg:pb-16 lg:pt-24">
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
              OKLCH-native, Display-P3-aware color picker for shadcn.
              Composable, accessible, gamut-aware.
            </p>
          </div>

          {/* Right column: picker */}
          <div className="flex w-full justify-center">
            <HeroPicker />
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center gap-3 lg:mt-12">
          <InstallTabs
            url="https://amplo.ale.design/r/fill-picker.json"
            className="w-full max-w-70"
          />
          <CopyForAi />
        </div>
      </div>

      {/* <HaloTuner values={halo} onChange={setHalo} /> */}
    </section>
  );
}

function HaloTuner({
  values,
  onChange,
}: {
  values: HaloParams;
  onChange: (next: HaloParams) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const set = (k: keyof HaloParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...values, [k]: parseFloat(e.target.value) });
  return (
    <div className="fixed bottom-6 left-6 z-50 hidden w-72 rounded-lg border border-white/10 bg-black/70 text-white shadow-xl backdrop-blur-md lg:block">
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-white/10 px-4 py-2 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Tune halo</span>
        <span className="text-xs opacity-60">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-4 text-xs">
          <TunerSlider label="Bloom" min={0} max={6} step={0.05} value={values.bloom} onChange={set("bloom")} />
          <TunerSlider label="Intensity" min={0} max={3} step={0.05} value={values.intensity} onChange={set("intensity")} />
          <TunerSlider label="Whitepoint" min={1} max={20} step={0.1} value={values.whitepoint} onChange={set("whitepoint")} />
          <TunerSlider label="Blur stride" min={1} max={80} step={1} value={values.blurStride} onChange={set("blurStride")} />
          <TunerSlider label="Blur passes" min={1} max={6} step={1} value={values.blurPasses} onChange={set("blurPasses")} />
          <TunerSlider label="LOD step" min={0.5} max={3} step={0.1} value={values.lodStep} onChange={set("lodStep")} />
          <TunerSlider label="LOD count" min={1} max={8} step={1} value={values.lodCount} onChange={set("lodCount")} />
          <TunerSlider label="Hue speed" min={0} max={1} step={0.01} value={values.hueSpeed} onChange={set("hueSpeed")} />
          <TunerSlider label="Halo hue Δ" min={-3.14} max={3.14} step={0.05} value={values.haloHueOffset} onChange={set("haloHueOffset")} />
          <TunerSlider label="Fill L" min={0.4} max={1} step={0.01} value={values.swirlL} onChange={set("swirlL")} />
          <TunerSlider label="Fill C" min={0} max={0.5} step={0.01} value={values.swirlC} onChange={set("swirlC")} />
          <TunerSlider label="Halo L" min={0.4} max={1} step={0.01} value={values.haloL} onChange={set("haloL")} />
          <TunerSlider label="Halo C" min={0} max={0.5} step={0.01} value={values.haloC} onChange={set("haloC")} />
          <button
            type="button"
            className="mt-1 self-start rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
            onClick={() => onChange(DEFAULT_HALO)}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function TunerSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-white/70">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="w-full accent-white"
      />
    </label>
  );
}

function HeroPicker() {
  const [color, setColor] = React.useState<OklchColor>(
    () => parseColor("oklch(0.7 0.18 30)")!,
  );
  const [savedSwatches, setSavedSwatches] = React.useState<string[]>([]);
  const swatches = React.useMemo(
    () => [...P3_VIVID_PRESETS, ...savedSwatches],
    [savedSwatches],
  );
  const addSwatch = React.useCallback((_c: OklchColor, hex: string) => {
    setSavedSwatches((prev) => (prev.includes(hex) ? prev : [...prev, hex]));
  }, []);
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={setColor}
      backgroundColor="#0a0a0a"
      className="w-full max-w-70"
    >
      <div className="flex items-stretch gap-2">
        <ColorPicker.GamutBadge showLabel={false} className="w-auto flex-1 justify-center" />
        <ColorPicker.ContrastReadout
          metrics={["wcag", "apca"]}
          showLabel={false}
          showValue={false}
          className="w-auto flex-1 justify-center"
        />
      </div>
      <ColorPicker.Area mode="oklch-cl" />
      <div className="flex flex-col gap-1.5">
        <ColorPicker.Hue />
        <ColorPicker.Alpha />
      </div>
      <div className="flex items-center gap-2">
        <ColorPicker.FormatSwitcher className="flex-1" />
        <ColorPicker.EyeDropper className="h-8 w-full flex-1" />
      </div>
      <ColorPicker.ChannelInput showFormat={false} />
      <ColorPicker.Swatches presets={swatches} onAdd={addSwatch} />
    </ColorPicker.Root>
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
      <div className="hidden items-center pl-1 pr-1.5 md:flex">
        <iframe
          src="https://ghbtns.com/github-btn.html?user=TheAleSch&repo=amplo-picker&type=star&count=true"
          title="Star TheAleSch/amplo-picker on GitHub"
          frameBorder="0"
          scrolling="0"
          width="80"
          height="20"
          style={{ display: "block", colorScheme: "dark" }}
        />
      </div>
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

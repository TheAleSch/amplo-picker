"use client";

import * as React from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { GodRayCanvas } from "./godray-canvas";
import { InstallTabs } from "./install-tabs";
import { AMPLO_MARK_PATH, AMPLO_MARK_VIEWBOX } from "./amplo-mark";
import { ColorPicker } from "@/registry/new-york/color-picker/color-picker";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import type { OklchColor } from "@/registry/new-york/color-picker/lib/types";

// Single source of truth for mark placement — both the shader and the SVG
// overlay must use these. The black A renders inset to leave a rainbow rim.
const MARK_CENTER = { x: 0.3, y: 0.36 };
const MARK_WIDTH_FRAC = 0.22;
// Inner black A renders slightly larger than the rainbow's box (101%) so
// the rim is shaved tighter on the bottom while the path geometry leaves
// it visible on top + sides.
const BLACK_INSET = 1.01;

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

const DEFAULT_HALO: HaloParams = {
  bloom: 3.15,
  intensity: 0.65,
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

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-background text-foreground">
      <GodRayCanvas
        className="absolute inset-0"
        markCenterFraction={MARK_CENTER}
        markWidthFraction={MARK_WIDTH_FRAC}
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

      <svg
        viewBox={AMPLO_MARK_VIEWBOX}
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${MARK_CENTER.x * 100}%`,
          top: `${MARK_CENTER.y * 100}%`,
          width: `${MARK_WIDTH_FRAC * BLACK_INSET * 100}vw`,
          height: "auto",
          transform: "translate(-50%, -50%)",
        }}
      >
        <path
          d={AMPLO_MARK_PATH}
          fill="#000"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <Toolbar />

      {/* Desktop: picker absolutely positioned so its vertical center aligns
          with the rainbow mark center (MARK_CENTER.y). */}
      <div
        className="absolute right-6 z-10 hidden lg:right-32 lg:block xl:right-48"
        style={{
          top: `${MARK_CENTER.y * 100}%`,
          transform: "translateY(-50%)",
        }}
      >
        <HeroPicker />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-start justify-end gap-12 px-6 pb-12 pt-24 lg:px-16 lg:pb-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Amplo Picker
          </h1>
          <p className="max-w-md text-base text-white/65">
            OKLCH-native, Display-P3-aware color picker for shadcn.
            Composable, accessible, gamut-aware. Drop into any Next.js +
            Tailwind&nbsp;v4 app with one CLI command.
          </p>
        </div>
        <InstallTabs
          url="https://amplo.ale.design/r/color-picker.json"
          className="w-full max-w-xl"
        />

        {/* Mobile: picker stacks below the install tabs in normal flow. */}
        <div className="w-full lg:hidden">
          <HeroPicker />
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
    <div className="fixed bottom-6 left-6 z-50 w-72 rounded-lg border border-white/10 bg-black/70 text-white shadow-xl backdrop-blur-md">
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
  return (
    <ColorPicker.Root
      value={color}
      onValueChange={setColor}
      backgroundColor="#0a0a0a"
      className="w-full max-w-[360px]"
    >
      <ColorPicker.Area mode="oklch-cl" />
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <ColorPicker.Hue />
          <ColorPicker.Alpha />
        </div>
        <ColorPicker.EyeDropper />
      </div>
      <ColorPicker.Input />
      <div className="flex items-center justify-between gap-2">
        <ColorPicker.ContrastReadout metrics={["wcag"]} />
        <ColorPicker.GamutBadge />
      </div>
      <ColorPicker.Swatches />
    </ColorPicker.Root>
  );
}

function Toolbar() {
  return (
    <div className="absolute right-6 top-6 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 backdrop-blur-md">
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
      >
        <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
        </svg>
        GitHub
      </a>
      <div className="flex items-center pl-1 pr-1.5">
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

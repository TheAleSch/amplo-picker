"use client";

// Tooltip-agnostic internals of ContrastReadout, shared by the Radix shell
// (parts/contrast-readout.tsx) and the Base UI shell
// (fill-picker-base/parts/contrast-readout.tsx). Radix and Base UI spell
// tooltip composition incompatibly (asChild vs render, delayDuration vs
// delay), so each variant owns only that wiring; everything else lives here.

import * as React from "react";
import { Check, X } from "lucide-react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";
import { CHECKERBOARD_SM } from "../lib/constants";

export type ContrastMetric = "wcag" | "apca";

export interface ContrastReadoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Which contrast metrics are available. The first entry is shown by default;
   * if more than one is provided, the readout becomes a button and the user
   * clicks it to cycle to the next metric. Defaults to ["wcag"].
   */
  metrics?: ContrastMetric[];
  /** Override the initial metric. Must be present in `metrics`. */
  defaultMetric?: ContrastMetric;
  /** Show the metric label ("WCAG" / "APCA"). Default true. */
  showLabel?: boolean;
  /** Show the numeric value (ratio / Lc). Default true. */
  showValue?: boolean;
  /** Show the pass/fail level badges (AA, AAA, body, headline, fail). Default true. */
  showBadges?: boolean;
}

const DEFAULT_METRICS: ContrastMetric[] = ["wcag"];

export interface PassRow {
  ok: boolean;
  label: string;
  detail: string;
}

export const CONTRAST_READOUT_CLASS =
  "flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs";

export function useContrastReadout({
  metrics = DEFAULT_METRICS,
  defaultMetric,
  showLabel = true,
  showValue = true,
  showBadges = true,
}: Pick<
  ContrastReadoutProps,
  "metrics" | "defaultMetric" | "showLabel" | "showValue" | "showBadges"
>) {
  // Empty metrics would leave activeMetric undefined and silently render
  // the APCA branch — treat [] as "not provided".
  if (metrics.length === 0) metrics = DEFAULT_METRICS;

  const { contrast, color, background } = useColorPickerContext();
  const fgCss = formatColor(color, "p3");
  const bgCss = formatColor(background, "p3");
  const initial =
    defaultMetric && metrics.includes(defaultMetric) ? defaultMetric : metrics[0];
  const [active, setActive] = React.useState<ContrastMetric>(initial);

  // If the parent narrows `metrics` so the stored choice is no longer
  // offered, fall back to the first option. Derived, not synced with
  // setState-during-render (which is NOT visible to the rest of the same
  // render pass): the stale stored value simply stops being used, and the
  // user's choice resurrects if the parent restores that metric.
  const activeMetric = metrics.includes(active) ? active : metrics[0];

  const togglable = metrics.length > 1;

  // Spoken summary of a metric — the ratio and pass/fail must be part of the
  // accessible name, not just the visible text the aria-label would
  // otherwise override.
  const describeMetric = (metric: ContrastMetric) =>
    metric === "wcag"
      ? `WCAG ${contrast.wcag.toFixed(2)} to 1, AA ${
          contrast.wcagLevel.aaNormal ? "pass" : "fail"
        }, AAA ${contrast.wcagLevel.aaaNormal ? "pass" : "fail"}`
      : `APCA Lc ${contrast.apca.toFixed(1)}, ${apcaLevel(contrast.apca)}`;

  const summary = describeMetric(activeMetric);
  // Announced only when the user cycles metrics — announcing every color
  // change would flood the SR queue during drags.
  const [cycleAnnouncement, setCycleAnnouncement] = React.useState("");
  const cycle = () => {
    const i = metrics.indexOf(activeMetric);
    const next = metrics[(i + 1) % metrics.length];
    setActive(next);
    setCycleAnnouncement(describeMetric(next));
  };
  const nextMetric = metrics[(metrics.indexOf(activeMetric) + 1) % metrics.length];

  const body =
    activeMetric === "wcag" ? (
      <WcagBody
        wcag={contrast.wcag}
        aa={contrast.wcagLevel.aaNormal}
        aaa={contrast.wcagLevel.aaaNormal}
        showLabel={showLabel}
        showValue={showValue}
        showBadges={showBadges}
      />
    ) : (
      <ApcaBody
        lc={contrast.apca}
        showLabel={showLabel}
        showValue={showValue}
        showBadges={showBadges}
      />
    );

  const popover =
    activeMetric === "wcag"
      ? wcagPopover(
          contrast.wcag,
          contrast.wcagLevel.aaNormal,
          contrast.wcagLevel.aaaNormal,
        )
      : apcaPopover(contrast.apca);

  return {
    active: activeMetric,
    togglable,
    nextMetric,
    summary,
    cycle,
    cycleAnnouncement,
    body,
    popover,
    fgCss,
    bgCss,
  };
}

function apcaLevel(lc: number): "headline" | "body" | "fail" {
  const abs = Math.abs(lc);
  return abs >= 75 ? "headline" : abs >= 60 ? "body" : "fail";
}

export function WcagBody({
  wcag,
  aa,
  aaa,
  showLabel,
  showValue,
  showBadges,
}: {
  wcag: number;
  aa: boolean;
  aaa: boolean;
  showLabel: boolean;
  showValue: boolean;
  showBadges: boolean;
}) {
  return (
    <>
      {(showLabel || showValue) && (
        <div className="flex items-center gap-1.5">
          {showLabel && <span className="text-muted-foreground">WCAG</span>}
          {showValue && (
            <span className="font-mono font-medium">{wcag.toFixed(2)}:1</span>
          )}
        </div>
      )}
      {showBadges && (
        <div className="flex items-center gap-1">
          <Badge ok={aa}>AA</Badge>
          <Badge ok={aaa}>AAA</Badge>
        </div>
      )}
    </>
  );
}

export function ApcaBody({
  lc,
  showLabel,
  showValue,
  showBadges,
}: {
  lc: number;
  showLabel: boolean;
  showValue: boolean;
  showBadges: boolean;
}) {
  const level = apcaLevel(lc);
  return (
    <>
      {(showLabel || showValue) && (
        <div className="flex items-center gap-1.5">
          {showLabel && <span className="text-muted-foreground">APCA</span>}
          {showValue && (
            <span className="font-mono font-medium">Lc {lc.toFixed(1)}</span>
          )}
        </div>
      )}
      {showBadges && (
        <div className="flex items-center gap-1">
          <Badge ok={level !== "fail"}>
            {level === "headline" ? "headline" : level === "body" ? "body" : "fail"}
          </Badge>
        </div>
      )}
    </>
  );
}

function Badge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-label={typeof children === "string" ? `${children} ${ok ? "passes" : "fails"}` : undefined}
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        ok
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/15 text-red-700 dark:text-red-400",
      )}
    >
      {children}
    </span>
  );
}

export function ContrastPopoverPanel({
  title,
  rows,
  fg,
  bg,
  footer,
}: {
  title: string;
  rows: PassRow[];
  fg: string;
  bg: string;
  footer?: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <div
          aria-hidden
          className="flex shrink-0 overflow-hidden rounded border border-border"
          title={`fg ${fg} on bg ${bg}`}
        >
          <Chip color={fg} />
          <Chip color={bg} />
        </div>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full",
                r.ok
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400",
              )}
            >
              {r.ok ? <Check className="size-2.5" /> : <X className="size-2.5" />}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium leading-tight">{r.label}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {r.detail}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {footer && (
        <div className="border-t border-border pt-1.5 text-[11px] text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

function Chip({ color }: { color: string }) {
  return (
    <span
      className="block size-4"
      style={{ backgroundImage: CHECKERBOARD_SM, backgroundSize: "8px 8px" }}
    >
      <span className="block size-full" style={{ background: color }} />
    </span>
  );
}

export function wcagPopover(
  ratio: number,
  aa: boolean,
  aaa: boolean,
): { title: string; rows: PassRow[] } {
  return {
    title: `WCAG ${ratio.toFixed(2)}:1`,
    rows: [
      {
        ok: aa,
        label: aa ? "Passes AA" : "Fails AA",
        detail: "Body text needs ≥ 4.5:1",
      },
      {
        ok: aaa,
        label: aaa ? "Passes AAA" : "Fails AAA",
        detail: "Enhanced body text needs ≥ 7:1",
      },
    ],
  };
}

export function apcaPopover(lc: number): { title: string; rows: PassRow[] } {
  const abs = Math.abs(lc);
  const passesBody = abs >= 60;
  const passesHeadline = abs >= 75;
  return {
    title: `APCA Lc ${lc.toFixed(1)}`,
    rows: [
      {
        ok: passesBody,
        label: passesBody ? "Passes body text" : "Fails body text",
        detail: "Body text needs |Lc| ≥ 60",
      },
      {
        ok: passesHeadline,
        label: passesHeadline ? "Passes headlines" : "Fails headlines",
        detail: "Headline / large text needs |Lc| ≥ 75",
      },
    ],
  };
}

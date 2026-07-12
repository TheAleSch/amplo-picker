"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface PassRow {
  ok: boolean;
  label: string;
  detail: string;
}

export const ContrastReadout = React.forwardRef<HTMLDivElement, ContrastReadoutProps>(
  function ContrastReadout(
    {
      metrics = DEFAULT_METRICS,
      defaultMetric,
      showLabel = true,
      showValue = true,
      showBadges = true,
      className,
      ...rest
    },
    ref,
  ) {
    const { contrast, color, background } = useColorPickerContext();
    const fgCss = formatColor(color, "p3");
    const bgCss = formatColor(background, "p3");
    const initial =
      defaultMetric && metrics.includes(defaultMetric) ? defaultMetric : metrics[0];
    const [active, setActive] = React.useState<ContrastMetric>(initial);

    // If the parent narrows `metrics` so the previously-active option is no
    // longer offered, fall back to the first one. Adjusting state during
    // rendering — no useEffect needed; React re-renders synchronously and the
    // updated state is visible to the rest of this render pass.
    if (!metrics.includes(active)) {
      setActive(metrics[0]);
    }

    const togglable = metrics.length > 1;
    // Spoken summary of the active metric — the ratio and pass/fail must be
    // part of the accessible name, not just the visible text the aria-label
    // would otherwise override.
    const summary =
      active === "wcag"
        ? `WCAG ${contrast.wcag.toFixed(2)} to 1, AA ${
            contrast.wcagLevel.aaNormal ? "pass" : "fail"
          }, AAA ${contrast.wcagLevel.aaaNormal ? "pass" : "fail"}`
        : `APCA Lc ${contrast.apca.toFixed(1)}, ${apcaLevel(contrast.apca)}`;
    // Announced only when the user cycles metrics — announcing every color
    // change would flood the SR queue during drags.
    const [cycleAnnouncement, setCycleAnnouncement] = React.useState("");
    const cycle = () => {
      const i = metrics.indexOf(active);
      const next = metrics[(i + 1) % metrics.length];
      setActive(next);
      setCycleAnnouncement(
        next === "wcag"
          ? `WCAG ${contrast.wcag.toFixed(2)} to 1, AA ${
              contrast.wcagLevel.aaNormal ? "pass" : "fail"
            }, AAA ${contrast.wcagLevel.aaaNormal ? "pass" : "fail"}`
          : `APCA Lc ${contrast.apca.toFixed(1)}, ${apcaLevel(contrast.apca)}`,
      );
    };

    const baseClass =
      "flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-xs";

    const body =
      active === "wcag" ? (
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
      active === "wcag"
        ? wcagPopover(
            contrast.wcag,
            contrast.wcagLevel.aaNormal,
            contrast.wcagLevel.aaaNormal,
          )
        : apcaPopover(contrast.apca);

    if (togglable) {
      const nextMetric = metrics[(metrics.indexOf(active) + 1) % metrics.length];
      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={ref as React.Ref<HTMLButtonElement>}
                data-slot="color-picker-contrast-readout"
                type="button"
                onClick={cycle}
                aria-label={`Contrast: ${summary}. Click to switch to ${nextMetric.toUpperCase()}.`}
                className={cn(
                  baseClass,
                  "cursor-pointer text-left motion-safe:transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  className,
                )}
                {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
              >
                {body}
                <span aria-hidden="true" className="ml-auto text-muted-foreground">⇅</span>
                <span aria-live="polite" className="sr-only">
                  {cycleAnnouncement}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="max-w-[260px] bg-popover p-2.5 text-popover-foreground shadow-md"
            >
              <PopoverPanel
                title={popover.title}
                rows={popover.rows}
                fg={fgCss}
                bg={bgCss}
                footer={`Click to switch to ${nextMetric.toUpperCase()}`}
              />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              ref={ref}
              data-slot="color-picker-contrast-readout"
              role="group"
              tabIndex={0}
              aria-label={`Contrast against background: ${summary}`}
              className={cn(
                baseClass,
                "cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring",
                className,
              )}
              {...rest}
            >
              {body}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-[260px] bg-popover p-2.5 text-popover-foreground shadow-md"
          >
            <PopoverPanel
              title={popover.title}
              rows={popover.rows}
              fg={fgCss}
              bg={bgCss}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);

function apcaLevel(lc: number): "headline" | "body" | "fail" {
  const abs = Math.abs(lc);
  return abs >= 75 ? "headline" : abs >= 60 ? "body" : "fail";
}

function WcagBody({
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

function ApcaBody({
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

function PopoverPanel({
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

function wcagPopover(
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

function apcaPopover(lc: number): { title: string; rows: PassRow[] } {
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

"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
    const { contrast } = useColorPickerContext();
    const initial =
      defaultMetric && metrics.includes(defaultMetric) ? defaultMetric : metrics[0];
    const [active, setActive] = React.useState<ContrastMetric>(initial);

    React.useEffect(() => {
      if (!metrics.includes(active)) setActive(metrics[0]);
    }, [metrics, active]);

    const togglable = metrics.length > 1;
    const cycle = () => {
      const i = metrics.indexOf(active);
      setActive(metrics[(i + 1) % metrics.length]);
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

    if (togglable) {
      const nextMetric = metrics[(metrics.indexOf(active) + 1) % metrics.length];
      return (
        <TooltipProvider delayDuration={150}>
          <button
            ref={ref as React.Ref<HTMLButtonElement>}
            data-slot="color-picker-contrast-readout"
            type="button"
            onClick={cycle}
            aria-label={`Contrast (${active.toUpperCase()}). Click to switch to ${nextMetric.toUpperCase()}.`}
            className={cn(
              baseClass,
              "cursor-pointer text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
            {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            {body}
            <Tooltip>
              <TooltipTrigger asChild>
                <span aria-hidden="true" className="ml-auto text-muted-foreground">⇅</span>
              </TooltipTrigger>
              <TooltipContent>Switch to {nextMetric.toUpperCase()}</TooltipContent>
            </Tooltip>
          </button>
        </TooltipProvider>
      );
    }

    return (
      <TooltipProvider delayDuration={150}>
        <div
          ref={ref}
          data-slot="color-picker-contrast-readout"
          role="group"
          aria-label="Contrast against background"
          className={cn(baseClass, className)}
          {...rest}
        >
          {body}
        </div>
      </TooltipProvider>
    );
  },
);

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
          <Badge
            ok={aa}
            tooltip={
              aa
                ? "Passes WCAG AA — readable for body text (contrast ≥ 4.5:1)"
                : "Fails WCAG AA — body text needs contrast ≥ 4.5:1"
            }
          >
            AA
          </Badge>
          <Badge
            ok={aaa}
            tooltip={
              aaa
                ? "Passes WCAG AAA — enhanced contrast for body text (≥ 7:1)"
                : "Fails WCAG AAA — enhanced contrast for body text needs ≥ 7:1"
            }
          >
            AAA
          </Badge>
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
  const abs = Math.abs(lc);
  const level: "fail" | "body" | "headline" =
    abs >= 75 ? "headline" : abs >= 60 ? "body" : "fail";
  const tooltip =
    level === "headline"
      ? "Passes APCA for headlines and large text (|Lc| ≥ 75)"
      : level === "body"
        ? "Passes APCA for body text (|Lc| ≥ 60). Not strong enough for headlines (needs ≥ 75)."
        : "Fails APCA — body text needs |Lc| ≥ 60";
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
          <Badge ok={level !== "fail"} tooltip={tooltip}>
            {level === "headline" ? "headline" : level === "body" ? "body" : "fail"}
          </Badge>
        </div>
      )}
    </>
  );
}

function Badge({
  ok,
  tooltip,
  children,
}: {
  ok: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  const span = (
    <span
      tabIndex={tooltip ? 0 : undefined}
      aria-label={typeof children === "string" ? `${children} ${ok ? "passes" : "fails"}` : undefined}
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider outline-none focus-visible:ring-1 focus-visible:ring-ring",
        ok
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/15 text-red-700 dark:text-red-400",
      )}
    >
      {children}
    </span>
  );
  if (!tooltip) return span;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{span}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

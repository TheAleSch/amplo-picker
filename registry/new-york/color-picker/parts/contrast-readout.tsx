"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
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
}

const DEFAULT_METRICS: ContrastMetric[] = ["wcag"];

export const ContrastReadout = React.forwardRef<HTMLDivElement, ContrastReadoutProps>(
  function ContrastReadout(
    { metrics = DEFAULT_METRICS, defaultMetric, className, ...rest },
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
        <WcagBody wcag={contrast.wcag} aa={contrast.wcagLevel.aaNormal} aaa={contrast.wcagLevel.aaaNormal} />
      ) : (
        <ApcaBody lc={contrast.apca} />
      );

    if (togglable) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={cycle}
          aria-label={`Contrast (${active.toUpperCase()}). Click to switch.`}
          className={cn(
            baseClass,
            "cursor-pointer text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {body}
          <span aria-hidden="true" className="ml-auto text-muted-foreground">⇅</span>
        </button>
      );
    }

    return (
      <div
        ref={ref}
        role="group"
        aria-label="Contrast against background"
        className={cn(baseClass, className)}
        {...rest}
      >
        {body}
      </div>
    );
  },
);

function WcagBody({ wcag, aa, aaa }: { wcag: number; aa: boolean; aaa: boolean }) {
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">WCAG</span>
        <span className="font-mono font-medium">{wcag.toFixed(2)}:1</span>
      </div>
      <div className="flex items-center gap-1">
        <Badge ok={aa}>AA</Badge>
        <Badge ok={aaa}>AAA</Badge>
      </div>
    </>
  );
}

function ApcaBody({ lc }: { lc: number }) {
  const abs = Math.abs(lc);
  const level: "fail" | "body" | "headline" =
    abs >= 75 ? "headline" : abs >= 60 ? "body" : "fail";
  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">APCA</span>
        <span className="font-mono font-medium">Lc {lc.toFixed(1)}</span>
      </div>
      <div className="flex items-center gap-1">
        <Badge ok={level !== "fail"}>{level === "headline" ? "headline" : level === "body" ? "body" : "fail"}</Badge>
      </div>
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
          : "bg-destructive/15 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

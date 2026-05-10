"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatColor } from "../../lib/color";

export const StopList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function StopList({ className, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  return (
    <div
      ref={ref}
      data-slot="gradient-stop-list"
      role="listbox"
      aria-label="Gradient stops"
      className={cn("flex flex-col gap-1", className)}
      {...rest}
    >
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        return (
          <div
            key={s.id}
            role="option"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-selected={selected}
            onClick={() => ctx.selectStop(s.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                ctx.selectStop(s.id);
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                ctx.removeStop(s.id);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border p-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-foreground" : "border-border",
            )}
          >
            <span
              aria-hidden
              className="size-5 rounded border border-border"
              style={{ background: formatColor(s.color, "hex") }}
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={Math.round(s.position * 100)}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (Number.isFinite(v)) ctx.moveStop(s.id, v / 100);
              }}
              className="h-7 w-14 rounded border border-border bg-background px-1 text-right"
              aria-label="Stop position"
            />
            <span className="text-muted-foreground">%</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ctx.removeStop(s.id);
              }}
              disabled={ctx.stops.length <= 1}
              className="ml-auto inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Remove stop"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
});

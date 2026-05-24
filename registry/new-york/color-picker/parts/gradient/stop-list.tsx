"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  projectStopPosition,
  reverseProjectStopPosition,
  sampleStopsAt,
} from "../../lib/gradient";
import { formatColor } from "../../lib/color";
import { ColorPickerContext } from "../../context";
import { useColorPicker } from "../../hooks/use-color-picker";
import type { OklchColor } from "../../lib/types";
import { Area as ColorArea } from "../area";
import { Hue } from "../hue";
import { Alpha } from "../alpha";
import { ChannelInput } from "../channel-input";
import { FormatSwitcher } from "../format-switcher";
import { EyeDropper } from "../eye-dropper";
import {
  FieldInput,
  FieldInputGroup,
  FieldShell,
  FieldSuffix,
} from "../field";

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><rect width='4' height='4' fill='%23ccc'/><rect x='4' y='4' width='4' height='4' fill='%23ccc'/></svg>\")";

/**
 * Inline binding helper: mounts a `ColorPickerContext` for a specific
 * stop id, identical to `<GradientPicker.StopColor>` but bound to the
 * stop the user just clicked in the row (not necessarily the selected
 * one). Keyed on `stopId` by callers so a fresh hook instance — and a
 * fresh `lastGoodHueRef` — is created per popover open.
 */
function StopColorEditor({
  stopId,
  color,
  children,
}: React.PropsWithChildren<{ stopId: string; color: OklchColor }>) {
  const ctx = useGradientPickerContext();
  const setStopColorRef = React.useRef(ctx.setStopColor);
  setStopColorRef.current = ctx.setStopColor;
  const onValueChange = React.useCallback(
    (c: OklchColor) => setStopColorRef.current(stopId, c),
    [stopId],
  );
  const state = useColorPicker({ value: color, onValueChange });
  return (
    <ColorPickerContext.Provider value={state}>
      {children}
    </ColorPickerContext.Provider>
  );
}

export interface StopListProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Render a trailing "+ Add stop" row that inserts a new stop in the
   * largest gap between adjacent stops, sampling the gradient's existing
   * ramp at that position so the new color blends in. Defaults to `false`
   * — clicking on `<GradientPicker.Bar>` is the canonical add-stop UI;
   * this is an explicit affordance for layouts where the bar isn't visible.
   */
  showAddStop?: boolean;
}

export const StopList = React.forwardRef<HTMLDivElement, StopListProps>(
  function StopList({ className, showAddStop = true, ...rest }, ref) {
  const ctx = useGradientPickerContext();
  // Mirror the Bar's projection: when the gradient is a positioned linear,
  // show + edit the *visible* position so this list matches what the user
  // sees in the Area and Bar. Authored positions still live in 0..1 of the
  // [start, end] segment; we convert at the edges.
  const linear = ctx.gradient.type === "linear" ? ctx.gradient : null;
  const start = linear?.start;
  const end = linear?.end;
  const toDisplay = (authored: number) =>
    projectStopPosition(authored, start, end);
  const fromDisplay = (displayed: number) =>
    reverseProjectStopPosition(displayed, start, end);

  const handleAddStop = () => {
    // Insert immediately after the selected stop — halfway to its next
    // neighbor, or halfway to the end of the bar when the selected stop
    // is the last one. Sample the existing ramp so the inserted color
    // visually blends in.
    const sorted = [...ctx.stops].sort((a, b) => a.position - b.position);
    const selectedIdx = sorted.findIndex(
      (x) => x.id === ctx.selectedStopId,
    );
    const anchorIdx = selectedIdx === -1 ? sorted.length - 1 : selectedIdx;
    const anchor = sorted[anchorIdx];
    const next = sorted[anchorIdx + 1];
    const position = next
      ? (anchor.position + next.position) / 2
      : Math.min(1, (anchor.position + 1) / 2);
    const id = ctx.addStop(position, sampleStopsAt(sorted, position));
    ctx.selectStop(id);
  };
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
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  // Layered swatch: actual stop color (alpha intact) on top
                  // of a small-scale checkerboard so transparency reads.
                  // Clicking opens a full ColorPicker popover bound to this
                  // specific stop — not necessarily the currently selected
                  // one, so users can edit any stop without first selecting
                  // it. `e.stopPropagation()` prevents the row click from
                  // double-firing `selectStop`.
                  onClick={(e) => {
                    e.stopPropagation();
                    ctx.selectStop(s.id);
                  }}
                  aria-label="Edit stop color"
                  style={{
                    backgroundImage: `linear-gradient(${formatColor(s.color, "oklch")}, ${formatColor(s.color, "oklch")}), ${CHECKERBOARD}`,
                    backgroundSize: "auto, 6px 6px",
                  }}
                  className="size-7 shrink-0 rounded-xs border border-border outline-none transition-shadow hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </PopoverTrigger>
              <PopoverContent
                className="flex w-72 flex-col gap-3 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <StopColorEditor key={s.id} stopId={s.id} color={s.color}>
                  <ColorArea mode="oklch-cl" />
                  <div className="flex flex-col gap-1.5">
                    <Hue />
                    <Alpha />
                  </div>
                  <div className="flex items-center gap-2">
                    <FormatSwitcher className="flex-1" />
                    <EyeDropper className="h-8 w-full flex-1" />
                  </div>
                  <ChannelInput showFormat={false} />
                </StopColorEditor>
              </PopoverContent>
            </Popover>
            <FieldShell className="h-7 w-fit">
              <FieldInputGroup>
                <span className="sr-only">Stop position</span>
                <FieldInput
                  inputMode="numeric"
                  value={Math.round(toDisplay(s.position) * 100)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v))
                      ctx.moveStop(s.id, fromDisplay(v / 100));
                  }}
                  aria-label="Stop position"
                  className="w-10"
                />
                <FieldSuffix>%</FieldSuffix>
              </FieldInputGroup>
            </FieldShell>
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
              <Minus className="size-3.5" />
            </button>
          </div>
        );
      })}
      {showAddStop && (
        <Button
          type="button"
          variant="outline"
          onClick={handleAddStop}
          aria-label="Add stop"
          className="h-8 cursor-pointer font-mono text-xs tracking-wide shadow-xs"
        >
          <Plus aria-hidden className="size-3.5" />
          Add stop
        </Button>
      )}
    </div>
  );
});

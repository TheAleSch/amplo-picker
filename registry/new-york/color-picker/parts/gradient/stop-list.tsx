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
import { formatColor, parseColor } from "../../lib/color";
import { ColorPickerContext } from "../../context";
import { useColorPicker } from "../../hooks/use-color-picker";
import type { ColorFormat } from "../../lib/types";
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

export interface StopListProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Render a trailing "+ Add stop" row that inserts a new stop in the
   * largest gap between adjacent stops, sampling the gradient's existing
   * ramp at that position so the new color blends in. Defaults to `false`
   * — clicking on `<GradientPicker.Bar>` is the canonical add-stop UI;
   * this is an explicit affordance for layouts where the bar isn't visible.
   */
  showAddStop?: boolean;
  /**
   * Format used by the inline color text input on each row. Defaults to
   * `oklch` — lossless across the full P3/Rec.2020 gamut that stop colors
   * can occupy. Pasting any CSS color string still parses regardless of
   * this setting (parser is format-agnostic); this only controls what
   * the field *displays*.
   */
  colorFormat?: ColorFormat;
}

export const StopList = React.forwardRef<HTMLDivElement, StopListProps>(
  function StopList(
    { className, showAddStop = true, colorFormat = "oklch", ...rest },
    ref,
  ) {
  const ctx = useGradientPickerContext();
  // Single shared format for every row. The FormatSwitcher inside the
  // (single, selected-stop-bound) popover writes here too — picking P3
  // updates the inline color text of every row to P3 simultaneously,
  // keeping the list visually consistent.
  const [sharedFormat, setSharedFormat] =
    React.useState<ColorFormat>(colorFormat);
  // Resolve the currently-selected stop (the one any open popover edits).
  // Falls back to the first stop when nothing is selected yet.
  const selectedStop =
    ctx.stops.find((x) => x.id === ctx.selectedStopId) ?? ctx.stops[0];
  // One useColorPicker for the whole list, bound to the selected stop.
  // Closing+reopening the popover for the same stop is safe — stops are
  // stored as OklchColor objects (hue preserved across achromatic edges),
  // so `lastGoodHueRef` is just an intra-drag optimization here.
  const colorState = useColorPicker({
    value: selectedStop?.color,
    onValueChange: (c) => {
      if (selectedStop) ctx.setStopColor(selectedStop.id, c);
    },
    format: sharedFormat,
    onFormatChange: setSharedFormat,
  });
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
    const prev = sorted[anchorIdx - 1];
    // When the selected stop is the last one, fall back to inserting
    // *between* it and the previous neighbor — so a quick add doesn't
    // squeeze a new stop into the gap between the last stop and the
    // bar's end (often near-zero) and instead lands somewhere visible.
    const position = next
      ? (anchor.position + next.position) / 2
      : prev
        ? (prev.position + anchor.position) / 2
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
      <ColorPickerContext.Provider value={colorState}>
        {ctx.stops.map((s) => {
          const selected = s.id === ctx.selectedStopId;
          return (
            <StopRow
              key={s.id}
              stop={s}
              selected={selected}
              toDisplay={toDisplay}
              fromDisplay={fromDisplay}
              formatted={formatColor(s.color, sharedFormat)}
            />
          );
        })}
      </ColorPickerContext.Provider>
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

function StopRow({
  stop: s,
  selected,
  toDisplay,
  fromDisplay,
  formatted,
}: {
  stop: ReturnType<typeof useGradientPickerContext>["stops"][number];
  selected: boolean;
  toDisplay: (n: number) => number;
  fromDisplay: (n: number) => number;
  formatted: string;
}) {
  const ctx = useGradientPickerContext();
  const [draft, setDraft] = React.useState(formatted);
  const focusedRef = React.useRef(false);
  React.useEffect(() => {
    if (!focusedRef.current) setDraft(formatted);
  }, [formatted]);
  const commitDraft = (raw: string) => {
    const parsed = parseColor(raw.trim());
    if (parsed) ctx.setStopColor(s.id, parsed);
    else setDraft(formatted);
  };
  return (
    <div
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
      <FieldShell className="h-7 min-w-0 flex-1">
        <FieldInputGroup>
          <span className="sr-only">Stop color (paste hex / css)</span>
          <FieldInput
            value={draft}
            spellCheck={false}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => {
              focusedRef.current = false;
              commitDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(formatted);
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label="Stop color value"
            className="text-left"
          />
        </FieldInputGroup>
      </FieldShell>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ctx.removeStop(s.id);
        }}
        disabled={ctx.stops.length <= 1}
        className="inline-flex size-7 items-center justify-center rounded-md border border-input text-muted-foreground shadow-xs hover:text-foreground disabled:opacity-30"
        aria-label="Remove stop"
      >
        <Minus className="size-3.5" />
      </button>
    </div>
  );
}

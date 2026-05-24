"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import {
  projectStopPosition,
  reverseProjectStopPosition,
  sampleStopsAt,
} from "../../lib/gradient";
import { formatColor, parseColor } from "../../lib/color";
import { StopEditorPopover } from "./stop-editor-popover";
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
}

export const StopList = React.forwardRef<HTMLDivElement, StopListProps>(
  function StopList(
    { className, showAddStop = true, ...rest },
    ref,
  ) {
  const ctx = useGradientPickerContext();
  // Each row mounts its own <StopEditorPopover> (bound to that row's stop)
  // so opening any popover edits the right stop directly — no need for a
  // list-wide ColorPicker context.
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
      {ctx.stops.map((s) => {
        const selected = s.id === ctx.selectedStopId;
        return (
          <StopRow
            key={s.id}
            stop={s}
            selected={selected}
            toDisplay={toDisplay}
            fromDisplay={fromDisplay}
            formatted={formatColor(s.color, ctx.getStopColorFormat(s.id))}
          />
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
      <StopEditorPopover stopId={s.id}>
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
      </StopEditorPopover>
      <FieldShell className="h-7 w-fit">
        <FieldInputGroup>
          <span className="sr-only">Stop position</span>
          <FieldInput
            inputMode="numeric"
            nudge={1}
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

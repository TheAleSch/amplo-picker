"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "@/registry/new-york/color-picker/contexts/gradient";
import {
  projectStopPosition,
  reverseProjectStopPosition,
} from "@/registry/new-york/color-picker/lib/gradient";
import {
  focusNeighborOption,
  insertStopAfterSelected,
  isEventFromRowControl,
  stopListKeyNav,
} from "@/registry/new-york/color-picker/parts/gradient/stop-list-shared";
import { formatColor, parseColor } from "@/registry/new-york/color-picker/lib/color";
// Shared stop-color-edit popover, reused as-is. It builds on a small
// self-contained Base UI popover (StopPopover), not the consumer's
// `@/components/ui/popover` — so it renders identically in the Base UI and
// Radix variants with no per-variant fork.
import { StopEditorPopover } from "@/registry/new-york/color-picker/parts/gradient/stop-editor-popover";
import { CHECKERBOARD_SM } from "@/registry/new-york/color-picker/lib/constants";
import {
  FieldInput,
  FieldInputGroup,
  FieldShell,
  FieldSuffix,
} from "./field";

export interface StopListProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Render a trailing "+ Add stop" row that inserts a new stop in the
   * largest gap between adjacent stops, sampling the gradient's existing
   * ramp at that position so the new color blends in. Defaults to `true`.
   * Set `false` to hide it when `<GradientPickerBase.Bar>` (the canonical
   * add-stop UI) is visible and the trailing row would be redundant.
   */
  showAddStop?: boolean;
}

export const StopList = React.forwardRef<HTMLDivElement, StopListProps>(
  function StopList({ className, showAddStop = true, ...rest }, ref) {
    const ctx = useGradientPickerContext();
    // Each row mounts its own <StopEditorPopover> (bound to that row's stop)
    // so opening any popover edits the right stop directly — no need for a
    // list-wide ColorPicker context.
    const linear = ctx.gradient.type === "linear" ? ctx.gradient : null;
    const start = linear?.start;
    const end = linear?.end;
    const toDisplay = (authored: number) =>
      projectStopPosition(authored, start, end);
    const fromDisplay = (displayed: number) =>
      reverseProjectStopPosition(displayed, start, end);

    const handleAddStop = () => {
      const { position, color } = insertStopAfterSelected(
        ctx.stops,
        ctx.selectedStopId,
      );
      const id = ctx.addStop(position, color);
      ctx.selectStop(id);
    };
    return (
      <div
        ref={ref}
        data-slot="gradient-stop-list"
        role="listbox"
        aria-label="Gradient stops"
        onKeyDown={stopListKeyNav}
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
  },
);

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
  const [open, setOpen] = React.useState(false);
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
        // Only when the option row itself is focused — keys typed into the
        // nested inputs (e.g. Backspace while editing the color text) must
        // never trigger row shortcuts.
        if (isEventFromRowControl(e)) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ctx.selectStop(s.id);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          // Focus the neighbor before removal so focus stays in the list.
          focusNeighborOption(e.currentTarget);
          ctx.removeStop(s.id);
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border p-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-foreground" : "border-border",
      )}
    >
      <StopEditorPopover stopId={s.id} open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ctx.selectStop(s.id);
            setOpen((o) => !o);
          }}
          aria-label="Edit stop color"
          style={{
            backgroundImage: `linear-gradient(${formatColor(s.color, "oklch")}, ${formatColor(s.color, "oklch")}), ${CHECKERBOARD_SM}`,
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
              // Clamp the typed *displayed* percent to the track; moveStop
              // itself no longer clamps (extrapolated stops are legal).
              if (Number.isFinite(v))
                ctx.moveStop(
                  s.id,
                  fromDisplay(Math.max(0, Math.min(1, v / 100))),
                );
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
          const row = e.currentTarget.closest<HTMLElement>('[role="option"]');
          if (row) focusNeighborOption(row);
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

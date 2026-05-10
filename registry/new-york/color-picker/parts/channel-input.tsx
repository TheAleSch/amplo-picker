"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { parseColor } from "../lib/color";
import {
  colorChannels,
  setColorChannel,
  type ChannelDescriptor,
} from "../lib/channels";
import type { ColorFormat } from "../lib/types";
import { cn } from "@/lib/utils";

export interface ChannelInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Override the formats from <ColorPicker.Root formats={...}>. */
  formats?: ColorFormat[];
  /** Hide the inline format selector — useful when pairing with a
   * standalone <FormatSwitcher /> elsewhere in the layout. */
  showFormat?: boolean;
}

/**
 * Photoshop-style multi-field input: format selector on the left, one numeric
 * field per channel, alpha as %. For `hex` falls back to a single text field
 * (no meaningful per-channel breakdown). Pasting any CSS color string into any
 * field parses it and replaces the whole color.
 */
export const ChannelInput = React.forwardRef<
  HTMLDivElement,
  ChannelInputProps
>(function ChannelInput(
  { formats: formatsProp, showFormat = true, className, ...rest },
  ref,
) {
  const {
    color,
    format,
    formatted,
    setFormat,
    setColor,
    setFromString,
    formats: ctxFormats,
  } = useColorPickerContext();
  const formats = formatsProp ?? ctxFormats;

  const channels = React.useMemo(
    () => colorChannels(color, format),
    [color, format],
  );

  const handleChannelChange = (key: string, value: number) => {
    setColor(setColorChannel(color, format, key, value));
  };

  return (
    <div
      ref={ref}
      data-slot="color-picker-channel-input"
      className={cn(
        "flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-transparent font-mono text-xs shadow-xs",
        "focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
      {...rest}
    >
      {showFormat && (
        <>
          <FormatSelect format={format} formats={formats} onChange={setFormat} />
          <Divider />
        </>
      )}
      {format === "hex" ? (
        <HexField value={formatted} onCommit={setFromString} />
      ) : (
        channels.map((ch, i) => (
          <React.Fragment key={ch.key}>
            <ChannelField
              channel={ch}
              onChange={(v) => handleChannelChange(ch.key, v)}
              onPasteColor={setFromString}
            />
            {i < channels.length - 1 && <Divider />}
          </React.Fragment>
        ))
      )}
    </div>
  );
});

/* ────────────────────── Format select ────────────────────── */

function FormatSelect({
  format,
  formats,
  onChange,
}: {
  format: ColorFormat;
  formats: ColorFormat[];
  onChange: (next: ColorFormat) => void;
}) {
  return (
    <div className="relative inline-flex shrink-0 items-center">
      <select
        data-slot="color-picker-channel-input-format"
        aria-label="Color format"
        value={format}
        onChange={(e) => onChange(e.target.value as ColorFormat)}
        className="h-full appearance-none bg-transparent pl-2 pr-5 font-mono text-xs uppercase tracking-wide outline-none"
      >
        {formats.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-1.5 size-3 text-muted-foreground"
      >
        <path
          d="M3 4.5l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ────────────────────── Hex single field ────────────────────── */

function HexField({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => boolean;
}) {
  // Adjusting state during rendering — React-blessed alternative to
  // syncing prop → state in useEffect. When the upstream `value` changes
  // (e.g., a sibling control commits), we re-seed the draft synchronously
  // *during* the render that observes the change, not after a paint.
  const [draft, setDraft] = React.useState(value);
  const [prevValue, setPrevValue] = React.useState(value);
  const [error, setError] = React.useState(false);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
    setError(false);
  }

  const commit = (v: string) => {
    const ok = onCommit(v.trim());
    setError(!ok);
  };

  return (
    <input
      data-slot="color-picker-channel-input-field"
      type="text"
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      aria-label="Hex value"
      aria-invalid={error || undefined}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setError(false);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          setDraft(value);
          setError(false);
        }
      }}
      className={cn(
        "min-w-0 flex-1 bg-transparent px-2 outline-none",
        error && "text-destructive",
      )}
    />
  );
}

/* ────────────────────── Numeric channel field ────────────────────── */

function ChannelField({
  channel,
  onChange,
  onPasteColor,
}: {
  channel: ChannelDescriptor;
  onChange: (next: number) => void;
  onPasteColor: (raw: string) => boolean;
}) {
  const display = formatNumber(channel.value, channel.precision);
  // Sync draft when external state updates (slider drag, sibling channel,
  // format swap) using the in-render adjustment pattern. Comparing formatted
  // strings avoids clobbering an in-progress edit when the canonical value
  // rounds to the same display string.
  const [draft, setDraft] = React.useState(display);
  const [prevDisplay, setPrevDisplay] = React.useState(display);
  if (display !== prevDisplay) {
    setPrevDisplay(display);
    setDraft(display);
  }

  const commit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) {
      setDraft(display);
      return;
    }
    onChange(parsed);
  };

  const step = (delta: number) => {
    const parsed = parseFloat(draft);
    const base = Number.isNaN(parsed) ? channel.value : parsed;
    onChange(base + delta);
  };

  return (
    <label className="relative inline-flex h-full min-w-0 flex-1 items-center">
      <span className="sr-only">{channel.label}</span>
      <input
        data-slot="color-picker-channel-input-field"
        type="text"
        inputMode="decimal"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-label={channel.label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onPaste={(e) => {
          const text = e.clipboardData?.getData("text") ?? "";
          if (parseColor(text.trim())) {
            e.preventDefault();
            onPasteColor(text);
          }
        }}
        onKeyDown={(e) => {
          const big = e.shiftKey ? channel.bigStep : channel.step;
          if (e.key === "ArrowUp") {
            e.preventDefault();
            step(big);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step(-big);
          } else if (e.key === "Enter") {
            e.preventDefault();
            commit(e.currentTarget.value);
          } else if (e.key === "Escape") {
            setDraft(display);
          }
        }}
        className="w-full min-w-0 bg-transparent px-1.5 text-center outline-none tabular-nums"
      />
      {channel.suffix && (
        <span
          aria-hidden
          className="pointer-events-none pr-1.5 text-muted-foreground"
        >
          {channel.suffix}
        </span>
      )}
    </label>
  );
}

/* ────────────────────── Helpers ────────────────────── */

function Divider() {
  return <div aria-hidden className="w-px self-stretch bg-border" />;
}

function formatNumber(value: number, precision: number): string {
  return precision === 0 ? String(Math.round(value)) : value.toFixed(precision);
}

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
import {
  FieldDivider,
  FieldInput,
  FieldInputGroup,
  FieldSelect,
  FieldShell,
  FieldSuffix,
} from "./field";

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
 *
 * Built on the shared field primitives in `./field` so every text input in
 * the package shares the same border, focus ring, and chevron.
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
    <FieldShell
      ref={ref}
      data-slot="color-picker-channel-input"
      className={className}
      {...rest}
    >
      {showFormat && (
        <>
          <FieldSelect
            data-slot="color-picker-channel-input-format"
            aria-label="Color format"
            variant="inline"
            value={format}
            onChange={(e) => setFormat(e.target.value as ColorFormat)}
          >
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </FieldSelect>
          <FieldDivider />
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
            {i < channels.length - 1 && <FieldDivider />}
          </React.Fragment>
        ))
      )}
    </FieldShell>
  );
});

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
    <FieldInput
      data-slot="color-picker-channel-input-field"
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
        "flex-1 px-2 text-left",
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
    <FieldInputGroup>
      <span className="sr-only">{channel.label}</span>
      <FieldInput
        data-slot="color-picker-channel-input-field"
        inputMode="decimal"
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
      />
      {channel.suffix && <FieldSuffix>{channel.suffix}</FieldSuffix>}
    </FieldInputGroup>
  );
}

/* ────────────────────── Helpers ────────────────────── */

function formatNumber(value: number, precision: number): string {
  return precision === 0 ? String(Math.round(value)) : value.toFixed(precision);
}

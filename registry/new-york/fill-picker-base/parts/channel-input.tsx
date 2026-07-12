"use client";

import * as React from "react";
import { NumberField } from "@base-ui/react/number-field";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import { parseColor } from "@/registry/new-york/color-picker/lib/color";
import {
  colorChannels,
  setColorChannel,
  type ChannelDescriptor,
} from "@/registry/new-york/color-picker/lib/channels";
import type { ColorFormat } from "@/registry/new-york/color-picker/lib/types";
import { cn } from "@/lib/utils";

export interface ChannelInputProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  formats?: ColorFormat[];
  showFormat?: boolean;
}

/**
 * Base UI port of the Photoshop-style multi-field input, one
 * `NumberField.Root` per channel instead of a hand-rolled `<input>`.
 *
 * The original's "paste any CSS color string into any field" flow survives
 * the port: Base UI's `NumberField.Input` has its own internal `onPaste`
 * that calls `parseNumber` and bails out via `event.preventDefault()` when
 * the clipboard text isn't a plain number. Base UI merges the props we pass
 * to `NumberField.Input` *before* its internal handlers (rightmost prop set
 * wins / runs first — see `mergeProps` in `@base-ui/react/merge-props`), so
 * our own `onPaste` runs first. When the pasted text parses as a full CSS
 * color we call `setFromString` and `event.preventDefault()` ourselves,
 * which makes the internal handler's own `event.defaultPrevented` guard
 * bail out — the number field never sees the paste. Plain numeric pastes
 * (e.g. "128" into the R field) fall through untouched to Base UI's default
 * numeric paste handling.
 */
export const ChannelInput = React.forwardRef<HTMLDivElement, ChannelInputProps>(
  function ChannelInput(
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
  },
);

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
  // Kept as a plain <select> rather than Base UI's Select: this is a dense
  // inline control inside the channel-input row, and the standalone
  // FormatSwitcher part already demonstrates the Base UI Select port.
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
  // Hex has no per-channel breakdown, so it stays a plain text field — same
  // as the original — rather than a NumberField.
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

/* ────────────────────── Numeric channel field (NumberField) ────────────────────── */

function ChannelField({
  channel,
  onChange,
  onPasteColor,
}: {
  channel: ChannelDescriptor;
  onChange: (next: number) => void;
  onPasteColor: (raw: string) => boolean;
}) {
  return (
    <NumberField.Root
      value={channel.value}
      onValueChange={(v) => {
        if (v !== null) onChange(v);
      }}
      min={Number.isFinite(channel.min) ? channel.min : undefined}
      max={Number.isFinite(channel.max) ? channel.max : undefined}
      step={channel.step}
      largeStep={channel.bigStep}
      allowWheelScrub
      format={{
        maximumFractionDigits: channel.precision,
        minimumFractionDigits: channel.precision,
      }}
      className="relative inline-flex h-full min-w-0 flex-1 items-center"
    >
      <NumberField.Input
        data-slot="color-picker-channel-input-field"
        aria-label={channel.label}
        onPaste={(e) => {
          const text = e.clipboardData?.getData("text") ?? "";
          if (parseColor(text.trim())) {
            e.preventDefault();
            onPasteColor(text);
          }
          // Otherwise fall through to NumberField's own numeric paste
          // handling (it bails out on its own when `defaultPrevented`).
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
    </NumberField.Root>
  );
}

/* ────────────────────── Helpers ────────────────────── */

function Divider() {
  return <div aria-hidden className="w-px self-stretch bg-border" />;
}

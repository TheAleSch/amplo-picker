"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Bordered, h-8 shell every multi-field input inside the picker shares.
 * Visual source of truth for `<ColorPicker.ChannelInput>`, the gradient
 * angle / position / radius / ellipse-radii / stop-position inputs, and
 * both CSS-string inputs. Owning the shell here means a single edit
 * here re-themes every text input in the package.
 */
export const FieldShell = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function FieldShell({ className, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-transparent font-mono text-xs shadow-xs",
        "focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
      {...rest}
    />
  );
});

/** Vertical 1px divider between fields inside a `FieldShell`. */
export function FieldDivider() {
  return <div aria-hidden className="w-px self-stretch bg-border" />;
}

/**
 * Borderless input that lives inside a `FieldShell`. Defaults match the
 * channel-input numeric field: full width of its slot, right-aligned
 * tabular digits, transparent background. Pass `className` to override
 * per use (e.g. left-align for hex / CSS strings).
 *
 * When `nudge` is set, ↑/↓ step the numeric value by `nudge` (Shift × 10).
 * Implemented by dispatching a native input event so the consumer's
 * existing `onChange` handler runs unchanged — no parallel commit path,
 * no double validation. Non-numeric values are ignored.
 */
export interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Step amount for ↑/↓ keyboard nudge. Shift multiplies by 10. Omit
   * to disable nudge (text fields and non-numeric inputs).
   */
  nudge?: number;
}

export const FieldInput = React.forwardRef<HTMLInputElement, FieldInputProps>(
  function FieldInput({ className, type = "text", nudge, onKeyDown, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onKeyDown={(e) => {
          if (nudge && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            // Treat empty / unparseable input (e.g. RadiusInput in its
            // "auto" placeholder state) as 0 so the first arrow press
            // commits a real numeric value instead of doing nothing.
            const parsed = parseFloat(e.currentTarget.value);
            const cur = Number.isFinite(parsed) ? parsed : 0;
            const delta =
              (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? nudge * 10 : nudge);
            const next = cur + delta;
            // Use the native value setter so React's synthetic onChange
            // fires — directly assigning `.value` is swallowed by React's
            // controlled-input tracker.
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value",
            )?.set;
            setter?.call(e.currentTarget, String(next));
            e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
          }
          onKeyDown?.(e);
        }}
        className={cn(
          "w-full min-w-0 bg-transparent px-1.5 text-right outline-none tabular-nums",
          className,
        )}
        {...rest}
      />
    );
  },
);

export interface FieldDraftInputProps
  extends Omit<FieldInputProps, "value" | "defaultValue" | "onChange"> {
  /** Canonical display string; re-seeds the draft whenever it changes. */
  value: string;
  /**
   * Called with the raw draft on Enter, on blur after an edit, and on each
   * ↑/↓ nudge. The consumer parses, clamps and writes; an unparseable or
   * clamped commit just snaps the draft back to `value`.
   */
  onCommit: (raw: string) => void;
}

/**
 * `FieldInput` with a local draft: keystrokes only edit the text, and the
 * value is committed on Enter / blur (Escape reverts). Committing on every
 * keystroke makes multi-digit and decimal entry impossible when the parsed
 * prefix gets clamped or normalized ("4" of "400" wraps, "" can't be typed).
 * ↑/↓ nudges (via `nudge`) still commit immediately.
 */
export const FieldDraftInput = React.forwardRef<
  HTMLInputElement,
  FieldDraftInputProps
>(function FieldDraftInput(
  { value, onCommit, onBlur, onKeyDown, nudge, ...rest },
  ref,
) {
  const [draft, setDraft] = React.useState(value);
  const [dirty, setDirty] = React.useState(false);
  // Same in-render re-seed as `ChannelField` / `HexField`.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
    setDirty(false);
  }

  const commit = (raw: string) => {
    onCommit(raw);
    // Snap back to the canonical string. If the commit changed it, the
    // re-seed above overwrites this on the next render anyway; if it didn't
    // (clamped to the same value, unparseable), this is what clears "999".
    setDraft(value);
    setDirty(false);
  };

  return (
    <FieldInput
      ref={ref}
      nudge={nudge}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
      }}
      onBlur={(e) => {
        if (dirty) commit(e.currentTarget.value);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (dirty) commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          setDraft(value);
          setDirty(false);
        } else if (nudge && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
          // FieldInput already wrote the nudged number into the input.
          commit(e.currentTarget.value);
        }
        onKeyDown?.(e);
      }}
      {...rest}
    />
  );
});

/**
 * Flex slot that pairs a `FieldInput` with an optional `FieldSuffix`
 * (the muted `°`, `%`, `px`, `×` glyph). Renders as a `<label>` so the
 * suffix is part of the clickable hit area but doesn't steal focus.
 */
export const FieldInputGroup = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(function FieldInputGroup({ className, ...rest }, ref) {
  return (
    <label
      ref={ref}
      className={cn(
        "relative inline-flex h-full min-w-0 flex-1 items-center justify-end",
        className,
      )}
      {...rest}
    />
  );
});

/** Muted, non-interactive suffix label (°, %, px, ×). */
export const FieldSuffix = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(function FieldSuffix({ className, ...rest }, ref) {
  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none pr-1.5 text-muted-foreground",
        className,
      )}
      {...rest}
    />
  );
});

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
            const cur = parseFloat(e.currentTarget.value);
            if (Number.isFinite(cur)) {
              e.preventDefault();
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
        "relative inline-flex h-full min-w-0 flex-1 items-center",
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

export interface FieldSelectProps {
  /**
   * `standalone` (default) — bordered chevron-select matching every
   * picker dropdown (`FormatSwitcher`, `TypeSwitcher`, `InterpSwitcher`,
   * `RadialSizeSelect`).
   *
   * `inline` — borderless variant that lives inside a `FieldShell` (used
   * by `ChannelInput`'s format toggle on the left).
   */
  variant?: "standalone" | "inline";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Trigger button class — extends the variant's defaults. */
  className?: string;
  /** Props forwarded to the outer wrapper `<div>`. Use for `data-slot`,
   *  width overrides, etc. */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement> & {
    [key: `data-${string}`]: string | undefined;
  };
  /**
   * Class applied to the popover `<SelectContent>`. Defaults to a
   * `font-mono text-xs tracking-wide` block so item rows match the
   * trigger font.
   */
  contentClassName?: string;
  "aria-label"?: string;
  /** Pass `<SelectItem>`s as children. */
  children?: React.ReactNode;
}

/**
 * Single source of truth for every dropdown in the picker. Built on
 * shadcn `<Select>` (Radix) so it composes cleanly with the rest of the
 * consumer's design system — focus rings, popover surface, item hover
 * states, and keyboard navigation are all the standard shadcn behaviors.
 *
 * Two variants:
 *   - `standalone` matches the bordered `h-8` field look of the other
 *     picker inputs (used by `FormatSwitcher`, `TypeSwitcher`).
 *   - `inline` lives inside a `FieldShell` (used by `ChannelInput`'s
 *     leading format toggle) — strips border/shadow/ring so the parent
 *     shell owns the chrome.
 *
 * The forwarded ref points at the `SelectTrigger` button so consumers
 * can imperatively focus it.
 */
export const FieldSelect = React.forwardRef<
  HTMLButtonElement,
  FieldSelectProps
>(function FieldSelect(
  {
    variant = "standalone",
    value,
    defaultValue,
    onValueChange,
    disabled,
    placeholder,
    className,
    wrapperProps,
    contentClassName,
    children,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const inline = variant === "inline";
  const { className: wrapperClassName, ...wrapperRest } = wrapperProps ?? {};
  return (
    <div
      className={cn(
        inline
          ? "relative inline-flex h-full shrink-0 items-center"
          : "relative inline-flex items-center",
        wrapperClassName,
      )}
      {...wrapperRest}
    >
      <Select
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          size="sm"
          aria-label={ariaLabel}
          className={cn(
            "font-mono text-xs tracking-wide",
            inline
              ? "h-full rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent dark:hover:bg-transparent"
              : "w-full",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          className={cn("font-mono text-xs tracking-wide", contentClassName)}
        >
          {children}
        </SelectContent>
      </Select>
    </div>
  );
});

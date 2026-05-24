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
 * channel-input numeric field: full width of its slot, centered tabular
 * digits, transparent background. Pass `className` to override per use
 * (e.g. left-align for hex / CSS strings).
 */
export const FieldInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function FieldInput({ className, type = "text", ...rest }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      className={cn(
        "w-full min-w-0 bg-transparent px-1.5 text-right outline-none tabular-nums",
        className,
      )}
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

export interface FieldSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * `standalone` (default) — bordered chevron-select matching FormatSwitcher
   * / TypeSwitcher / InterpSwitcher / RadialSizeSelect.
   *
   * `inline` — borderless variant that lives inside a `FieldShell` (used by
   * ChannelInput's format toggle on the left).
   */
  variant?: "standalone" | "inline";
  /** Props forwarded to the chevron wrapper `<div>`. Use for `data-slot`,
   *  width overrides, etc. */
  wrapperProps?: React.HTMLAttributes<HTMLDivElement> & {
    [key: `data-${string}`]: string | undefined;
  };
}

/**
 * Native `<select>` with the new-york shadcn look. Single source of truth
 * for every dropdown in the picker — keeps the chevron, focus ring, and
 * border identical across format / gradient-type / interpolation /
 * radial-size switchers.
 */
export const FieldSelect = React.forwardRef<
  HTMLSelectElement,
  FieldSelectProps
>(function FieldSelect(
  {
    className,
    wrapperProps,
    variant = "standalone",
    children,
    ...rest
  },
  ref,
) {
  const inline = variant === "inline";
  const { className: wrapperClassName, ...wrapperRest } = wrapperProps ?? {};
  return (
    <div
      className={cn(
        inline
          ? "relative inline-flex shrink-0 items-center"
          : "relative inline-flex items-center",
        wrapperClassName,
      )}
      {...wrapperRest}
    >
      <select
        ref={ref}
        className={cn(
          "appearance-none bg-transparent outline-none cursor-pointer",
          inline
            ? "h-full pl-2 pr-5 font-mono text-xs uppercase tracking-wide"
            : "h-8 rounded-md border border-input pl-2.5 pr-7 font-mono text-xs uppercase tracking-wide shadow-xs focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className={cn(
          "pointer-events-none absolute size-3 text-muted-foreground",
          inline ? "right-1.5" : "right-2",
        )}
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
});

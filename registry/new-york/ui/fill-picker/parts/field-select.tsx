"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
 * shadcn `<Select>` (Base UI) so it composes cleanly with the rest of the
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
        onValueChange={(v) => {
          if (v != null) onValueChange?.(v as string);
        }}
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

"use client";

import * as React from "react";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Base UI variant of the gradient field shell.
//
// FieldShell / FieldDivider / FieldInput / FieldInputGroup / FieldSuffix are
// plain, variant-agnostic markup — re-exported from the original so both
// pickers share one implementation. Only FieldSelect (built on shadcn
// `<Select>` / Radix in the original) is rebuilt here on `@base-ui/react/select`.
export {
  FieldShell,
  FieldDivider,
  FieldInput,
  FieldInputGroup,
  FieldSuffix,
  type FieldInputProps,
} from "@/registry/new-york/color-picker/parts/field";

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
   * Class applied to the popup (Base UI `Select.Popup`). Defaults to a
   * `font-mono text-xs tracking-wide` block so item rows match the
   * trigger font.
   */
  contentClassName?: string;
  "aria-label"?: string;
  /**
   * Value → label map for the trigger's collapsed display. Base UI's
   * `<Select.Value>` shows the raw value unless the root is told about
   * item labels via `items` — pass this whenever an option's display
   * label differs from its value (e.g. `"linear"` → `"Linear"`).
   */
  items?: Record<string, React.ReactNode>;
  /** Pass `<FieldSelectItem>`s as children. */
  children?: React.ReactNode;
}

/**
 * Single source of truth for every dropdown in the Base UI gradient
 * picker. Built on `@base-ui/react/select` so keyboard navigation, focus
 * management, and positioning are Base UI's — this file only supplies the
 * visual layer, matching the Radix `FieldSelect`'s look pixel-for-pixel.
 *
 * Mirrors the original `FieldSelect` API exactly (same props, same two
 * variants) so gradient parts are drop-in replacements of their Radix
 * counterparts.
 *
 * The forwarded ref points at the trigger button so consumers can
 * imperatively focus it, matching the original.
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
    items,
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
      <Select.Root
        items={items}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          if (v != null) onValueChange?.(v);
        }}
        disabled={disabled}
      >
        <Select.Trigger
          ref={ref}
          aria-label={ariaLabel}
          className={cn(
            "flex items-center justify-between gap-2 font-mono text-xs tracking-wide outline-none",
            "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
            inline
              ? "h-full rounded-none border-0 bg-transparent px-2 focus-visible:ring-0"
              : "h-8 w-full rounded-md border border-input bg-transparent px-3 shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            className,
          )}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={4} className="z-50 outline-none">
            <Select.Popup
              className={cn(
                "min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
                "font-mono text-xs tracking-wide",
                contentClassName,
              )}
            >
              {children}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
});

export interface FieldSelectItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Base UI counterpart of shadcn's `<SelectItem>` — the item type
 * `<FieldSelect>` expects as children. Kept intentionally minimal (value +
 * children only) since every gradient dropdown option is plain text or a
 * text row with a trailing info tooltip.
 */
export const FieldSelectItem = React.forwardRef<
  HTMLDivElement,
  FieldSelectItemProps
>(function FieldSelectItem({ value, className, children }, ref) {
  return (
    <Select.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <Select.ItemIndicator>
          <Check className="size-4" />
        </Select.ItemIndicator>
      </span>
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
});

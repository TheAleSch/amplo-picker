"use client";

import * as React from "react";
import { Select } from "@base-ui/react/select";
import { ChevronDown, Check } from "lucide-react";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import type { ColorFormat } from "@/registry/new-york/color-picker/lib/types";
import { cn } from "@/lib/utils";

export interface FormatSwitcherProps {
  formats?: ColorFormat[];
  className?: string;
}

export function FormatSwitcher({ formats: formatsProp, className }: FormatSwitcherProps) {
  const { format, setFormat, formats: ctxFormats } = useColorPickerContext();
  const formats = formatsProp ?? ctxFormats;

  return (
    <Select.Root
      value={format}
      onValueChange={(v) => setFormat(v as ColorFormat)}
    >
      <Select.Trigger
        data-slot="color-picker-format-switcher"
        aria-label="Color format"
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Select.Value />
        <Select.Icon>
          <ChevronDown className="size-4 opacity-60" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={4} className="z-50">
          <Select.Popup
            className={cn(
              "min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
              "outline-none",
            )}
          >
            {formats.map((f) => (
              <Select.Item
                key={f}
                value={f}
                className={cn(
                  "flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                  "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                  "outline-none",
                )}
              >
                <Select.ItemText>{f}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

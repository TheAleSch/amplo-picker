"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import type { ColorFormat } from "../lib/types";
import { cn } from "@/lib/utils";

export interface FormatSwitcherProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    "value" | "onChange" | "children"
  > {
  /** Override the formats from <ColorPicker.Root formats={...} />. */
  formats?: ColorFormat[];
}

export const FormatSwitcher = React.forwardRef<
  HTMLSelectElement,
  FormatSwitcherProps
>(function FormatSwitcher({ formats: formatsProp, className, ...rest }, ref) {
  const { format, setFormat, formats: ctxFormats } = useColorPickerContext();
  const formats = formatsProp ?? ctxFormats;

  return (
    <div
      data-slot="color-picker-format-switcher"
      className={cn(
        "relative inline-flex items-center",
        className,
      )}
    >
      <select
        ref={ref}
        data-slot="color-picker-format-switcher-select"
        aria-label="Color format"
        value={format}
        onChange={(e) => setFormat(e.target.value as ColorFormat)}
        className={cn(
          "h-8 appearance-none rounded-md border border-input bg-background pl-2 pr-7 font-mono text-xs uppercase tracking-wide outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          "cursor-pointer",
        )}
        {...rest}
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
        className="pointer-events-none absolute right-2 size-3 text-muted-foreground"
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

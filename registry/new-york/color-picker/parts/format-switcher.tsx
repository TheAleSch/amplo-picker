"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import type { ColorFormat } from "../lib/types";
import { cn } from "@/lib/utils";

export interface FormatSwitcherProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Override the formats from <ColorPicker.Root formats={...} />. */
  formats?: ColorFormat[];
}

export const FormatSwitcher = React.forwardRef<HTMLDivElement, FormatSwitcherProps>(
  function FormatSwitcher({ formats: formatsProp, className, ...rest }, ref) {
    const { format, setFormat, formats: ctxFormats } = useColorPickerContext();
    const formats = formatsProp ?? ctxFormats;
    const tablistRef = React.useRef<HTMLDivElement | null>(null);
    React.useImperativeHandle(ref, () => tablistRef.current as HTMLDivElement);

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const i = formats.indexOf(format);
      if (i < 0) return;
      let next = i;
      if (e.key === "ArrowRight") next = (i + 1) % formats.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + formats.length) % formats.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = formats.length - 1;
      else return;
      e.preventDefault();
      setFormat(formats[next]);
      // focus the newly active tab
      requestAnimationFrame(() => {
        const btn = tablistRef.current?.querySelector<HTMLButtonElement>(
          `[data-format="${formats[next]}"]`,
        );
        btn?.focus();
      });
    };

    return (
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Color format"
        onKeyDown={onKeyDown}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5 text-xs",
          className,
        )}
        {...rest}
      >
        {formats.map((f) => {
          const active = f === format;
          return (
            <button
              key={f}
              role="tab"
              type="button"
              data-format={f}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setFormat(f)}
              className={cn(
                "rounded px-2 py-1 font-medium uppercase tracking-wide transition-colors outline-none",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                "focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {f}
            </button>
          );
        })}
      </div>
    );
  },
);

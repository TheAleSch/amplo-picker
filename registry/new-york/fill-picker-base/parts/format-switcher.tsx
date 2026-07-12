"use client";

import * as React from "react";
import { useColorPickerContext } from "@/registry/new-york/color-picker/context";
import type { ColorFormat } from "@/registry/new-york/color-picker/lib/types";
import { cn } from "@/lib/utils";
import { FieldSelect, FieldSelectItem } from "./gradient/field";

export interface FormatSwitcherProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "onChange" | "value"> {
  formats?: ColorFormat[];
}

/**
 * Built on the shared Base UI `FieldSelect` — the single source of truth
 * for every dropdown in the picker — so its border, focus ring, mono
 * uppercase font, and chevron can't drift from TypeSwitcher /
 * InterpSwitcher / RadialSizeSelect.
 */
export const FormatSwitcher = React.forwardRef<
  HTMLButtonElement,
  FormatSwitcherProps
>(function FormatSwitcher({ formats: formatsProp, className, ...rest }, ref) {
  const { format, setFormat, formats: ctxFormats } = useColorPickerContext();
  const formats = formatsProp ?? ctxFormats;

  return (
    <FieldSelect
      ref={ref}
      aria-label="Color format"
      value={format}
      onValueChange={(v) => setFormat(v as ColorFormat)}
      className={cn("uppercase", className)}
      contentClassName="uppercase"
      wrapperProps={{
        "data-slot": "color-picker-format-switcher",
        className: "w-full",
        ...(rest as React.HTMLAttributes<HTMLDivElement>),
      }}
    >
      {formats.map((f) => (
        <FieldSelectItem key={f} value={f} className="uppercase">
          {f}
        </FieldSelectItem>
      ))}
    </FieldSelect>
  );
});

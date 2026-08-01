"use client";

import * as React from "react";
import { SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useColorPickerContext } from "../context";
import type { ColorFormat } from "../lib/types";
import { FieldSelect } from "./field";

export interface FormatSwitcherProps {
  /** Override the formats from <ColorPicker.Root formats={...} />. */
  formats?: ColorFormat[];
  className?: string;
}

export const FormatSwitcher = React.forwardRef<
  HTMLButtonElement,
  FormatSwitcherProps
>(function FormatSwitcher({ formats: formatsProp, className }, ref) {
  const { format, setFormat, formats: ctxFormats } = useColorPickerContext();
  const formats = formatsProp ?? ctxFormats;

  return (
    <FieldSelect
      ref={ref}
      aria-label="Color format"
      value={format}
      onValueChange={(v) => setFormat(v as ColorFormat)}
      className="w-full uppercase"
      wrapperProps={{
        // w-full basis so the trigger's w-full has something to fill —
        // without it the inline-flex wrapper sizes to the selected value
        // and the control resizes per format (parity with the Base UI
        // variant's FormatSwitcher).
        className: cn("w-full", className),
        "data-slot": "color-picker-format-switcher",
      }}
    >
      {formats.map((f) => (
        <SelectItem key={f} value={f} className="uppercase">
          {f}
        </SelectItem>
      ))}
    </FieldSelect>
  );
});

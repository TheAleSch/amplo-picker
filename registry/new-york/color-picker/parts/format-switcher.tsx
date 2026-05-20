"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import type { ColorFormat } from "../lib/types";
import { FieldSelect } from "./field";

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
    <FieldSelect
      ref={ref}
      data-slot="color-picker-format-switcher-select"
      aria-label="Color format"
      value={format}
      onChange={(e) => setFormat(e.target.value as ColorFormat)}
      className="w-full"
      wrapperProps={{
        "data-slot": "color-picker-format-switcher",
        className,
      }}
      {...rest}
    >
      {formats.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </FieldSelect>
  );
});

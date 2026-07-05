"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";
import { CHECKERBOARD_LG } from "../lib/constants";

export interface PreviewProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Preview = React.forwardRef<HTMLDivElement, PreviewProps>(function Preview(
  { className, ...rest },
  ref,
) {
  const { color, background } = useColorPickerContext();
  const fg = formatColor(color, "p3");
  const bg = formatColor(background, "p3");
  return (
    <div
      ref={ref}
      data-slot="color-picker-preview"
      role="img"
      aria-label="Color preview over background"
      className={cn(
        "relative size-10 shrink-0 overflow-hidden rounded-md border border-border",
        className,
      )}
      style={{
        backgroundImage: CHECKERBOARD_LG,
        backgroundSize: "12px 12px",
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: bg }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: fg }}
      />
    </div>
  );
});

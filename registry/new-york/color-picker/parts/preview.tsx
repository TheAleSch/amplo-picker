"use client";

import * as React from "react";
import { useColorPickerContext } from "../context";
import { formatColor } from "../lib/color";
import { cn } from "@/lib/utils";

export interface PreviewProps extends React.HTMLAttributes<HTMLDivElement> {}

const CHECKERBOARD =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

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
        backgroundImage: CHECKERBOARD,
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

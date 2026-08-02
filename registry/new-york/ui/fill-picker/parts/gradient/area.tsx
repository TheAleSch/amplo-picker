"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGradientPickerContext } from "../../contexts/gradient";
import { formatGradient } from "../../lib/gradient";
import { CHECKERBOARD_LG } from "../../lib/constants";
import { Overlay, type OverlayProps } from "./overlay";

export interface AreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed height in px. Defaults to 120. Width always fills the container. */
  height?: number;
  /** Forwarded to the inner `<GradientPicker.Overlay>` for conic dial sizing. */
  conicDialRadius?: OverlayProps["conicDialRadius"];
}

/**
 * Self-contained 2D pad: paints the live gradient (over a transparency
 * checkerboard) and overlays the handle layer on top. Essentially
 * `<GradientPicker.Overlay>` plus a painted background — use this when you
 * want the picker to own its own preview, and use `<GradientPicker.Overlay>`
 * directly when you want to drop the handles onto a consumer-owned object
 * on a canvas.
 */
export const Area = React.forwardRef<HTMLDivElement, AreaProps>(function Area(
  { className, height = 120, conicDialRadius, style, ...rest },
  ref,
) {
  const ctx = useGradientPickerContext();
  const cssBackground = React.useMemo(
    () => formatGradient(ctx.gradient),
    [ctx.gradient],
  );

  return (
    <div
      ref={ref}
      data-slot="gradient-area"
      style={{ height, ...style }}
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-border bg-muted",
        className,
      )}
      {...rest}
    >
      {/* Transparency checker behind the gradient so alpha is legible. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: CHECKERBOARD_LG }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: cssBackground }}
      />
      <Overlay conicDialRadius={conicDialRadius} />
    </div>
  );
});

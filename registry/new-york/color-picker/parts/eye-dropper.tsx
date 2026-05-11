"use client";

import * as React from "react";
import { Pipette } from "lucide-react";
import { useColorPickerContext } from "../context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EyeDropperLike {
  open: (opts?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>;
}

declare global {
  interface Window {
    EyeDropper?: { new (): EyeDropperLike };
  }
}

const subscribeNoop = () => () => {};
const getEyeDropperSupportClient = () =>
  typeof window !== "undefined" && typeof window.EyeDropper === "function";
const getEyeDropperSupportServer = () => false;

export interface EyeDropperProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const EyeDropper = React.forwardRef<HTMLButtonElement, EyeDropperProps>(function EyeDropper(
  { className, ...rest },
  ref,
) {
  const { setColor } = useColorPickerContext();
  // Client-only feature detection without a hydration mismatch and without the
  // two-paint flash that an `useEffect(setState)` pattern introduces. The
  // server snapshot returns `false` (matching SSR's empty render); the client
  // snapshot reads the real value during hydration's reconciliation pass.
  const supported = React.useSyncExternalStore(
    subscribeNoop,
    getEyeDropperSupportClient,
    getEyeDropperSupportServer,
  );

  if (!supported) return null;

  const onClick = async () => {
    try {
      const ed = new window.EyeDropper!();
      const result = await ed.open();
      if (result?.sRGBHex) setColor(result.sRGBHex);
    } catch {
      // user cancelled
    }
  };

  return (
    <Button
      ref={ref}
      data-slot="color-picker-eye-dropper"
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label="Pick color from screen"
      onClick={onClick}
      className={cn("cursor-pointer", className)}
      {...rest}
    >
      <Pipette className="size-4" />
    </Button>
  );
});

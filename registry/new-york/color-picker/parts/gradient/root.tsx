"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GradientPickerContext } from "../../contexts/gradient";
import {
  useGradientPicker,
  type UseGradientPickerProps,
} from "../../hooks/use-gradient-picker";

export interface RootProps
  extends UseGradientPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  { value, defaultValue, onValueChange, className, children, ...rest },
  ref,
) {
  const state = useGradientPicker({ value, defaultValue, onValueChange });
  return (
    <GradientPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="gradient-picker"
        className={cn(
          "flex w-full max-w-[280px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </GradientPickerContext.Provider>
  );
});

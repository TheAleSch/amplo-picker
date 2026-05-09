"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FillPickerContext } from "../../contexts/fill";
import {
  useFillPicker,
  type UseFillPickerProps,
} from "../../hooks/use-fill-picker";

export interface RootProps
  extends UseFillPickerProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {}

export const Root = React.forwardRef<HTMLDivElement, RootProps>(function Root(
  {
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
    className,
    children,
    ...rest
  },
  ref,
) {
  const state = useFillPicker({
    value,
    defaultValue,
    onValueChange,
    mode,
    defaultMode,
    onModeChange,
  });

  return (
    <FillPickerContext.Provider value={state}>
      <div
        ref={ref}
        data-slot="fill-picker"
        className={cn(
          "flex w-full max-w-[280px] flex-col gap-2 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-sm",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </FillPickerContext.Provider>
  );
});

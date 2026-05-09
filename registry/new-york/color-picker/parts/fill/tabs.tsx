"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useFillPickerContext } from "../../contexts/fill";
import type { FillMode } from "../../hooks/use-fill-picker";

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Tabs({ className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Fill mode"
      className={cn("inline-flex items-center gap-1 rounded-md bg-muted p-1", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  mode: FillMode;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { mode, className, children, ...rest },
  ref,
) {
  const ctx = useFillPickerContext();
  const active = ctx.mode === mode;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx.setMode(mode)}
      className={cn(
        "rounded-sm px-3 py-1 text-xs font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

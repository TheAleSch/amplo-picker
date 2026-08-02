"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  fillPaneId,
  fillTabId,
  FillPickerIdContext,
  useFillPickerContext,
} from "../../contexts/fill";
import type { FillMode } from "../../hooks/use-fill-picker";

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function Tabs({ className, children, ...rest }, ref) {
  // APG Tabs pattern: Left/Right arrows rove between tabs and select as
  // they go (selection follows focus — panes render instantly). Activating
  // via .click() keeps any consumer onClick on the Tab in the loop.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    if (tabs.length === 0) return;
    const current = tabs.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else {
      const delta = e.key === "ArrowRight" ? 1 : -1;
      next = (Math.max(current, 0) + delta + tabs.length) % tabs.length;
    }
    e.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };
  return (
    <div
      ref={ref}
      role="tablist"
      aria-label="Fill mode"
      onKeyDown={onKeyDown}
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
  const idBase = React.useContext(FillPickerIdContext);
  const active = ctx.mode === mode;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={fillTabId(idBase, mode)}
      aria-controls={fillPaneId(idBase, mode)}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
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

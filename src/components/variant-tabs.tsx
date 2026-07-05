"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface VariantTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface VariantTabsProps {
  tabs: VariantTab[];
  defaultValue?: string;
  className?: string;
}

/**
 * Segmented control switching between component variants (e.g. Base UI vs
 * Radix). Visual language mirrors InstallTabs' tab row so the two nest
 * naturally in the docs.
 */
export function VariantTabs({ tabs, defaultValue, className }: VariantTabsProps) {
  const [active, setActive] = React.useState(defaultValue ?? tabs[0]?.value);
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        role="tablist"
        aria-label="Component variant"
        className="flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.value)}
              className={cn(
                "rounded-md px-3 py-1 text-sm outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab?.content}
    </div>
  );
}

"use client";

import * as React from "react";
import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

export interface PreviewTabsProps {
  preview: React.ReactNode;
  code: string;
  /** Outer container class — bg, padding, etc. */
  className?: string;
  /** Inner preview-pane class — useful for overriding min-height or alignment. */
  previewClassName?: string;
}

/**
 * shadcn-style "Preview / Code" tabs for component examples. Defaults to the
 * Preview tab; mounting both panes upfront would render every demo
 * concurrently, so the code pane is gated behind selection.
 */
export function PreviewTabs({
  preview,
  code,
  className,
  previewClassName,
}: PreviewTabsProps) {
  const [tab, setTab] = React.useState<"preview" | "code">("preview");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="tablist"
        aria-label="Example view"
        className="flex items-center gap-4 border-b border-border"
      >
        <Tab active={tab === "preview"} onClick={() => setTab("preview")}>
          Preview
        </Tab>
        <Tab active={tab === "code"} onClick={() => setTab("code")}>
          Code
        </Tab>
      </div>

      <div
        hidden={tab !== "preview"}
        className={cn(
          "flex min-h-[360px] items-center justify-center rounded-lg border border-border bg-background p-8",
          previewClassName,
        )}
      >
        {preview}
      </div>

      {tab === "code" && <CodeBlock code={code} />}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative -mb-px py-2 text-sm font-medium outline-none transition-colors",
        "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute -bottom-px left-0 right-0 h-0.5 bg-foreground"
        />
      )}
    </button>
  );
}

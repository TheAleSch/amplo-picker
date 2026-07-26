"use client";

import * as React from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CopyPromptProps {
  /** Short label above the block, e.g. "Adopt stop ids". */
  title: string;
  /** Markdown prompt, handed verbatim to a coding agent. */
  prompt: string;
  /** Rendered under the title — say who needs this and who can skip it. */
  summary?: string;
  className?: string;
}

/**
 * A migration prompt with a copy button, for changelog entries.
 *
 * The prompt is markdown written to be pasted straight into a coding agent
 * (Claude Code, Cursor, …) so it can perform the change against a consumer's
 * own codebase. It is shown in full rather than hidden behind the button —
 * people should be able to read what they are about to hand an agent.
 */
export function CopyPrompt({
  title,
  prompt,
  summary,
  className,
}: CopyPromptProps) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (insecure origin, denied permission) —
      // the prompt is on screen and selectable, so this is a silent no-op.
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-xs font-medium">{title}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy the "${title}" migration prompt`}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none transition-colors",
            "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {copied ? (
            <Check className="size-3" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
          {copied ? "Copied" : "Copy prompt"}
        </button>
      </div>
      {summary && (
        <p className="text-xs leading-relaxed text-muted-foreground">{summary}</p>
      )}
      <pre className="max-h-72 overflow-auto rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed">
        <code className="font-mono whitespace-pre-wrap">{prompt}</code>
      </pre>
      <span aria-live="polite" className="sr-only">
        {copied ? "Migration prompt copied to clipboard" : ""}
      </span>
    </div>
  );
}

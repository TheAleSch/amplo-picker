"use client";

import * as React from "react";
import { Check, Copy, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAiPrompt } from "@/lib/docs-markdown";

export interface CopyForAiProps {
  className?: string;
  /**
   * The snippet the user built on this surface (the playground's generated JSX). When
   * present it is embedded in the prompt, so the agent starts from the user's actual
   * composition instead of a generic example that discards every knob they just tuned.
   * Omitted on surfaces with nothing to attach (hero, docs).
   */
  composition?: string;
}

export function CopyForAi({ className, composition }: CopyForAiProps) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt(composition));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — silent no-op
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-2 py-1.5 text-xs",
        className,
      )}
    >
      <Sparkles className="size-3.5 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">For AI agents:</span>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={copied ? "Prompt copied" : "Copy prompt for AI"}
        title="Copy a ready-made prompt that points your agent at the full markdown reference"
      >
        {copied ? (
          <>
            <Check className="size-3 text-emerald-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-3" />
            Copy prompt
          </>
        )}
      </button>
      <a
        href="/llms-full.txt"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none transition-colors",
          "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
        )}
        title="Full API reference as plain markdown — paste the URL into your agent"
      >
        <FileText className="size-3" />
        View as markdown
      </a>
    </div>
  );
}

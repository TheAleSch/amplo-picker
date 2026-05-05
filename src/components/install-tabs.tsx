"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type PackageManager = "pnpm" | "yarn" | "npm" | "bun";

const COMMANDS: Record<PackageManager, (url: string) => string> = {
  pnpm: (url) => `pnpm dlx shadcn@latest add ${url}`,
  yarn: (url) => `yarn dlx shadcn@latest add ${url}`,
  npm: (url) => `npx shadcn@latest add ${url}`,
  bun: (url) => `bunx shadcn@latest add ${url}`,
};

const TABS: PackageManager[] = ["pnpm", "yarn", "npm", "bun"];

export interface InstallTabsProps {
  url: string;
  title?: string;
  description?: string;
  className?: string;
}

export function InstallTabs({
  url,
  title = "Use the registry",
  description = "Pull components into your codebase with one command.",
  className,
}: InstallTabsProps) {
  const [active, setActive] = React.useState<PackageManager>("pnpm");
  const [copied, setCopied] = React.useState(false);
  const command = COMMANDS[active](url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable / blocked — silent no-op
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-5 pt-4 pb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        role="tablist"
        aria-label="Package manager"
        className="flex items-center gap-4 border-t border-border px-5"
      >
        {TABS.map((pm) => {
          const isActive = pm === active;
          return (
            <button
              key={pm}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(pm)}
              className={cn(
                "relative -mb-px py-2.5 font-mono text-xs outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {pm}
              {/* Active underline. -bottom-px so it overlaps the container's
                  bottom border instead of sitting below it. */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -bottom-px left-0 right-0 h-0.5 bg-foreground"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-border px-5 py-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
          <span className="select-none text-muted-foreground">$ </span>
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy command"}
          title={copied ? "Copied" : "Copy command"}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background outline-none transition-colors",
            "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {copied ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

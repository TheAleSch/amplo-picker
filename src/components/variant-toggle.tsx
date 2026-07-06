import Link from "next/link";
import { cn } from "@/lib/utils";

// shadcn-style variant switcher: a pill of links between the two variant
// routes (Base UI first/default, Radix one click away), matching how
// ui.shadcn.com presents its Base UI migration. These are navigation links
// (each variant is its own page), not in-page tabs — hence `aria-current`
// rather than tab roles.
const VARIANTS = [
  { key: "base", label: "Base UI", href: "/docs" },
  { key: "radix", label: "Radix UI", href: "/docs/radix" },
] as const;

export function VariantToggle({ active }: { active: "base" | "radix" }) {
  return (
    <nav
      aria-label="Component variant"
      className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-muted p-1"
    >
      {VARIANTS.map((v) => {
        const isActive = v.key === active;
        return (
          <Link
            key={v.key}
            href={v.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium outline-none transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}

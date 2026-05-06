import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs · Amplo Color Picker",
  description:
    "Installation, examples, and API reference for the OKLCH-native, Display-P3-aware Amplo Color Picker shadcn component.",
  alternates: {
    // Discovery for crawlers + agents. Same URL serves markdown when the
    // request sends `Accept: text/markdown` (see next.config.ts rewrite).
    types: { "text/markdown": "/docs.md" },
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

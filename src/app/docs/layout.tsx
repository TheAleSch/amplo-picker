import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs · Amplo Color Picker",
  description:
    "Installation, examples, and API reference for the OKLCH-native, Display-P3-aware Amplo Color Picker shadcn component.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

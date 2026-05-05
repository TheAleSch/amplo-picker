import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplo Picker",
  description:
    "OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

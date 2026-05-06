import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplo Picker",
  description:
    "OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      {
        url: "/favicon/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: runs before paint to apply .dark from localStorage
            or system preference, preventing a light→dark flash on reload. */}
        <script src="/theme-init.js" />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://amplo.ale.design";
const SITE_TITLE = "Amplo Color Picker";
const SITE_DESCRIPTION =
  "OKLCH-native, Display-P3-aware color picker for shadcn. Composable, accessible, gamut-aware.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // images come from src/app/opengraph-image.jpg via Next's file convention
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // images come from src/app/twitter-image.jpg via Next's file convention
  },
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

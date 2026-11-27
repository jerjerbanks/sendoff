import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";
import { requestOrigin } from "@/lib/origin";
import { THEME_BOOT } from "@/lib/theme";
import { ActivityPing } from "@/components/activity-ping";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

const OG_ALT = `${APP_NAME}: Get the trip out of the group chat.`;

export async function generateMetadata(): Promise<Metadata> {
  // Absolute, per-request origin so the og:image never bakes in localhost (same as the landing page).
  const origin = await requestOrigin();
  const ogImage = { url: `${origin}/og-image.png`, width: 1200, height: 630, alt: OG_ALT };
  return {
    metadataBase: new URL(origin),
    title: APP_NAME,
    description: "Plan a bachelor party in the group chat. Vote the weekend, see your share, and commit without anyone fronting the bill.",
    applicationName: APP_NAME,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
      title: APP_NAME,
      description: "Plan the bachelor party in the group chat.",
      type: "website",
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title: APP_NAME, images: [ogImage.url] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#17130F" },
  ],
  colorScheme: "light dark",
  // Lets the tab bar pad for the iPhone home indicator via env(safe-area-inset-bottom).
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script sets data-theme and data-theme-mode before first paint, so React must
    // not complain that they differ from the server's light defaults.
    <html lang="en" data-theme="light" data-theme-mode="light" suppressHydrationWarning>
      <head>
        {/* Before any CSS: the theme is resolved here, never in a React effect. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${instrument.variable} antialiased`}>
        {children}
        <ActivityPing />
      </body>
    </html>
  );
}

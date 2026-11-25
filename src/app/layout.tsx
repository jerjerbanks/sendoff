import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/constants";

const geist = Geist({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-geist-mono" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Plan a bachelor party in the group chat. Vote the weekend, see your share, and commit without anyone fronting the bill.",
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: APP_NAME,
    description: "Plan the bachelor party in the group chat.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: APP_NAME },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FBF7F0",
  // Lets the tab bar pad for the iPhone home indicator via env(safe-area-inset-bottom).
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} ${instrument.variable} antialiased`}>{children}</body>
    </html>
  );
}

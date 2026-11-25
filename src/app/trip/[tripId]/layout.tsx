import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { ogCard } from "@/lib/og-copy";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";

async function origin() {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:4747";
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: { params: Promise<{ tripId: string }> }): Promise<Metadata> {
  const { tripId } = await params;
  const shell = await loadTripView(tripId, null);
  const view = shell;
  if (!view) return { title: APP_NAME };
  const card = ogCard(view);
  const base = await origin();
  const image = `${base}/og/trip/${tripId}`;
  return {
    title: card.pageTitle,
    description: card.alt,
    openGraph: { title: card.shareTitle, description: card.alt, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: card.shareTitle, description: card.alt, images: [image] },
  };
}

export default async function TripLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) notFound();
  return <Shell view={view}>{children}</Shell>;
}

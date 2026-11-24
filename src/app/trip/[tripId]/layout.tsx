import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

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

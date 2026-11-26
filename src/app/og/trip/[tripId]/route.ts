import { cardPng } from "@/lib/og-card";
import { isDemoTrip } from "@/lib/demo-tour";
import { ogCard, privateTripCard } from "@/lib/og-copy";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export async function GET(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return new Response("Trip not found", { status: 404 });
  // Unfurl bots carry no session, so a real trip's card is the generic private one.
  const member = !!view.viewer || isDemoTrip(view.id);
  const png = await cardPng(member ? ogCard(view) : privateTripCard());
  return new Response(new Blob([png.buffer as ArrayBuffer], { type: "image/png" }), {
    // Never share a member's card through a cache with someone who isn't one.
    headers: { "cache-control": member && !isDemoTrip(view.id) ? "private, no-store" : "public, max-age=300", vary: "Cookie" },
  });
}

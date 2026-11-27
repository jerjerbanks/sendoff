import { cardPng } from "@/lib/og-card";
import { isDemoTrip } from "@/lib/demo-tour";
import { ogCard, privateTripCard } from "@/lib/og-copy";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export async function GET(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  const view = await loadTripView(tripId, await getViewerId());
  // Unfurl bots carry no session, so a real trip's card is the generic private one.
  // An unknown id gets that same card, so a link never confirms whether a trip exists.
  const member = !!view && (!!view.viewer || isDemoTrip(view.id));
  const png = await cardPng(member && view ? ogCard(view) : privateTripCard());
  return new Response(new Blob([png.buffer as ArrayBuffer], { type: "image/png" }), {
    // Never share a member's card through a cache with someone who isn't one.
    headers: { "cache-control": member && view && !isDemoTrip(view.id) ? "private, no-store" : "public, max-age=300", vary: "Cookie" },
  });
}

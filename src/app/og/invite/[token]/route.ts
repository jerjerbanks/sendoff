import { cardPng } from "@/lib/og-card";
import { ogCard } from "@/lib/og-copy";
import { tripIdForToken } from "@/lib/store";
import { loadTripView } from "@/lib/view";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const tripId = await tripIdForToken(token);
  const shell = tripId ? await loadTripView(tripId, null) : null;
  const payer = shell?.members.find((member) => member.status === "committed" && member.role !== "honoree");
  const view = payer && tripId ? await loadTripView(tripId, payer.userId) : shell;
  if (!view) return new Response("Invite not found", { status: 404 });
  const png = await cardPng(ogCard(view));
  return new Response(new Blob([png.buffer as ArrayBuffer], { type: "image/png" }), {
    headers: { "cache-control": "public, max-age=300" },
  });
}

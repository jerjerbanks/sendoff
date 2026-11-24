import { cardPng } from "@/lib/og-card";
import { ogCard } from "@/lib/og-copy";
import { loadTripView } from "@/lib/view";

export async function GET(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  const shell = await loadTripView(tripId, null);
  if (!shell) return new Response("Trip not found", { status: 404 });
  const payer = shell.members.find((member) => member.status === "committed" && member.role !== "honoree");
  const view = payer ? await loadTripView(tripId, payer.userId) : shell;
  if (!view) return new Response("Trip not found", { status: 404 });
  const card = ogCard(view);
  const png = await cardPng(card);
  return new Response(new Blob([png.buffer as ArrayBuffer], { type: "image/png" }), {
    headers: { "cache-control": "public, max-age=300" },
  });
}

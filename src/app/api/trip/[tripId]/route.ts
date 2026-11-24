import { NextResponse } from "next/server";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

/** Public trip JSON. Budgets, notes, must-haves, and another person's over/under never leave the server. */
export async function GET(_request: Request, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  return NextResponse.json({
    id: view.id,
    viewerId: view.viewer?.userId ?? null,
    options: view.polls.flatMap((poll) =>
      poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        badge: option.badge,
        countLabel: option.countLabel,
        hidden: option.hidden,
        privateLine: option.privateLine,
      })),
    ),
  });
}

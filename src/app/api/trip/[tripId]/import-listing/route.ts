import { NextResponse } from "next/server";
import { getViewerId } from "@/lib/session";
import { isOrganizerOf } from "@/lib/store";
import { withinLimit } from "@/lib/limit-check";
import { airbnbListingId } from "@/lib/listing-import";
import { fetchListing } from "@/lib/listing-fetch";

/**
 * Organizer only: read rooms and beds from an airbnb.com/rooms/{id} link.
 * Nothing is saved here; the organizer confirms on the next screen. Any link
 * that isn't Airbnb, and any fetch that fails or is blocked, answers
 * `{ ok: false, fallback: "paste" }` so the page shows the paste-text box.
 * Every outcome is logged with a reason, never the page itself.
 */
export async function POST(request: Request, context: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await context.params;
  // Same-site only. The session cookie is SameSite=Lax, so this is belt and braces.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });
  }
  const userId = (await getViewerId()) ?? "";
  // Outsiders and members alike get the same answer as a trip that doesn't exist.
  if (!(await isOrganizerOf(tripId, userId))) {
    return NextResponse.json({ ok: false, error: "Trip not found." }, { status: 404 });
  }

  let url = "";
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body?.url === "string" ? body.url.slice(0, 500) : "";
  } catch {
    url = "";
  }

  const started = Date.now();
  const log = (outcome: "success" | "failure", reason: string, extra: Record<string, unknown> = {}) =>
    (outcome === "success" ? console.log : console.warn)({ event: "listing_import", outcome, reason, tripId, ms: Date.now() - started, ...extra });

  const listingId = airbnbListingId(url);
  if (!listingId) {
    log("failure", "not_airbnb_link");
    return NextResponse.json({ ok: false, fallback: "paste", reason: "not_airbnb_link" });
  }

  // Counted only when we'd actually fetch: 5 a minute per IP (rate_hits bucket "import").
  if (!(await withinLimit("import"))) {
    log("failure", "rate_limited", { listingId });
    return NextResponse.json({ ok: false, error: "Too many imports. Wait a minute and try again.", reason: "rate_limited" }, { status: 429 });
  }

  const result = await fetchListing(listingId);
  if (!result.ok) {
    log("failure", result.reason, { listingId, bedrooms: result.bedrooms });
    return NextResponse.json({ ok: false, fallback: "paste", reason: result.reason });
  }
  const spots = result.rooms.reduce((sum, room) => sum + room.beds.reduce((n, bed) => n + bed.count, 0), 0);
  log("success", "parsed", { listingId, rooms: result.rooms.length, beds: spots, bedrooms: result.bedrooms });
  return NextResponse.json({ ok: true, listingId, rooms: result.rooms, bedrooms: result.bedrooms });
}

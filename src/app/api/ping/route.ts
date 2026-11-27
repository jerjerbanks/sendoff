import { NextResponse } from "next/server";
import { pingSeconds, recordActivity, recordInviteOpen, tripIdFromPath } from "@/lib/activity";
import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { isMemberOf, tripIdForToken } from "@/lib/store";

/**
 * Usage pings for the operator's /admin page (components/activity-ping). Always answers
 * 204 with nothing in it, so it tells a caller nothing about trips or people.
 * - { s, path }: seconds of use from a signed-in, non-demo person. One session read, one upsert.
 * - { invite }: an invite link opened. Not counted when the opener is already on the trip.
 */
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });
  let body: { s?: unknown; path?: unknown; invite?: unknown };
  try {
    const text = await request.text();
    if (text.length > 500) return done;
    body = JSON.parse(text) as typeof body;
  } catch {
    return done;
  }
  if (!body || typeof body !== "object") return done;
  try {
    if (typeof body.invite === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(body.invite)) {
      const tripId = await tripIdForToken(body.invite);
      if (!tripId) return done;
      const viewer = await getViewer();
      if (viewer && (await isMemberOf(tripId, viewer.userId))) return done;
      await recordInviteOpen(getD1(), tripId);
      return done;
    }
    const seconds = pingSeconds(body.s);
    if (!seconds) return done;
    const viewer = await getViewer();
    if (!viewer || viewer.demo) return done;
    await recordActivity(getD1(), viewer.userId, tripIdFromPath(body.path), seconds);
  } catch (error) {
    console.warn("ping failed", error instanceof Error ? error.message : error);
  }
  return done;
}

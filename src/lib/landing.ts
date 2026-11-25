import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { isDemoTrip } from "./demo-tour";
import { sessions, tripEvents, tripMembers } from "./schema";
import { hashToken, plausibleToken } from "./tokens";

/**
 * Where "/" sends someone who is already signed in: their most recently active trip.
 * Returns null (show the landing page) when there is no valid session, when the session is
 * a throwaway demo sign-in, or when the person belongs to no real trip yet.
 *
 * Read-only: it looks a session up the same way getViewerId does and never changes it.
 * Only called when the session cookie is present, so logged-out visitors cost no D1 query.
 */
export async function landingDestination(token: string | undefined): Promise<string | null> {
  if (!plausibleToken(token)) return null;
  const db = getDb();
  const session = (
    await db
      .select({ userId: sessions.userId, demo: sessions.demo })
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
  )[0];
  if (!session || session.demo) return null;
  const lastActive = sql<string | null>`max(${tripEvents.at})`;
  const rows = await db
    .select({ tripId: tripMembers.tripId, lastActive })
    .from(tripMembers)
    .leftJoin(tripEvents, eq(tripEvents.tripId, tripMembers.tripId))
    .where(eq(tripMembers.userId, session.userId))
    .groupBy(tripMembers.tripId)
    .orderBy(desc(lastActive))
    .limit(10);
  const trip = rows.find((row) => !isDemoTrip(row.tripId));
  return trip ? `/trip/${trip.tripId}` : null;
}

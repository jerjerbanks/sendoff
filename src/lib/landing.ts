import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { isDemoTrip } from "./demo-tour";
import { tripEvents, tripMembers, trips } from "./schema";

export interface MyTrip {
  tripId: string;
  name: string;
  dateWindow: string;
  status: string;
  role: string;
  memberStatus: string;
}

/**
 * The trips this person belongs to, most recently active first, for "Your trips".
 * One indexed query; nothing is recalculated. Demo trips are left out.
 */
export async function listMyTrips(userId: string): Promise<MyTrip[]> {
  const lastActive = sql<string | null>`max(${tripEvents.at})`;
  const rows = await getDb()
    .select({
      tripId: tripMembers.tripId,
      name: trips.name,
      dateWindow: trips.dateWindow,
      status: trips.status,
      role: tripMembers.role,
      memberStatus: tripMembers.status,
      lastActive,
    })
    .from(tripMembers)
    .innerJoin(trips, eq(trips.id, tripMembers.tripId))
    .leftJoin(tripEvents, eq(tripEvents.tripId, tripMembers.tripId))
    .where(and(eq(tripMembers.userId, userId), isNull(trips.deletedAt)))
    .groupBy(tripMembers.tripId)
    .orderBy(desc(lastActive))
    .limit(50);
  return rows
    .filter((row) => !isDemoTrip(row.tripId))
    .map(({ tripId, name, dateWindow, status, role, memberStatus }) => ({ tripId, name, dateWindow, status, role, memberStatus }));
}

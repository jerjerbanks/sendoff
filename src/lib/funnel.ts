import { isDemoTrip } from "./demo-tour";

export const FUNNEL_STEPS = ["trip_created", "member_joined", "voted", "committed"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/** The slice of the D1 binding this needs, so tests can run it against plain SQLite. */
export interface FunnelDb {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

export const FUNNEL_INSERT = "INSERT OR IGNORE INTO funnel_events (trip_id, user_id, step, at) VALUES (?, ?, ?, ?)";

/**
 * Counts a member's step once per trip. Demo trips never count, so the tour and
 * /demo/reset add nothing. A failed write is logged and swallowed: it must never
 * fail the action the person took.
 */
export async function recordFunnel(db: FunnelDb, tripId: string, userId: string, step: FunnelStep, at = new Date().toISOString()): Promise<void> {
  if (isDemoTrip(tripId)) return;
  try {
    await db.prepare(FUNNEL_INSERT).bind(tripId, userId, step, at).run();
  } catch (error) {
    console.warn("funnel write failed", step, error instanceof Error ? error.message : error);
  }
}

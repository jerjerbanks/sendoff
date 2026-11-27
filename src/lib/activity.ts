import { isDemoTrip } from "./demo-tour";

/**
 * Lightweight usage for the operator's /admin page (migration 0017). The browser sends
 * one tiny ping a minute while a trip page is visible and the person has touched it in the
 * last minute; each ping is a single upsert. Nothing here is ever shown to other members.
 */

/** Most seconds one ping can add. The browser pings every 60 s; a little slack for timers. */
export const MAX_PING_SECONDS = 75;
/** The browser pings this often while someone is using a page. */
export const PING_INTERVAL_MS = 60_000;

/** The slice of the D1 binding this needs, so tests can run it against plain SQLite. */
export interface ActivityDb {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

/**
 * Adds a ping's seconds to today's row for this person and trip. A ping can never add more
 * than the time since the previous one on that row (plus 2 s for timers), so two open tabs
 * or a replayed request can't inflate the total.
 */
export const ACTIVITY_UPSERT = `INSERT INTO activity_days (user_id, trip_id, day, seconds, pings, first_at, last_at) VALUES (?, ?, ?, ?, 1, ?, ?)
ON CONFLICT (user_id, trip_id, day) DO UPDATE SET
  seconds = activity_days.seconds + MIN(excluded.seconds, MAX(0, CAST((julianday(excluded.last_at) - julianday(activity_days.last_at)) * 86400 AS INTEGER) + 2)),
  pings = activity_days.pings + 1,
  last_at = excluded.last_at`;

export const INVITE_OPEN_UPSERT = `INSERT INTO invite_opens (trip_id, day, opens) VALUES (?, ?, 1)
ON CONFLICT (trip_id, day) DO UPDATE SET opens = invite_opens.opens + 1`;

/** Clamp what the browser says to a whole number of seconds in [0, MAX_PING_SECONDS]. */
export function pingSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_PING_SECONDS, Math.round(n));
}

/** The trip a page belongs to, from its path (/trip/{id}/...), or '' for pages outside a trip. */
export function tripIdFromPath(path: unknown): string {
  if (typeof path !== "string") return "";
  const match = /^\/trip\/([A-Za-z0-9_-]{6,64})(?:\/|$|\?)/.exec(path);
  return match ? match[1] : "";
}

/** Pages whose time counts as using the app. The landing page, demo and admin don't. */
export function countsAsAppPage(path: string): boolean {
  return path === "/trips" || path === "/new" || path.startsWith("/new/") || path.startsWith("/trip/");
}

/** One ping from a signed-in, non-demo person. Swallows failures: analytics must never break a page. */
export async function recordActivity(db: ActivityDb, userId: string, tripId: string, seconds: number, now = new Date()): Promise<boolean> {
  if (!userId || seconds <= 0 || isDemoTrip(tripId)) return false;
  const at = now.toISOString();
  try {
    await db.prepare(ACTIVITY_UPSERT).bind(userId, tripId, at.slice(0, 10), seconds, at, at).run();
    return true;
  } catch (error) {
    console.warn("activity write failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function recordInviteOpen(db: ActivityDb, tripId: string, now = new Date()): Promise<boolean> {
  if (!tripId || isDemoTrip(tripId)) return false;
  try {
    await db.prepare(INVITE_OPEN_UPSERT).bind(tripId, now.toISOString().slice(0, 10)).run();
    return true;
  } catch (error) {
    console.warn("invite open write failed", error instanceof Error ? error.message : error);
    return false;
  }
}

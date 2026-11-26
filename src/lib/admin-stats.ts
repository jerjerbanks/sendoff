import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "./constants";
import { FUNNEL_STEPS, type FunnelStep } from "./funnel";

/**
 * Aggregate usage for the operator: counts only. No trip names, budgets, contacts or
 * people's names ever leave this module, so the members-only and budget-privacy rules
 * hold even for the admin. A handful of indexed aggregate queries; nothing is recalculated.
 */

export interface UsageStats {
  generatedAt: string;
  funnel: { step: FunnelStep; total: number; last7: number }[];
  trips: { total: number; byStatus: { status: string; count: number }[] };
  signedInPhones: { active: number; new7: number };
  recent: { idShort: string; tripType: string; status: string; members: number; committed: number; lastActive: string | null }[];
}

/** The slice of D1 this needs, so tests can run it against plain SQLite. */
export interface StatsDb {
  prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }> } };
}

const NOT_DEMO = `trip_id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}')`;

export async function usageStats(db: StatsDb, now = new Date()): Promise<UsageStats> {
  const nowIso = now.toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const [funnelRows, statusRows, phoneRows, recentRows] = await Promise.all([
    db
      .prepare(`SELECT step, COUNT(*) AS total, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS last7 FROM funnel_events WHERE ${NOT_DEMO} GROUP BY step`)
      .bind(weekAgo)
      .all<{ step: string; total: number; last7: number }>(),
    db
      .prepare(`SELECT status, COUNT(*) AS count FROM trips WHERE id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}') GROUP BY status`)
      .bind()
      .all<{ status: string; count: number }>(),
    db
      .prepare("SELECT SUM(CASE WHEN expires_at > ? THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS new7 FROM sessions WHERE demo = 0")
      .bind(nowIso, weekAgo)
      .all<{ active: number | null; new7: number | null }>(),
    db
      .prepare(
        `SELECT t.id AS id, t.trip_type AS tripType, t.status AS status,
           (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status != 'off_trip') AS members,
           (SELECT COUNT(*) FROM trip_members m WHERE m.trip_id = t.id AND m.status = 'committed') AS committed,
           COALESCE((SELECT MAX(e.at) FROM trip_events e WHERE e.trip_id = t.id), (SELECT MAX(f.at) FROM funnel_events f WHERE f.trip_id = t.id)) AS lastActive
         FROM trips t WHERE t.id NOT IN ('${DEMO_TRIP_ID}', '${LAKE_TRIP_ID}')
         ORDER BY lastActive IS NULL, lastActive DESC LIMIT 50`,
      )
      .bind()
      .all<{ id: string; tripType: string; status: string; members: number; committed: number; lastActive: string | null }>(),
  ]);
  const byStep = new Map(funnelRows.results.map((row) => [row.step, row]));
  const byStatus = statusRows.results.map((row) => ({ status: row.status, count: Number(row.count) }));
  return {
    generatedAt: nowIso,
    funnel: FUNNEL_STEPS.map((step) => ({ step, total: Number(byStep.get(step)?.total ?? 0), last7: Number(byStep.get(step)?.last7 ?? 0) })),
    trips: { total: byStatus.reduce((sum, row) => sum + row.count, 0), byStatus },
    signedInPhones: { active: Number(phoneRows.results[0]?.active ?? 0), new7: Number(phoneRows.results[0]?.new7 ?? 0) },
    recent: recentRows.results.map((row) => ({
      idShort: row.id.slice(0, 8),
      tripType: row.tripType,
      status: row.status,
      members: Number(row.members),
      committed: Number(row.committed),
      lastActive: row.lastActive,
    })),
  };
}

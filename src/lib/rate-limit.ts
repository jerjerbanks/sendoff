/**
 * A strict per-key counter in D1, in fixed one-minute windows. It backs up
 * Cloudflare's Workers Rate Limiting binding, which never refused anything on
 * the live Worker. Fixed windows mean a burst straddling a minute boundary can
 * get up to twice the limit through; that's fine for stopping floods.
 */

export const RATE_WINDOW_MS = 60_000;

/** Attempts allowed per key per window. */
export const RATE_LIMITS = { join: 10, create: 5 } as const;
export type RateBucket = keyof typeof RATE_LIMITS;

export function rateWindow(nowMs: number): number {
  return Math.floor(nowMs / RATE_WINDOW_MS);
}

/** Windows older than this many minutes are deleted as new hits arrive. */
const KEEP_WINDOWS = 2;

/** Drop finished windows. Runs in the same batch as the count, so the table stays tiny. */
export const PRUNE_SQL = "DELETE FROM rate_hits WHERE win < ?";

/** Count one attempt and return the running total for this key, bucket and window. */
export const HIT_SQL =
  "INSERT INTO rate_hits (key, bucket, win, n) VALUES (?, ?, ?, 1) " +
  "ON CONFLICT (key, bucket, win) DO UPDATE SET n = n + 1 RETURNING n";

/** The slice of D1Database this needs, so tests can run it against plain SQLite. */
export interface RateDb {
  prepare(sql: string): { bind(...values: unknown[]): unknown };
  batch(statements: unknown[]): Promise<{ results?: unknown[] }[]>;
}

/**
 * Record one attempt and say how many this key has made in the current window,
 * this one included. Throws if the table is missing (migration 0008 not run).
 */
export async function countHit(db: RateDb, key: string, bucket: RateBucket, nowMs: number): Promise<number> {
  const win = rateWindow(nowMs);
  const [, hit] = await db.batch([
    db.prepare(PRUNE_SQL).bind(win - KEEP_WINDOWS),
    db.prepare(HIT_SQL).bind(key, bucket, win),
  ]);
  const row = hit?.results?.[0] as { n?: number } | undefined;
  return Number(row?.n ?? 0);
}

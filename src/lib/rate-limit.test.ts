import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { countHit, RATE_WINDOW_MS, rateWindow, type RateDb } from "./rate-limit";

/** Just enough of D1's prepare/bind/batch on top of better-sqlite3 to run the real SQL. */
function fakeD1(sqlite: Database.Database): RateDb {
  return {
    prepare: (sql) => ({ bind: (...values: unknown[]) => ({ sql, values }) }),
    batch: async (statements) =>
      sqlite.transaction(() =>
        (statements as { sql: string; values: unknown[] }[]).map(({ sql, values }) => {
          const stmt = sqlite.prepare(sql);
          return stmt.reader ? { results: stmt.all(...values) } : (stmt.run(...values), { results: [] });
        }),
      )(),
  };
}

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(readFileSync("migrations/0008_rate_hits.sql", "utf8"));
  return { sqlite, db: fakeD1(sqlite) };
}

describe("D1 rate limiter", () => {
  const t0 = 1_800_000_000_000 - (1_800_000_000_000 % RATE_WINDOW_MS);

  it("counts each attempt per key and bucket within a window", async () => {
    const { db } = freshDb();
    const counts = [];
    for (let i = 0; i < 12; i++) counts.push(await countHit(db, "ip-a", "join", t0 + i * 1000));
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(await countHit(db, "ip-b", "join", t0)).toBe(1);
    expect(await countHit(db, "ip-a", "create", t0)).toBe(1);
  });

  it("starts over in the next window and prunes old windows", async () => {
    const { sqlite, db } = freshDb();
    await countHit(db, "ip-a", "join", t0);
    await countHit(db, "ip-a", "join", t0);
    expect(await countHit(db, "ip-a", "join", t0 + RATE_WINDOW_MS)).toBe(1);
    await countHit(db, "ip-z", "join", t0 + 3 * RATE_WINDOW_MS);
    const wins = sqlite.prepare("SELECT DISTINCT win FROM rate_hits ORDER BY win").all() as { win: number }[];
    expect(wins.map((r) => r.win)).toEqual([rateWindow(t0) + 1, rateWindow(t0) + 3]);
  });

  it("throws when the table is missing, so the caller can fail open and warn", async () => {
    const db = fakeD1(new Database(":memory:"));
    await expect(countHit(db, "ip-a", "join", t0)).rejects.toThrow(/rate_hits/);
  });
});

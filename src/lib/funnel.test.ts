import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "./constants";
import { recordFunnel, type FunnelDb } from "./funnel";

function fakeD1(sqlite: Database.Database): FunnelDb {
  return { prepare: (sql) => ({ bind: (...values: unknown[]) => ({ run: async () => sqlite.prepare(sql).run(...values) }) }) };
}

/** Every migration, 0001 to the newest, in order, on an empty database. */
function migratedDb() {
  const sqlite = new Database(":memory:");
  const files = readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  return { sqlite, db: fakeD1(sqlite), files };
}

const counts = (sqlite: Database.Database) =>
  Object.fromEntries((sqlite.prepare("SELECT step, COUNT(*) AS n FROM funnel_events GROUP BY step").all() as { step: string; n: number }[]).map((row) => [row.step, row.n]));

describe("funnel events", () => {
  it("every migration applies cleanly from empty, and 0010 is re-runnable", () => {
    const { sqlite, files } = migratedDb();
    expect(files).toContain("0010_funnel_events.sql");
    expect(() => sqlite.exec(readFileSync("migrations/0010_funnel_events.sql", "utf8"))).not.toThrow();
  });

  it("create → join → vote twice → commit is exactly one row per step for that member", async () => {
    const { sqlite, db } = migratedDb();
    await recordFunnel(db, "t1", "org", "trip_created");
    await recordFunnel(db, "t1", "sam", "member_joined");
    await recordFunnel(db, "t1", "sam", "voted");
    await recordFunnel(db, "t1", "sam", "voted");
    await recordFunnel(db, "t1", "sam", "committed");
    await recordFunnel(db, "t1", "sam", "committed");
    expect(counts(sqlite)).toEqual({ trip_created: 1, member_joined: 1, voted: 1, committed: 1 });
    // Another member, or the same member on another trip, counts separately.
    await recordFunnel(db, "t1", "org", "voted");
    await recordFunnel(db, "t2", "sam", "voted");
    expect(counts(sqlite).voted).toBe(3);
  });

  it("never writes for the demo trips", async () => {
    const { sqlite, db } = migratedDb();
    for (const trip of [DEMO_TRIP_ID, LAKE_TRIP_ID]) {
      await recordFunnel(db, trip, "user_taylor", "member_joined");
      await recordFunnel(db, trip, "user_taylor", "voted");
      await recordFunnel(db, trip, "user_taylor", "committed");
    }
    expect(counts(sqlite)).toEqual({});
  });

  it("a failed write never throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: FunnelDb = { prepare: () => ({ bind: () => ({ run: async () => Promise.reject(new Error("D1 down")) }) }) };
    await expect(recordFunnel(broken, "t1", "sam", "voted")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("rows delete by trip_id", async () => {
    const { sqlite, db } = migratedDb();
    await recordFunnel(db, "t1", "sam", "voted");
    await recordFunnel(db, "t2", "sam", "voted");
    sqlite.prepare("DELETE FROM funnel_events WHERE trip_id = ?").run("t1");
    expect(counts(sqlite)).toEqual({ voted: 1 });
  });
});

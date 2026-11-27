import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAX_PING_SECONDS, pingSeconds, recordActivity, recordInviteOpen, tripIdFromPath, type ActivityDb } from "./activity";
import { DEMO_TRIP_ID } from "./constants";

function freshDb() {
  const db = new Database(":memory:");
  const dir = path.join(__dirname, "../../migrations");
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  const adb: ActivityDb = { prepare: (sql) => ({ bind: (...values) => ({ run: async () => db.prepare(sql).run(...values) }) }) };
  return { db, adb };
}

describe("activity pings", () => {
  it("clamps what the browser claims", () => {
    expect(pingSeconds(30)).toBe(30);
    expect(pingSeconds(10_000)).toBe(MAX_PING_SECONDS);
    expect(pingSeconds(-5)).toBe(0);
    expect(pingSeconds("x")).toBe(0);
    expect(pingSeconds(undefined)).toBe(0);
  });

  it("reads the trip from the page path", () => {
    expect(tripIdFromPath("/trip/abc12345-6789/vote")).toBe("abc12345-6789");
    expect(tripIdFromPath("/trip/abc12345")).toBe("abc12345");
    expect(tripIdFromPath("/trips")).toBe("");
    expect(tripIdFromPath("/trip/../admin")).toBe("");
    expect(tripIdFromPath(42)).toBe("");
  });

  it("keeps one row per person, trip and day, and fast repeat pings can't inflate it", async () => {
    const { db, adb } = freshDb();
    const t0 = Date.parse("2026-11-27T10:00:00Z");
    await recordActivity(adb, "u1", "trip-1", 60, new Date(t0));
    await recordActivity(adb, "u1", "trip-1", 60, new Date(t0 + 60_000));
    // Ten replays in the same second add at most 2 s each.
    for (let i = 0; i < 10; i += 1) await recordActivity(adb, "u1", "trip-1", 60, new Date(t0 + 60_000));
    const rows = db.prepare("SELECT * FROM activity_days").all() as { seconds: number; pings: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].seconds).toBeLessThanOrEqual(120 + 10 * 2);
    expect(rows[0].seconds).toBeGreaterThanOrEqual(120);
    expect(rows[0].pings).toBe(12);
  });

  it("never records the demo trips", async () => {
    const { db, adb } = freshDb();
    expect(await recordActivity(adb, "u1", DEMO_TRIP_ID, 60)).toBe(false);
    expect(await recordInviteOpen(adb, DEMO_TRIP_ID)).toBe(false);
    expect(await recordInviteOpen(adb, "trip-1")).toBe(true);
    expect(db.prepare("SELECT COUNT(*) AS n FROM activity_days").get()).toEqual({ n: 0 });
    expect(db.prepare("SELECT opens FROM invite_opens").all()).toEqual([{ opens: 1 }]);
  });
});

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { usageStats, type StatsDb } from "./admin-stats";
import { DEMO_TRIP_ID } from "./constants";

function freshDb() {
  const db = new Database(":memory:");
  const dir = path.join(__dirname, "../../migrations");
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) db.exec(fs.readFileSync(path.join(dir, file), "utf8"));
  const stats: StatsDb = {
    prepare: (sql) => ({ bind: (...values) => ({ all: async <T,>() => ({ results: db.prepare(sql).all(...values) as T[] }) }) }),
  };
  return { db, stats };
}

function addTrip(db: Database.Database, id: string, name: string, status = "voting") {
  db.prepare(
    `INSERT INTO trips (id, name, trip_type, organizer_id, guest_of_honor_user_id, date_window, status, buy_in_amount, min_headcount, max_headcount, bed_change_policy, honoree_excluded_from_split, invite_token)
     VALUES (?, ?, 'adult', 'u1', '', 'May', ?, 0, 5, 10, 'member_requests', 0, ?)`,
  ).run(id, name, status, `tok-${id}`);
}

describe("usageStats", () => {
  it("counts real trips and funnel steps, leaves out the demo, and carries no names", async () => {
    const { db, stats } = freshDb();
    const now = new Date("2026-11-26T12:00:00Z");
    addTrip(db, "trip-aaaaaaaa-1", "Secret Cabin Weekend");
    addTrip(db, "trip-bbbbbbbb-2", "Other Trip", "booked");
    addTrip(db, DEMO_TRIP_ID, "Demo");
    const member = db.prepare("INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, ?, ?)");
    member.run("trip-aaaaaaaa-1", "u1", "organizer", "committed");
    member.run("trip-aaaaaaaa-1", "u2", "member", "joined");
    member.run("trip-aaaaaaaa-1", "u3", "member", "off_trip");
    const step = db.prepare("INSERT INTO funnel_events (trip_id, user_id, step, at) VALUES (?, ?, ?, ?)");
    step.run("trip-aaaaaaaa-1", "u1", "trip_created", "2026-11-25T00:00:00Z");
    step.run("trip-bbbbbbbb-2", "u9", "trip_created", "2026-10-01T00:00:00Z");
    step.run("trip-aaaaaaaa-1", "u2", "member_joined", "2026-11-25T01:00:00Z");
    step.run(DEMO_TRIP_ID, "u5", "member_joined", "2026-11-25T01:00:00Z");
    db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, demo) VALUES (?, ?, ?, ?, ?)").run("h1", "u1", "2026-11-25T00:00:00Z", "2027-11-25T00:00:00Z", 0);
    db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, demo) VALUES (?, ?, ?, ?, ?)").run("h2", "u5", "2026-11-25T00:00:00Z", "2026-11-27T00:00:00Z", 1);

    const result = await usageStats(stats, now);
    expect(result.trips.total).toBe(2);
    expect(result.funnel.find((row) => row.step === "trip_created")).toEqual({ step: "trip_created", total: 2, last7: 1 });
    expect(result.funnel.find((row) => row.step === "member_joined")).toEqual({ step: "member_joined", total: 1, last7: 1 });
    expect(result.funnel.find((row) => row.step === "committed")).toEqual({ step: "committed", total: 0, last7: 0 });
    expect(result.signedInPhones).toEqual({ active: 1, new7: 1 });
    const cabin = result.recent.find((row) => row.idShort === "trip-aaa");
    expect(cabin).toMatchObject({ members: 2, committed: 1, status: "voting" });
    expect(JSON.stringify(result)).not.toContain("Secret Cabin");
    expect(JSON.stringify(result)).not.toContain(DEMO_TRIP_ID);
  });
});

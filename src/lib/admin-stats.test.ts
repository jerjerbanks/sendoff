import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDuration, insights, maskContact, usageStats, type StatsDb } from "./admin-stats";
import { recordActivity, recordInviteOpen, type ActivityDb } from "./activity";
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

describe("insights", () => {
  function seed() {
    const { db, stats } = freshDb();
    addTrip(db, "trip-aaaaaaaa-1", "Scottsdale Golf");
    addTrip(db, "trip-mine0000-2", "My Test Trip");
    addTrip(db, DEMO_TRIP_ID, "Demo");
    const user = db.prepare("INSERT INTO users (id, name, contact) VALUES (?, ?, ?)");
    user.run("u1", "Alex Organizer", "alex.organizer@example.com");
    user.run("u2", "Bea Joiner", "(555) 123-4567");
    user.run("u3", "Cal Asker", "cal@example.com");
    user.run("me1", "Jeremy", "+1 555 999 0000");
    user.run("me2", "Jeremy", "5559990000");
    user.run("h1", "Honoree Hank", "");
    user.run("d1", "Demo Person", "demo@example.com");
    db.prepare("UPDATE trips SET organizer_id = 'me2' WHERE id = 'trip-mine0000-2'").run();
    const member = db.prepare("INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, ?, ?)");
    member.run("trip-aaaaaaaa-1", "u1", "organizer", "joined");
    member.run("trip-aaaaaaaa-1", "u2", "member", "committed");
    member.run("trip-aaaaaaaa-1", "me1", "member", "joined");
    member.run("trip-aaaaaaaa-1", "h1", "honoree", "committed");
    member.run("trip-mine0000-2", "me2", "organizer", "joined");
    member.run(DEMO_TRIP_ID, "d1", "member", "joined");
    db.prepare("INSERT INTO join_requests (trip_id, user_id, status, created_at) VALUES (?, ?, ?, ?)").run("trip-aaaaaaaa-1", "u3", "pending", "2026-11-26T09:00:00Z");
    const step = db.prepare("INSERT INTO funnel_events (trip_id, user_id, step, at) VALUES (?, ?, ?, ?)");
    step.run("trip-aaaaaaaa-1", "u1", "trip_created", "2026-11-25T00:00:00Z");
    step.run("trip-aaaaaaaa-1", "u2", "member_joined", "2026-11-25T02:00:00Z");
    step.run("trip-aaaaaaaa-1", "u2", "voted", "2026-11-25T03:00:00Z");
    step.run("trip-aaaaaaaa-1", "me1", "member_joined", "2026-11-25T04:00:00Z");
    // A private budget exists: its amount and notes must never reach the admin page.
    db.prepare("INSERT INTO private_budgets (trip_id, user_id, max_all_in, flex_note, must_haves, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      "trip-aaaaaaaa-1",
      "u2",
      987654,
      "secret flex note",
      "secret must have",
      "2026-11-25T03:00:00Z",
    );
    return { db, stats };
  }

  it("lists who is trying it with masked contacts, invites and time, and never budgets", async () => {
    const { db, stats } = seed();
    const now = new Date("2026-11-27T12:00:00Z");
    // Bea spends three one-minute pings on the trip; a fourth replayed a second later adds almost nothing.
    const t0 = Date.parse("2026-11-26T10:00:00Z");
    for (let i = 0; i < 3; i += 1) await recordActivity(activityDb(db), "u2", "trip-aaaaaaaa-1", 60, new Date(t0 + i * 60_000));
    await recordActivity(activityDb(db), "u2", "trip-aaaaaaaa-1", 60, new Date(t0 + 2 * 60_000 + 1000));
    await recordInviteOpen(activityDb(db), "trip-aaaaaaaa-1", new Date("2026-11-26T08:00:00Z"));
    await recordInviteOpen(activityDb(db), "trip-aaaaaaaa-1", new Date("2026-11-26T08:05:00Z"));
    await recordInviteOpen(activityDb(db), DEMO_TRIP_ID, new Date("2026-11-26T08:05:00Z"));

    const result = await insights(stats, { userId: "me1" }, now);
    const text = JSON.stringify(result);
    expect(text).not.toContain("987654");
    expect(text).not.toContain("9876");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("alex.organizer@example.com");
    expect(text).not.toContain("123-4567");
    expect(text).not.toContain("Demo Person");

    const bea = result.people.find((person) => person.name === "Bea Joiner")!;
    expect(bea.contact).toBe("•••-•••-4567");
    // The replay adds at most the 1 s since the last ping plus 2 s of slack.
    expect(bea.seconds).toBeGreaterThanOrEqual(180);
    expect(bea.seconds).toBeLessThanOrEqual(183);
    expect(bea.trips).toEqual([{ tripShort: "trip-aaa", tripName: "Scottsdale Golf", role: "member", status: "committed", organizerName: "Alex Organizer" }]);
    expect(result.people.find((person) => person.name === "Alex Organizer")!.contact).toBe("al…@example.com");
    expect(result.people.find((person) => person.name === "Cal Asker")!.trips[0]).toMatchObject({ role: "asked", status: "pending" });
    // Honorees are names an organizer typed in, not testers.
    expect(result.people.some((person) => person.name === "Honoree Hank")).toBe(false);
    // Both of Jeremy's sign-ins share a phone number: one person, marked as you.
    const mine = result.people.filter((person) => person.isYou);
    expect(mine).toHaveLength(1);
    expect(mine[0].trips.map((trip) => trip.tripName).sort()).toEqual(["My Test Trip", "Scottsdale Golf"]);
    expect(result.summary.testers).toBe(3);

    const golf = result.trips.find((trip) => trip.name === "Scottsdale Golf")!;
    expect(golf).toMatchObject({ mine: false, organizerName: "Alex Organizer", inviteOpens: 2, waiting: 1, invitesJoined: 2, seconds: bea.seconds });
    expect(golf.people.map((person) => person.name)).toEqual(["Alex Organizer", "Bea Joiner", "Jeremy", "Honoree Hank"]);
    expect(golf.people.find((person) => person.name === "Bea Joiner")).toMatchObject({ voted: true, committed: true, joinedAt: "2026-11-25T02:00:00Z" });
    expect(golf.people.find((person) => person.name === "Honoree Hank")).toMatchObject({ committed: false });
    expect(result.trips.find((trip) => trip.name === "My Test Trip")!.mine).toBe(true);
    expect(result.trips.some((trip) => trip.name === "Demo")).toBe(false);
    expect(result.summary).toMatchObject({ inviteOpens: 2, invitesJoined: 2, testerSeconds: bea.seconds });
  });

  it("marks nobody when the admin isn't signed in to the app", async () => {
    const { stats } = seed();
    const result = await insights(stats, null, new Date("2026-11-27T12:00:00Z"));
    expect(result.people.some((person) => person.isYou)).toBe(false);
    expect(result.summary.testers).toBe(result.people.length);
  });
});

describe("maskContact and formatDuration", () => {
  it("masks emails and phones", () => {
    expect(maskContact("jeremy@gmail.com")).toBe("je…@gmail.com");
    expect(maskContact("+1 (312) 555-0199")).toBe("•••-•••-0199");
    expect(maskContact("")).toBe("");
  });
  it("formats durations", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(12 * 60)).toBe("12m");
    expect(formatDuration(65 * 60)).toBe("1h 05m");
  });
});

function activityDb(db: Database.Database): ActivityDb {
  return { prepare: (sql) => ({ bind: (...values) => ({ run: async () => db.prepare(sql).run(...values) }) }) };
}

import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_TRIP_ID } from "./constants";
import {
  cleanCode,
  codeHash,
  deliverable,
  MAX_ATTEMPTS,
  MAX_SENDS_PER_EMAIL,
  personForEmail,
  redeemCode,
  requestCode,
  safeNext,
  signInEmail,
  type CodeDb,
} from "./sign-in-code";
import { newToken } from "./tokens";
import { signInEmailBody } from "./email-body";

function codeDb(sqlite: Database.Database): CodeDb {
  return {
    all: async <T,>(sql: string, ...values: unknown[]) => sqlite.prepare(sql).all(...values) as T[],
    run: async (sql, ...values) => ({ changes: sqlite.prepare(sql).run(...values).changes }),
  };
}

/** Every migration on an empty database, plus a couple of people on a real trip. */
function setup() {
  const sqlite = new Database(":memory:");
  for (const file of readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(`migrations/${file}`, "utf8"));
  }
  const trip = sqlite.prepare("INSERT INTO trips (id, name, trip_type, organizer_id, guest_of_honor_user_id, date_window, status, buy_in_amount, min_headcount, max_headcount, bed_change_policy, honoree_excluded_from_split, invite_token) VALUES (?, 'T', 'golf', 'u1', 'u1', 'May', 'planning', 0, 1, 10, 'locked', 0, ?)");
  const user = sqlite.prepare("INSERT INTO users (id, name, contact, claimed) VALUES (?, ?, ?, ?)");
  const member = sqlite.prepare("INSERT INTO trip_members (trip_id, user_id, role, status) VALUES (?, ?, 'member', 'joined')");
  return { sqlite, db: codeDb(sqlite), trip, user, member };
}

const now = new Date("2026-11-27T15:00:00Z");
const later = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe("email sign-in codes", () => {
  it("migration 0016 re-runs cleanly", () => {
    const { sqlite } = setup();
    expect(() => sqlite.exec(readFileSync("migrations/0016_sign_in_codes.sql", "utf8"))).not.toThrow();
  });

  it("signs in the person with that email, once, only in the browser that asked", async () => {
    const { sqlite, db, trip, user, member } = setup();
    trip.run("trip_a", "INV_A");
    user.run("u_maya", "Maya", "Maya@Gmail.com ", 1);
    member.run("trip_a", "u_maya");
    const ticket = newToken();
    const sent = await requestCode(db, ticket, signInEmail(" maya@gmail.com")!, now);
    expect(sent.send).toBe(true);
    if (!sent.send) return;
    // Nothing readable is stored.
    const stored = sqlite.prepare("SELECT * FROM sign_in_codes").all() as Record<string, string>[];
    expect(JSON.stringify(stored)).not.toContain(sent.code);
    expect(JSON.stringify(stored)).not.toContain(ticket);
    // Another browser can't use the code.
    expect(await redeemCode(db, newToken(), sent.code, later(1))).toEqual({ ok: false, reason: "expired" });
    expect(await redeemCode(db, ticket, `${sent.code.slice(0, 3)} ${sent.code.slice(3)}`, later(1))).toEqual({ ok: true, userId: "u_maya" });
    // Works once.
    expect(await redeemCode(db, ticket, sent.code, later(2))).toEqual({ ok: false, reason: "expired" });
  });

  it("expires after the window and after too many wrong tries", async () => {
    const { db, trip, user, member } = setup();
    trip.run("trip_a", "INV_A");
    user.run("u_maya", "Maya", "maya@gmail.com", 1);
    member.run("trip_a", "u_maya");
    const late = newToken();
    const first = await requestCode(db, late, "maya@gmail.com", now);
    if (!first.send) throw new Error("no code");
    expect(await redeemCode(db, late, first.code, later(11))).toEqual({ ok: false, reason: "expired" });

    const ticket = newToken();
    const second = await requestCode(db, ticket, "maya@gmail.com", later(1));
    if (!second.send) throw new Error("no code");
    const wrong = second.code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_ATTEMPTS; i++) expect(await redeemCode(db, ticket, wrong, later(2))).toEqual({ ok: false, reason: "wrong" });
    expect(await redeemCode(db, ticket, second.code, later(2))).toEqual({ ok: false, reason: "expired" });
  });

  it("sends nothing for unknown, demo, deleted-trip or placeholder emails, and caps sends per email", async () => {
    const { sqlite, db, trip, user, member } = setup();
    trip.run(DEMO_TRIP_ID, "GOLF");
    user.run("u_demo", "Evan", "evan@gmail.com", 1);
    member.run(DEMO_TRIP_ID, "u_demo");
    trip.run("trip_gone", "GONE");
    sqlite.prepare("UPDATE trips SET deleted_at = '2026-11-02' WHERE id = 'trip_gone'").run();
    user.run("u_gone", "Gone", "gone@gmail.com", 1);
    member.run("trip_gone", "u_gone");
    expect(await requestCode(db, newToken(), "nobody@gmail.com", now)).toEqual({ send: false, reason: "unknown" });
    expect(await requestCode(db, newToken(), "evan@gmail.com", now)).toEqual({ send: false, reason: "unknown" });
    expect(await requestCode(db, newToken(), "gone@gmail.com", now)).toEqual({ send: false, reason: "unknown" });
    expect(await requestCode(db, newToken(), "evan.brooks@example.com", now)).toEqual({ send: false, reason: "undeliverable" });
    // A decoy looks like any other code: wrong, not expired, and keeps no email.
    const decoy = newToken();
    await requestCode(db, decoy, "nobody@gmail.com", now);
    expect(await redeemCode(db, decoy, "123456", later(1))).toEqual({ ok: false, reason: "wrong" });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM sign_in_codes WHERE email LIKE '%nobody%'").get()).toEqual({ n: 0 });

    trip.run("trip_a", "INV_A");
    user.run("u_kim", "Kim", "kim@gmail.com", 1);
    member.run("trip_a", "u_kim");
    for (let i = 0; i < MAX_SENDS_PER_EMAIL; i++) expect((await requestCode(db, newToken(), "kim@gmail.com", later(i))).send).toBe(true);
    expect(await requestCode(db, newToken(), "kim@gmail.com", later(3))).toEqual({ send: false, reason: "too_many" });
    expect((await requestCode(db, newToken(), "kim@gmail.com", later(12))).send).toBe(true);
  });

  it("picks the person on the most trips when one email joined trips separately", async () => {
    const { db, trip, user, member } = setup();
    trip.run("trip_a", "A");
    trip.run("trip_b", "B");
    user.run("u_one", "Sam", "sam@gmail.com", 1);
    user.run("u_two", "Sam", "SAM@gmail.com", 0);
    member.run("trip_a", "u_one");
    member.run("trip_a", "u_two");
    member.run("trip_b", "u_two");
    expect(await personForEmail(db, "sam@gmail.com")).toBe("u_two");
  });

  it("normalizes input and keeps redirects on our own pages", () => {
    expect(signInEmail("  Maya@Gmail.COM ")).toBe("maya@gmail.com");
    expect(signInEmail("312-555-0142")).toBeNull();
    expect(cleanCode("12 34-56")).toBe("123456");
    expect(deliverable("a@sub.example.com")).toBe(false);
    expect(deliverable("a@gmail.com")).toBe(true);
    expect(deliverable("a@example.org")).toBe(false);
    expect(deliverable("a@thing.test")).toBe(false);
    expect(codeHash("t", "123456")).toMatch(/^[0-9a-f]{64}$/);
    expect(safeNext("/trip/trip_abc")).toBe("/trip/trip_abc");
    expect(safeNext("/join/aB3x9Qk_z1Lm")).toBe("/join/aB3x9Qk_z1Lm");
    expect(safeNext("//evil.com")).toBe("/trips");
    expect(safeNext("https://evil.com")).toBe("/trips");
    expect(safeNext("/trip/x/../../admin")).toBe("/trips");
  });

  it("the email carries the code in the subject, text and html", () => {
    const body = signInEmailBody("042817");
    expect(body.subject).toContain("042817");
    expect(body.text).toContain("042817");
    expect(body.html).toContain("042817");
  });
});

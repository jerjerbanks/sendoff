import crypto from "node:crypto";
import { DEMO_TRIP_ID, LAKE_TRIP_ID, RETIRED_DEMO_TRIP_ID } from "./constants";
import { contactKey } from "./tokens";

/** The few D1 calls used here (typed locally so this file also loads in plain Node tests). */
interface SendoffD1 {
  prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results?: T[] }>; run(): Promise<{ meta: { changes?: number } }> } };
}

/**
 * Email sign-in codes. Someone types the email they joined with; if it belongs to a
 * person on a real trip, a 6-digit code goes to that inbox. The code only works in the
 * browser that asked (it's bound to a random ticket in that browser's cookie), for 10
 * minutes, for 5 tries. The page never says whether an email is on a trip.
 */

export const CODE_MINUTES = 10;
export const MAX_ATTEMPTS = 5;
/** Codes one email can be sent in CODE_MINUTES, so nobody can flood someone's inbox. */
export const MAX_SENDS_PER_EMAIL = 3;

/** The slice of D1 this needs, so tests can run the real SQL on plain SQLite. */
export interface CodeDb {
  all<T>(sql: string, ...values: unknown[]): Promise<T[]>;
  run(sql: string, ...values: unknown[]): Promise<{ changes: number }>;
}

export function d1CodeDb(d1: SendoffD1): CodeDb {
  return {
    all: async <T,>(sql: string, ...values: unknown[]) => ((await d1.prepare(sql).bind(...values).all<T>()).results ?? []) as T[],
    run: async (sql, ...values) => ({ changes: (await d1.prepare(sql).bind(...values).run()).meta.changes ?? 0 }),
  };
}

/** 000000 to 999999, uniformly. */
export function newCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function codeHash(ticket: string, code: string): string {
  return crypto.createHash("sha256").update(`${ticket}:${code}`).digest("hex");
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** A plausible email, normalized the way joins compare contacts. Null for anything else. */
export function signInEmail(raw: string): string | null {
  const key = contactKey(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) && key.length <= 120 ? key : null;
}

/** Reserved and placeholder domains (honorees without a contact, the demo people): never mailed. */
export function deliverable(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  if (/(^|\.)example\.(com|net|org)$/.test(domain) || domain === "localhost") return false;
  return !/\.(test|invalid|example|localhost)$/.test(domain);
}

/** Only digits, so "123 456" and "123-456" work too. */
export function cleanCode(raw: string): string {
  return raw.replace(/\D/g, "");
}

const DEMO_IDS = [DEMO_TRIP_ID, LAKE_TRIP_ID, RETIRED_DEMO_TRIP_ID];

/**
 * The person an email signs in as: someone with that email on a real, not-deleted trip.
 * One email can belong to more than one person (joined two trips separately); the one on
 * the most trips wins, then the one who has signed in before.
 */
export async function personForEmail(db: CodeDb, email: string): Promise<string | null> {
  const rows = await db.all<{ id: string }>(
    `SELECT u.id AS id FROM users u
       JOIN trip_members m ON m.user_id = u.id
       JOIN trips t ON t.id = m.trip_id
      WHERE lower(trim(u.contact)) = ? AND t.deleted_at IS NULL AND t.id NOT IN (?, ?, ?)
      GROUP BY u.id
      ORDER BY COUNT(*) DESC, u.claimed DESC, u.id
      LIMIT 1`,
    email,
    ...DEMO_IDS,
  );
  return rows[0]?.id ?? null;
}

export type CodeRequest =
  | { send: false; reason: "unknown" | "undeliverable" | "too_many" }
  | { send: true; code: string };

/**
 * Record a code for `ticket` if the email is someone's and hasn't had too many lately.
 * Whatever this returns, the page looks the same, so it can't be used to test emails.
 */
export async function requestCode(db: CodeDb, ticket: string, email: string, now: Date): Promise<CodeRequest> {
  // Old rows only slow the lookups; the index keeps this cheap.
  await db.run("DELETE FROM sign_in_codes WHERE expires_at < ?", new Date(now.getTime() - 86_400_000).toISOString());
  const result = await decide(db, email, now);
  // Every ask gets a row, so a wrong code reads the same for any email. A decoy (nobody
  // to sign in, no email kept) holds a random code nobody is sent, and can never succeed.
  const code = result.send ? result.code : newCode();
  await db.run(
    `INSERT OR REPLACE INTO sign_in_codes (ticket_hash, email, user_id, code_hash, created_at, expires_at, attempts, used_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
    sha256(ticket),
    result.send ? email : "",
    result.send ? result.userId : "",
    codeHash(ticket, code),
    now.toISOString(),
    new Date(now.getTime() + CODE_MINUTES * 60_000).toISOString(),
  );
  return result.send ? { send: true, code } : result;
}

async function decide(db: CodeDb, email: string, now: Date): Promise<({ send: true; code: string; userId: string }) | Extract<CodeRequest, { send: false }>> {
  if (!deliverable(email)) return { send: false, reason: "undeliverable" };
  const userId = await personForEmail(db, email);
  if (!userId) return { send: false, reason: "unknown" };
  const since = new Date(now.getTime() - CODE_MINUTES * 60_000).toISOString();
  const recent = await db.all<{ n: number }>("SELECT COUNT(*) AS n FROM sign_in_codes WHERE email = ? AND created_at > ?", email, since);
  if (Number(recent[0]?.n ?? 0) >= MAX_SENDS_PER_EMAIL) return { send: false, reason: "too_many" };
  return { send: true, code: newCode(), userId };
}

export type CodeCheck = { ok: true; userId: string } | { ok: false; reason: "wrong" | "expired" };

/**
 * Check a typed code against this browser's ticket. Every try counts, right or wrong;
 * after MAX_ATTEMPTS the code is dead. A right code works once.
 */
export async function redeemCode(db: CodeDb, ticket: string, typed: string, now: Date): Promise<CodeCheck> {
  const ticketHash = sha256(ticket);
  const nowIso = now.toISOString();
  // Spend a try first, atomically, so parallel guesses can't share one count.
  const spent = await db.run(
    "UPDATE sign_in_codes SET attempts = attempts + 1 WHERE ticket_hash = ? AND used_at IS NULL AND expires_at > ? AND attempts < ?",
    ticketHash,
    nowIso,
    MAX_ATTEMPTS,
  );
  if (spent.changes === 0) return { ok: false, reason: "expired" };
  const row = (await db.all<{ user_id: string; code_hash: string; email: string }>(
    "SELECT user_id, code_hash, email FROM sign_in_codes WHERE ticket_hash = ?",
    ticketHash,
  ))[0];
  const code = cleanCode(typed);
  if (!row || !row.user_id || code.length !== 6) return { ok: false, reason: "wrong" };
  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(codeHash(ticket, code), "hex");
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return { ok: false, reason: "wrong" };
  const used = await db.run("UPDATE sign_in_codes SET used_at = ? WHERE ticket_hash = ? AND used_at IS NULL", nowIso, ticketHash);
  if (used.changes === 0) return { ok: false, reason: "expired" };
  // Any other code for this email is now pointless.
  if (row.email) await db.run("UPDATE sign_in_codes SET used_at = ? WHERE email = ? AND used_at IS NULL", nowIso, row.email);
  return { ok: true, userId: row.user_id };
}

/** Where to go after signing in: only our own trip, join and trips pages. */
export function safeNext(raw: string | null | undefined): string {
  const value = String(raw ?? "");
  return /^\/(trips|trip\/[A-Za-z0-9_-]{1,64}|join\/[A-Za-z0-9_-]{1,64})$/.test(value) ? value : "/trips";
}

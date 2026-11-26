import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "./constants";
import { getDb } from "./db";
import { sessions, signInLinks, users } from "./schema";
import { hashToken, newToken, plausibleToken } from "./tokens";

export { plausibleToken };

const DAY_MS = 86_400_000;
/** A real sign-in lasts as long as a browser keeps a cookie. Sign out ends it sooner. */
const REAL_DAYS = 400;
/** Demo sign-ins are throwaway. */
const DEMO_DAYS = 2;
/** A link to sign in on another phone works once, for a short while. */
const LINK_MINUTES = 15;

/**
 * Who this browser is signed in as, from its session token. Never from an id in a
 * form or a cookie: ids are visible to everyone on a trip, tokens are not.
 */
export const getViewerId = cache(async (): Promise<string | null> => {
  return (await getViewer())?.userId ?? null;
});

/**
 * The signed-in person and whether it's a throwaway demo sign-in. Only a real
 * (non-demo) sign-in can list its trips, join another trip as itself, or start one.
 */
export const getViewer = cache(async (): Promise<{ userId: string; demo: boolean } | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!plausibleToken(token)) return null;
  const row = (
    await getDb()
      .select({ userId: sessions.userId, demo: sessions.demo })
      .from(sessions)
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
  )[0];
  return row ? { userId: row.userId, demo: row.demo === 1 } : null;
});

/**
 * Sign this browser in as `userId` with a fresh token. Any session it had ends, so
 * a planted or stale token never carries over. Only call this after proving who
 * the person is: they created the trip, joined it, or redeemed their own link.
 */
export async function startSession(userId: string, options: { demo?: boolean } = {}) {
  const jar = await cookies();
  const db = getDb();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (plausibleToken(previous)) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(previous)));
  const token = newToken();
  const now = new Date();
  const days = options.demo ? DEMO_DAYS : REAL_DAYS;
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + days * DAY_MS).toISOString(),
    demo: options.demo ? 1 : 0,
  });
  if (!options.demo) await db.update(users).set({ claimed: 1 }).where(eq(users.id, userId));
  // Now and then, clear out what has expired so the tables stay small.
  if (Math.random() < 0.02) {
    await db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString()));
    await db.delete(signInLinks).where(lt(signInLinks.expiresAt, now.toISOString()));
  }
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

/** Sign this browser out. Other phones stay signed in. */
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (plausibleToken(token)) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** A one-time link for this person to sign in on another phone. Replaces any unused one. */
export async function createSignInLink(userId: string, tripId: string): Promise<{ token: string; expiresAt: string }> {
  const db = getDb();
  await db.delete(signInLinks).where(and(eq(signInLinks.userId, userId), isNull(signInLinks.usedAt)));
  const token = newToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LINK_MINUTES * 60_000).toISOString();
  await db.insert(signInLinks).values({ tokenHash: hashToken(token), userId, tripId, createdAt: now.toISOString(), expiresAt });
  return { token, expiresAt };
}

/** Use a sign-in link. Works once: the update only matches an unused, unexpired link. */
export async function redeemSignInLink(token: string): Promise<{ userId: string; tripId: string } | null> {
  if (!plausibleToken(token)) return null;
  const now = new Date().toISOString();
  const row = (
    await getDb()
      .update(signInLinks)
      .set({ usedAt: now })
      .where(and(eq(signInLinks.tokenHash, hashToken(token)), isNull(signInLinks.usedAt), gt(signInLinks.expiresAt, now)))
      .returning({ userId: signInLinks.userId, tripId: signInLinks.tripId })
  )[0];
  return row ?? null;
}

/** Whether a sign-in link is still good, without using it (for the page that asks first). */
export async function signInLinkIsLive(token: string): Promise<boolean> {
  if (!plausibleToken(token)) return false;
  const row = (
    await getDb()
      .select({ userId: signInLinks.userId })
      .from(signInLinks)
      .where(and(eq(signInLinks.tokenHash, hashToken(token)), isNull(signInLinks.usedAt), gt(signInLinks.expiresAt, new Date().toISOString())))
  )[0];
  return !!row;
}

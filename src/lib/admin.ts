import crypto from "node:crypto";
import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { hashToken } from "./tokens";

/**
 * The operator's usage page (/admin). One shared key, set as the Worker secret ADMIN_KEY
 * (Cloudflare dashboard → Worker → Settings → Variables and Secrets). Unset or shorter
 * than 24 characters means there is no admin page at all: /admin is a 404.
 * The browser keeps only a hash of the key, in an httpOnly cookie.
 */
export const ADMIN_COOKIE = "__Host-ft_admin";
const MIN_KEY = 24;

export function adminKey(): string | null {
  const key = (env as unknown as { ADMIN_KEY?: string }).ADMIN_KEY;
  return typeof key === "string" && key.length >= MIN_KEY ? key : null;
}

export function adminCookieValue(key: string): string {
  return hashToken(`ft-admin:${key}`);
}

/** Constant-time string comparison of two hex digests (or anything else, safely). */
export function sameSecret(a: string, b: string): boolean {
  const left = crypto.createHash("sha256").update(a).digest();
  const right = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

export async function isAdmin(): Promise<boolean> {
  const key = adminKey();
  if (!key) return false;
  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  return !!cookie && sameSecret(cookie, adminCookieValue(key));
}

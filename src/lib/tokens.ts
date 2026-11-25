import crypto from "node:crypto";

/** 32 random bytes as 43 url-safe characters: unguessable, and never stored as is. */
export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** What the database keeps instead of the token. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** A token we issued is 43 url-safe characters. Anything else is not worth a lookup. */
export function plausibleToken(token: string | null | undefined): token is string {
  return !!token && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** A phone number or an email address, loosely. Contacts are how the organizer reaches people. */
export function isContact(value: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  const digits = value.replace(/\D/g, "");
  return /^[+()\d\s.-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

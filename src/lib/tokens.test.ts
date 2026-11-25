import { describe, expect, it } from "vitest";
import { contactKey, hashToken, isContact, newToken, plausibleToken } from "./tokens";

describe("session tokens", () => {
  it("are 43 url-safe characters and never repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, () => newToken()));
    expect(seen.size).toBe(200);
    for (const token of seen) expect(plausibleToken(token)).toBe(true);
  });

  it("are stored only as a SHA-256 hash", () => {
    const token = newToken();
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("reject anything that isn't one of ours, including a user id", () => {
    for (const bad of [null, undefined, "", "user_chris", "6f1c2c1e-3d87-4786-a8a3-adcef18ff1f1", "A".repeat(42), "A".repeat(44), `${"A".repeat(42)}!`]) {
      expect(plausibleToken(bad)).toBe(false);
    }
  });
});

describe("contacts", () => {
  it("accept emails and phone numbers", () => {
    for (const ok of ["maya@example.com", "j.lee+trips@mail.co.uk", "(312) 555-0142", "+1 312 555 0142", "312.555.0142"]) {
      expect(isContact(ok)).toBe(true);
    }
  });

  it("refuse everything else", () => {
    for (const bad of ["", "maya", "maya@", "@example.com", "555-01", "call me maybe", "1234567890123456", "312-555-0142 ext"]) {
      expect(isContact(bad)).toBe(false);
    }
  });
});

describe("contact keys", () => {
  it("treat formatting differences as the same contact", () => {
    expect(contactKey("(312) 555-0142")).toBe(contactKey("312-555-0142"));
    expect(contactKey("+1 312 555 0142")).toBe(contactKey("312.555.0142"));
    expect(contactKey(" Maya@Example.com ")).toBe(contactKey("maya@example.com"));
  });

  it("keep different contacts apart", () => {
    expect(contactKey("312-555-0142")).not.toBe(contactKey("312-555-0143"));
    expect(contactKey("maya@example.com")).not.toBe(contactKey("maya@example.co"));
  });
});

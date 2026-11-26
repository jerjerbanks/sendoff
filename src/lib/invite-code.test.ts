import { describe, expect, it } from "vitest";
import { inviteTokenFrom } from "./invite-code";

describe("inviteTokenFrom", () => {
  it("takes a bare code", () => {
    expect(inviteTokenFrom("  aB3x9Qk_z1Lm ")).toBe("aB3x9Qk_z1Lm");
  });
  it("takes a full invite link, with or without its query", () => {
    expect(inviteTokenFrom("https://sendoff.jccmiel92.workers.dev/join/aB3x9Qk_z1Lm?who=1")).toBe("aB3x9Qk_z1Lm");
    expect(inviteTokenFrom("sendoff.example/join/aB3x9Qk_z1Lm")).toBe("aB3x9Qk_z1Lm");
    expect(inviteTokenFrom("Join us! https://x.dev/join/aB3x9Qk_z1Lm#top see you")).toBe("aB3x9Qk_z1Lm");
  });
  it("refuses what can't be a code", () => {
    expect(inviteTokenFrom("")).toBeNull();
    expect(inviteTokenFrom("abc")).toBeNull();
    expect(inviteTokenFrom("not a code at all")).toBeNull();
    expect(inviteTokenFrom("https://x.dev/trip/123")).toBeNull();
    expect(inviteTokenFrom("drop table; --")).toBeNull();
  });
});

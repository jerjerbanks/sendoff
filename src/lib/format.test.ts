import { describe, expect, it } from "vitest";
import { money, parseDollars, utcToZonedInput, zonedToUtc } from "./format";

describe("money formatting", () => {
  it("formats cents and parses dollars without float drift", () => {
    expect(money(25000)).toBe("$250.00");
    expect(money(68572)).toBe("$685.72");
    expect(money(0)).toBe("$0.00");
    expect(parseDollars("250")).toBe(25000);
    expect(parseDollars("$1,848.00")).toBe(184800);
    expect(parseDollars("10.5")).toBe(1050);
    expect(parseDollars("19.99")).toBe(1999);
    expect(parseDollars("10.555")).toBeNull();
    expect(parseDollars("")).toBeNull();
    expect(parseDollars("-5")).toBeNull();
  });

  it("treats a Central datetime-local value as Chicago time", () => {
    expect(zonedToUtc("2026-12-15T23:59")).toBe("2026-12-16T05:59:00.000Z");
    expect(utcToZonedInput("2026-12-16T05:59:00.000Z")).toBe("2026-12-15T23:59");
  });
});

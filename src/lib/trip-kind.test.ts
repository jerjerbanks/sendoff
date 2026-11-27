import { describe, expect, it } from "vitest";
import { isWeddingSubType, parseTripKind } from "@/lib/trip-kind";

describe("parseTripKind matrix", () => {
  const cases: [string, string, ReturnType<typeof parseTripKind>][] = [
    ["adult", "none", { tripType: "adult", preWeddingStyle: null, allowsHonorees: false }],
    ["adult", "bachelor", { tripType: "pre_wedding", preWeddingStyle: "bachelor", allowsHonorees: true }],
    ["adult", "bachelorette", { tripType: "pre_wedding", preWeddingStyle: "bachelorette", allowsHonorees: true }],
    ["adult", "joint", { tripType: "pre_wedding", preWeddingStyle: "joint", allowsHonorees: true }],
    ["family", "none", { tripType: "family", preWeddingStyle: null, allowsHonorees: false }],
    ["family", "bachelor", { tripType: "family", preWeddingStyle: null, allowsHonorees: false }],
    ["family", "bachelorette", { tripType: "family", preWeddingStyle: null, allowsHonorees: false }],
    ["family", "joint", { tripType: "family", preWeddingStyle: null, allowsHonorees: false }],
  ];
  it.each(cases)("%s / %s", (tripKind, subType, expected) => {
    expect(parseTripKind({ tripKind, subType })).toEqual(expected);
  });

  it("treats an unknown or missing sub-type as none", () => {
    expect(parseTripKind({ tripKind: "adult", subType: "anything" }).tripType).toBe("adult");
    expect(parseTripKind({ tripKind: "family" })).toEqual({ tripType: "family", preWeddingStyle: null, allowsHonorees: false });
    expect(parseTripKind({})).toEqual({ tripType: "adult", preWeddingStyle: null, allowsHonorees: false });
  });

  it("still accepts the old form fields", () => {
    expect(parseTripKind({ tripType: "pre_wedding", preWeddingStyle: "bachelorette" }).preWeddingStyle).toBe("bachelorette");
    expect(parseTripKind({ tripType: "pre_wedding" }).preWeddingStyle).toBe("joint");
    expect(parseTripKind({ tripType: "family" })).toEqual({ tripType: "family", preWeddingStyle: null, allowsHonorees: false });
  });

  it("only treats bachelor, bachelorette and joint as wedding sub-types", () => {
    expect(isWeddingSubType("joint")).toBe(true);
    expect(isWeddingSubType("none")).toBe(false);
    expect(isWeddingSubType(undefined)).toBe(false);
  });
});

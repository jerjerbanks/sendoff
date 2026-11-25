import { describe, expect, it } from "vitest";
import { isWeddingOccasion, parseTripKind } from "@/lib/trip-kind";

describe("parseTripKind", () => {
  it("stores wedding occasions as pre_wedding with the style", () => {
    expect(parseTripKind({ tripKind: "adult", occasion: "bachelor" })).toEqual({ tripType: "pre_wedding", preWeddingStyle: "bachelor", allowsHonorees: true });
    expect(parseTripKind({ tripKind: "adult", occasion: "bachelorette" })).toEqual({ tripType: "pre_wedding", preWeddingStyle: "bachelorette", allowsHonorees: true });
    expect(parseTripKind({ tripKind: "adult", occasion: "joint" })).toEqual({ tripType: "pre_wedding", preWeddingStyle: "joint", allowsHonorees: true });
  });

  it("stores a plain adults trip as adult with no honorees", () => {
    expect(parseTripKind({ tripKind: "adult", occasion: "none" })).toEqual({ tripType: "adult", preWeddingStyle: null, allowsHonorees: false });
    expect(parseTripKind({ tripKind: "adult", occasion: "anything-else" })).toEqual({ tripType: "adult", preWeddingStyle: null, allowsHonorees: false });
    expect(parseTripKind({})).toEqual({ tripType: "adult", preWeddingStyle: null, allowsHonorees: false });
  });

  it("ignores a wedding occasion on a family trip", () => {
    expect(parseTripKind({ tripKind: "family", occasion: "bachelor" })).toEqual({ tripType: "family", preWeddingStyle: null, allowsHonorees: false });
  });

  it("still accepts the old form fields", () => {
    expect(parseTripKind({ tripType: "pre_wedding", preWeddingStyle: "bachelorette" }).preWeddingStyle).toBe("bachelorette");
    expect(parseTripKind({ tripType: "pre_wedding" }).preWeddingStyle).toBe("joint");
    expect(parseTripKind({ tripType: "family" }).tripType).toBe("family");
  });

  it("only treats bachelor, bachelorette and joint as wedding occasions", () => {
    expect(isWeddingOccasion("adult", "joint")).toBe(true);
    expect(isWeddingOccasion("adult", "none")).toBe(false);
    expect(isWeddingOccasion("family", "joint")).toBe(false);
  });
});

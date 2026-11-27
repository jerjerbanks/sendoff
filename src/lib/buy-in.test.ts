import { describe, expect, it } from "vitest";
import { suggestedBuyIn } from "./buy-in";

describe("suggested buy-in", () => {
  it("is a quarter of an even lodging share at the minimum, to the nearest $10", () => {
    expect(suggestedBuyIn(240_000, 5)).toBe(12_000);
    expect(suggestedBuyIn(320_000, 3)).toBe(27_000);
  });
  it("is never the whole lodging total, and never below $10 once there is lodging", () => {
    expect(suggestedBuyIn(240_000, 1)).toBe(60_000);
    expect(suggestedBuyIn(2_000, 5)).toBe(1_000);
    expect(suggestedBuyIn(0, 5)).toBe(0);
  });
});

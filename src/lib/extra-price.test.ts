import { describe, expect, it } from "vitest";
import { extraPriceLine } from "./extra-price";

describe("extraPriceLine", () => {
  it("shows the even per-person price of a split extra", () => {
    expect(extraPriceLine({ amountCents: 22_500, agePrices: null, goingCount: 5 })).toBe("$45 a person");
    expect(extraPriceLine({ amountCents: 150_000, agePrices: null, goingCount: 6 })).toBe("$250 a person");
  });

  it("rounds an uneven split up and says about", () => {
    expect(extraPriceLine({ amountCents: 10_000, agePrices: null, goingCount: 3 })).toBe("about $34 a person");
  });

  it("calls a $0 extra free and an empty one by its total", () => {
    expect(extraPriceLine({ amountCents: 0, agePrices: null, goingCount: 3 })).toBe("Free");
    expect(extraPriceLine({ amountCents: 48_000, agePrices: null, goingCount: 0 })).toBe("$480 split among who's in");
  });

  it("lists age prices when the extra has them", () => {
    expect(extraPriceLine({ amountCents: 51_000, agePrices: { adult: 6_000, teen: 6_000, child: 3_000, infant: 0 }, goingCount: 9 })).toBe(
      "Adult $60 · Teen $60 · Child $30 · Infant $0",
    );
  });
});

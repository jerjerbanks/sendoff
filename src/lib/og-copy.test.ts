import { describe, expect, it } from "vitest";
import { ogCard } from "./og-copy";

const bachelor = {
  name: "Cabo",
  tripType: "friends",
  preWeddingStyle: "bachelor" as const,
  guestName: "Alex",
  payerCount: 4,
  minHeadcount: 5,
  maxHeadcount: 9,
  travelerCount: 5,
  buyInDeadline: "2026-12-16T05:59:00.000Z",
  currentShareCents: 1414_00,
  sensitivityRows: [
    { payers: 4, totalCents: 1414_00, expanded: false },
    { payers: 5, totalCents: 1278_00, expanded: false },
  ],
  polls: [],
};

const lake = {
  name: "Harper Lake House",
  tripType: "family",
  preWeddingStyle: null,
  guestName: "the group",
  payerCount: 4,
  minHeadcount: 3,
  maxHeadcount: 4,
  travelerCount: 10,
  buyInDeadline: "2027-04-16T04:59:00.000Z",
  currentShareCents: 1922_00,
  sensitivityRows: [{ payers: 4, totalCents: 1922_00, expanded: false }],
  polls: [],
};

describe("og card copy", () => {
  it("uses the live payer count for Chris at 4 in, not the five-party forecast", () => {
    const card = ogCard(bachelor as never);
    expect(card.line).toContain("$1,414");
    expect(card.line).not.toContain("$1,278");
    expect(card.line).toContain("4 of 5 parties in");
  });

  it("does not say 4 of 3 parties in when the lake trip is already over its minimum", () => {
    const card = ogCard(lake as never);
    expect(card.line).toContain("4 parties in");
    expect(card.line).not.toContain("of 3");
    expect(card.line).toContain("$1,922");
  });
});

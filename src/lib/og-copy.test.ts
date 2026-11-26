import { describe, expect, it } from "vitest";
import { APP_NAME } from "./constants";
import { ogCard, privateTripCard } from "./og-copy";

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
  parties: [
    { status: "committed", bill: { payer: true, totalCents: 1414_00 } },
    { status: "committed", bill: { payer: true, totalCents: 1312_00 } },
    { status: "committed", bill: { payer: true, totalCents: 1120_00 } },
    { status: "committed", bill: { payer: true, totalCents: 1060_00 } },
    { status: "committed", bill: { payer: false, totalCents: 0 } },
    { status: "joined", bill: null },
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
  parties: [
    { status: "committed", bill: { payer: true, totalCents: 1922_00 } },
    { status: "committed", bill: { payer: true, totalCents: 915_00 } },
    { status: "committed", bill: { payer: true, totalCents: 1036_00 } },
    { status: "committed", bill: { payer: true, totalCents: 639_00 } },
  ],
  polls: [],
};

describe("og card copy", () => {
  it("shows the spread across committed parties at today's count, never one party's number", () => {
    const card = ogCard(bachelor as never);
    expect(card.line).toContain("$1,060–$1,414 per party");
    expect(card.line).not.toContain("~$1,414 per party");
    expect(card.line).toContain("4 of 5 parties in");
  });

  it("does not say 4 of 3 parties in when the lake trip is already over its minimum", () => {
    const card = ogCard(lake as never);
    expect(card.line).toContain("4 parties in");
    expect(card.line).not.toContain("of 3");
    expect(card.line).toContain("$639–$1,922 per party");
  });

  it("names the app in the tab title and the link-preview headline, not in the image alt", () => {
    for (const trip of [bachelor, lake]) {
      const card = ogCard(trip as never);
      expect(card.pageTitle).toBe(`${card.alt} · ${APP_NAME}`);
      expect(card.shareTitle).toBe(`${APP_NAME} · ${card.title}`);
      expect(card.alt).not.toContain(APP_NAME);
    }
  });
});

describe("privateTripCard", () => {
  it("says nothing about the trip", () => {
    const card = privateTripCard();
    const all = Object.values(card).join(" ");
    expect(card.shareTitle).toBe(`${APP_NAME} · You're invited to a trip`);
    expect(card.pageTitle).toBe(`Private trip · ${APP_NAME}`);
    expect(all).not.toMatch(/\$|\d|part(y|ies)|going|commit by/i);
  });
});

import { describe, expect, it } from "vitest";
import { billsFor, type MathClaim, type MathCost, type MathMember, type MathSpot } from "./trip-math";
import { feasibilityCents, fitForOption, medianWeight, memberPayload, privateFit } from "./budgets";

const EVEN = 890_00;
const N = 5;
const W = 5.15;
const MED = 0.8;

const people = [
  ["user_chris", 2000_00, 310_00, 700_00],
  ["user_sam", 1800_00, 350_00, 720_00],
  ["user_jordan", 1500_00, 290_00, 580_00],
  ["user_drew", 1400_00, 320_00, 650_00],
  ["user_taylor", 1300_00, 280_00, 360_00],
  ["user_riley", 1600_00, 330_00, 640_00],
] as const;

function badge(lodging: number, high: "scottsdale" | "cabo" | "nashville") {
  const index = high === "scottsdale" ? 2 : high === "cabo" ? 3 : 2;
  const highs: Record<string, number> =
    high === "nashville"
      ? {
          user_chris: 310_00,
          user_sam: 350_00,
          user_jordan: 290_00,
          user_drew: 340_00,
          user_taylor: 310_00,
          user_riley: 340_00,
        }
      : Object.fromEntries(people.map((row) => [row[0], row[index]]));
  return fitForOption({
    lodgingCents: lodging,
    evenPoolCents: EVEN,
    headcount: N,
    weightSum: W,
    medianWeight: MED,
    people: people.map((row) => ({
      userId: row[0],
      budgetCents: row[1],
      highFlightCents: highs[row[0]] ?? null,
    })),
  });
}

describe("spec v1.3 budgets and flight ranges", () => {
  it("uses 0.8 as the median payer-bed weight", () => {
    expect(medianWeight([1.5, 1.25, 1, 0.8, 0.6, 0.5, 0.5])).toBe(0.8);
  });

  it("badges Scottsdale, Nashville, and Austin as Fits everyone, and Cabo as Fits most", () => {
    for (const [name, lodging, which] of [
      ["Scottsdale", 2000_00, "scottsdale"],
      ["Nashville", 2400_00, "nashville"],
      ["Austin", 2200_00, "nashville"],
    ] as const) {
      const result = badge(lodging, which);
      expect(result.label, name).toBe("Fits everyone");
      expect(result.countLabel).toBe("based on 6 budgets");
    }
    const cabo = badge(4200_00, "cabo");
    expect(cabo.label).toBe("Fits most");
    expect(cabo.countLabel).toBe("based on 6 budgets");
    expect(JSON.stringify(cabo)).not.toContain("user_drew");
    expect(JSON.stringify(cabo)).not.toContain("81");
  });

  it("tells Drew, and only Drew's payload, that Cabo is $81 over", () => {
    const fit = privateFit({
      lodgingCents: 4200_00,
      evenPoolCents: EVEN,
      headcount: N,
      weightSum: W,
      medianWeight: MED,
      flightCents: 650_00,
      budgetCents: 1400_00,
      wantsOwnRoom: false,
    });
    expect(fit.direction).toBe("over");
    expect(fit.deltaCents).toBe(81_00);
    expect(fit.hints.map((hint) => [hint.label, hint.underByCents])).toEqual([
      ["couch", 164_00],
      ["shared queen", 62_00],
    ]);
  });

  it("keeps another member's budget out of Chris's payload", () => {
    const cabo = badge(4200_00, "cabo");
    const drewLine = "You're $81 over. A couch gets you under by $164; a shared queen gets you under by $62.";
    const chris = memberPayload({
      viewerId: "user_chris",
      options: [{ id: "opt_cabo", label: "Cabo", badge: cabo.label, countLabel: cabo.countLabel, hidden: false }],
      budgets: [
        { userId: "user_chris", maxAllInCents: 2000_00, flexNote: null, mustHaves: [] },
        { userId: "user_drew", maxAllInCents: 1400_00, flexNote: "keep it cheap", mustHaves: ["golf", "own_room"] },
      ],
      privateLines: { opt_cabo: "You're $469 under" },
    });
    const text = JSON.stringify(chris);
    expect(text).toContain("Fits most");
    expect(text).toContain("based on 6 budgets");
    expect(text).not.toContain("140000");
    expect(text).not.toContain("1400");
    expect(text).not.toContain("keep it cheap");
    expect(text).not.toContain("own_room");
    expect(text).not.toContain("golf");
    expect(text).not.toContain(drewLine);
    expect(text).not.toContain("user_drew");
    expect(text).not.toContain("$81");
  });

  it("shows Chris's N=5 Nashville all-in as $1,248–$1,308 around $1,278", () => {
    const members: MathMember[] = [
      { userId: "user_chris", role: "organizer", status: "committed", committedAt: "1" },
      { userId: "user_alex", role: "honoree", status: "committed", committedAt: "1" },
      { userId: "user_sam", role: "member", status: "committed", committedAt: "2" },
      { userId: "user_jordan", role: "member", status: "committed", committedAt: "3" },
      { userId: "user_drew", role: "member", status: "committed", committedAt: "4" },
      { userId: "user_taylor", role: "member", status: "committed", committedAt: "5" },
    ];
    const spots: MathSpot[] = [
      { id: "master", weight: 1.5, reservedForHonoree: true, sharingEnabled: false, capacity: 1 },
      { id: "bed2", weight: 1.5, reservedForHonoree: false, sharingEnabled: false, capacity: 1 },
      { id: "bed3", weight: 1.25, reservedForHonoree: false, sharingEnabled: true, capacity: 2 },
      { id: "bed4", weight: 1, reservedForHonoree: false, sharingEnabled: false, capacity: 1 },
      { id: "bunk", weight: 0.8, reservedForHonoree: false, sharingEnabled: false, capacity: 1 },
      { id: "loft", weight: 0.6, reservedForHonoree: false, sharingEnabled: false, capacity: 1 },
    ];
    const claims: MathClaim[] = [
      { spotId: "bed2", userId: "user_chris", status: "approved" },
      { spotId: "bed3", userId: "user_sam", status: "approved" },
      { spotId: "bed4", userId: "user_jordan", status: "approved" },
      { spotId: "bunk", userId: "user_drew", status: "approved" },
      { spotId: "loft", userId: "user_taylor", status: "approved" },
    ];
    const costs = (chrisFlight: number): MathCost[] => [
      { id: "lodge", splitType: "shared", category: "lodging", amountCents: 2400_00, memberId: null, participantIds: [], isLodging: true },
      { id: "act", splitType: "shared", category: "activities", amountCents: 600_00, memberId: null, participantIds: [], isLodging: false },
      { id: "alex", splitType: "individual", category: "flights", amountCents: 290_00, memberId: "user_alex", participantIds: [], isLodging: false },
      { id: "tee", splitType: "optional", category: "tee_times", amountCents: 480_00, memberId: null, participantIds: ["user_chris", "user_sam", "user_jordan", "user_drew"], isLodging: false },
      { id: "c", splitType: "individual", category: "flights", amountCents: chrisFlight, memberId: "user_chris", participantIds: [], isLodging: false },
      { id: "s", splitType: "individual", category: "flights", amountCents: 310_00, memberId: "user_sam", participantIds: [], isLodging: false },
      { id: "j", splitType: "individual", category: "flights", amountCents: 250_00, memberId: "user_jordan", participantIds: [], isLodging: false },
      { id: "d", splitType: "individual", category: "flights", amountCents: 295_00, memberId: "user_drew", participantIds: [], isLodging: false },
      { id: "t", splitType: "individual", category: "flights", amountCents: 270_00, memberId: "user_taylor", participantIds: [], isLodging: false },
    ];
    const total = (flight: number) =>
      billsFor({
        members,
        costs: costs(flight),
        spots,
        claims,
        payments: [],
        booked: false,
        payerIds: ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"],
      }).find((bill) => bill.userId === "user_chris")?.totalCents;
    expect(total(280_00)).toBe(1278_00);
    expect(total(250_00)).toBe(1248_00);
    expect(total(310_00)).toBe(1308_00);
    expect(feasibilityCents({ lodgingCents: 2400_00, evenPoolCents: EVEN, headcount: N, weightSum: W, weight: MED, flightCents: 340_00 })).toBe(891_00);
  });
});

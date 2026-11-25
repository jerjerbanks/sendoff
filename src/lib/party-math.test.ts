import { describe, expect, it } from "vitest";
import { fitForOption, privateFit } from "./budgets";
import {
  DEFAULT_AGE_WEIGHTS,
  agePricedAmount,
  billsFor,
  partyAgeWeight,
  partySpotTravelers,
  milestoneSchedule,
  projectClaims,
  rawLodgingCents,
  roundUpDollarCents,
  sensitivity,
  splitChangeReady,
  travelerSharesFor,
  vendorCents,
  type MathClaim,
  type MathCost,
  type MathMember,
  type MathSpot,
  type MathTraveler,
  type SplitMode,
} from "./trip-math";

/**
 * Spec 2.0.1 fixture B, "Harper Lake House".
 * Four paying parties, ten travelers, zero honorees, no flights.
 */
const dollars = (cents: number) => cents / 100;

const t = (id: string, partyId: string, ageBand: MathTraveler["ageBand"], extra: Partial<MathTraveler> = {}): MathTraveler => ({
  id,
  partyId,
  ageBand,
  isHonoree: false,
  ...extra,
});

const travelers: MathTraveler[] = [
  t("maya", "harper", "adult"),
  t("alex_h", "harper", "adult"),
  t("riley_h", "harper", "teen"),
  t("quinn", "harper", "child"),
  t("priya", "chen", "adult"),
  t("luis", "chen", "adult"),
  t("noor", "chen", "infant"),
  t("helen", "rivera", "adult"),
  t("george", "rivera", "adult"),
  t("noah", "kim", "adult"),
];

const spots: MathSpot[] = [
  { id: "suite", weight: 1.5, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 1, roomName: "Ground-floor suite", bedType: "king", reservedForUserId: "rivera" },
  { id: "lake", weight: 1.25, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 2, roomName: "Lake bedroom", bedType: "queen" },
  { id: "fam_q", weight: 1.25, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 3, roomName: "Family bedroom", bedType: "queen" },
  { id: "fam_t1", weight: 0.8, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 4, roomName: "Family bedroom", bedType: "twin" },
  { id: "fam_t2", weight: 0.8, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 5, roomName: "Family bedroom", bedType: "twin" },
  { id: "loft", weight: 1.0, reservedForHonoree: false, sharingEnabled: false, capacity: 1, sortOrder: 6, roomName: "Loft", bedType: "queen" },
];

const claims: MathClaim[] = [
  { spotId: "suite", userId: "rivera", status: "approved" },
  { spotId: "lake", userId: "chen", status: "approved" },
  { spotId: "fam_q", userId: "harper", status: "approved" },
  { spotId: "fam_t1", userId: "harper", status: "approved" },
  { spotId: "fam_t2", userId: "harper", status: "approved" },
  { spotId: "loft", userId: "kim", status: "approved" },
];

function members(list: MathTraveler[] = travelers): MathMember[] {
  return ["harper", "chen", "rivera", "kim"].map((partyId, index) => {
    const mine = list.filter((traveler) => traveler.partyId === partyId);
    return {
      userId: partyId,
      role: partyId === "harper" ? "organizer" : "member",
      status: "committed",
      committedAt: String(index + 1),
      ageWeight: partyAgeWeight(mine, DEFAULT_AGE_WEIGHTS, false),
      spotTravelers: partySpotTravelers(mine),
    };
  });
}

const boatPrices = { adult: 60_00, teen: 60_00, child: 30_00, infant: 0 };
const boatRiders = travelers.filter((traveler) => traveler.id !== "noor");

function costs(): MathCost[] {
  return [
    { id: "lodge", splitType: "shared", category: "lodging", amountCents: 3200_00, memberId: null, participantIds: [], isLodging: true },
    { id: "house", splitType: "shared", category: "other", amountCents: 800_00, memberId: null, participantIds: [], isLodging: false },
    {
      id: "boat",
      splitType: "optional",
      category: "activities",
      amountCents: agePricedAmount(boatRiders, boatPrices),
      memberId: null,
      participantIds: [],
      isLodging: false,
      agePriced: true,
      travelerShares: travelerSharesFor({ optedIn: boatRiders, weights: DEFAULT_AGE_WEIGHTS, honoreeExcluded: false, prices: boatPrices }),
    },
  ];
}

function run(options: { claims?: MathClaim[]; list?: MathTraveler[]; splitMode?: SplitMode } = {}) {
  const args = {
    members: members(options.list),
    costs: costs(),
    spots,
    claims: options.claims ?? claims,
    payments: [],
    booked: false,
    payerIds: ["harper", "chen", "rivera", "kim"],
    splitMode: options.splitMode,
  };
  const bills = billsFor(args);
  const byId = Object.fromEntries(bills.map((bill) => [bill.userId, dollars(bill.totalCents)]));
  const vendor = vendorCents(args);
  const sum = bills.reduce((total, bill) => total + bill.totalCents, 0);
  return { byId, bills, vendor: dollars(vendor), remainder: dollars(sum - vendor) };
}

describe("spec 2.0.1 fixture B — Harper Lake House", () => {
  it("age weights: W_age 8.5, the infant adds nothing, 9 travelers need a bed", () => {
    const ws = members().map((member) => member.ageWeight);
    expect(ws).toEqual([3.5, 2, 2, 1]);
    expect(members().reduce((sum, member) => sum + (member.spotTravelers ?? 0), 0)).toBe(9);
  });

  it("official all-in: Harpers $1,922 / Chens $915 / Riveras $1,036 / Kim $639, $2 left on vendor $4,510", () => {
    const result = run();
    expect(result.byId).toEqual({ harper: 1922, chen: 915, rivera: 1036, kim: 639 });
    expect(result.vendor).toBe(4510);
    expect(result.remainder).toBe(2);
  });

  it("boat day bills Quinn (child) $30 and the infant nothing; tickets are not rounded", () => {
    const boat = run().bills.map((bill) => [bill.userId, dollars(bill.ticketCents)]);
    expect(Object.fromEntries(boat)).toEqual({ harper: 210, chen: 120, rivera: 120, kim: 60 });
    expect(agePricedAmount(boatRiders, boatPrices)).toBe(510_00);
  });

  it("lodging is per spot, never age-weighted: the Harpers pay the full 2.85 room", () => {
    const lodge = rawLodgingCents(3200_00, spots, claims, ["harper", "chen", "rivera", "kim"]);
    expect(dollars(lodge.get("harper") ?? 0)).toBeCloseTo(1381.82, 2);
    expect(dollars(lodge.get("chen") ?? 0)).toBeCloseTo(606.06, 2);
    expect(dollars(lodge.get("rivera") ?? 0)).toBeCloseTo(727.27, 2);
    expect(dollars(lodge.get("kim") ?? 0)).toBeCloseTo(484.85, 2);
  });

  it("co-sleep: Quinn in the parents' queen frees a twin, W_P 5.80, $1 remainder", () => {
    const list = travelers.map((traveler) => (traveler.id === "quinn" ? { ...traveler, coSleep: true } : traveler));
    const result = run({ list, claims: claims.filter((claim) => claim.spotId !== "fam_t2") });
    expect(result.byId).toEqual({ harper: 1671, chen: 998, rivera: 1136, kim: 706 });
    expect(result.remainder).toBe(1);
    expect(partySpotTravelers(list.filter((traveler) => traveler.partyId === "harper"))).toBe(3);
  });

  it("even_per_party: $800 of lodging each", () => {
    const result = run({ splitMode: "even_per_party" });
    expect(result.byId).toEqual({ harper: 1340, chen: 1109, rivera: 1109, kim: 955 });
  });

  it("even_per_traveler: $3,200 / 9 paid-spot travelers, infant $0", () => {
    const needs = new Map(members().map((member) => [member.userId, member.spotTravelers ?? 1]));
    const lodge = rawLodgingCents(3200_00, spots, claims, ["harper", "chen", "rivera", "kim"], "even_per_traveler", needs);
    expect(dollars(lodge.get("kim") ?? 0)).toBeCloseTo(355.56, 2);
    expect(dollars(lodge.get("chen") ?? 0)).toBeCloseTo(711.11, 2);
    expect(dollars(lodge.get("harper") ?? 0)).toBeCloseTo(1422.22, 2);
  });

  it("forecast N=3 drops Kim's loft and raises the other three; N=4 is official", () => {
    const sense = sensitivity({
      members: members(),
      costs: costs(),
      spots,
      claims,
      payments: [],
      booked: false,
      userId: "harper",
      minimumCommitters: 3,
    });
    expect(sense.rows.map((row) => row.payers)).toEqual([3, 4]);
    expect(dollars(sense.rows[1]?.totalCents ?? 0)).toBe(1922);
    // N=3: W_P 5.60, W_age 7.5.
    const n3 = roundUpDollarCents((3200_00 * 2.85) / 5.6 + (800_00 * 3.5) / 7.5) + 210_00;
    expect(sense.rows[0]?.totalCents).toBe(n3);
  });

  it("a family takes a whole room that sleeps everyone; a single adult may take any spot", () => {
    const open = claims.filter((claim) => claim.userId !== "harper" && claim.userId !== "kim");
    const needs = new Map([["harper", 4], ["kim", 1]]);
    const projected = projectClaims(spots, open, ["rivera", "chen", "harper", "kim"], needs);
    const harper = projected.filter((claim) => claim.userId === "harper").map((claim) => claim.spotId).sort();
    expect(harper).toEqual(["fam_q", "fam_t1", "fam_t2"]);
    expect(projected.find((claim) => claim.userId === "kim")?.spotId).toBe("loft");
  });

  it("spec-literal: a single adult who commits first does not take a family room from a larger waiting party", () => {
    const chenHasLake = claims.filter((claim) => claim.userId === "chen");
    const projected = projectClaims(spots, chenHasLake, ["chen", "kim", "harper"], new Map([["harper", 4], ["kim", 1]]));
    expect(projected.find((claim) => claim.userId === "kim")?.spotId).toBe("loft");
    const harper = projected.filter((claim) => claim.userId === "harper").map((claim) => claim.spotId).sort();
    expect(harper).toEqual(["fam_q", "fam_t1", "fam_t2"]);
  });

  it("a family that opts into sharing can give up a bed in their room to a solo who commits first", () => {
    const chenHasLake = claims.filter((claim) => claim.userId === "chen");
    const projected = projectClaims(
      spots,
      chenHasLake,
      ["chen", "kim", "harper"],
      new Map([["harper", 4], ["kim", 1]]),
      new Set(["harper"]),
    );
    expect(projected.find((claim) => claim.userId === "kim")?.spotId).toBe("fam_q");
    expect(projected.some((claim) => claim.userId === "harper")).toBe(false);
  });

  it("lodging share is 50% of lodging only; official all-in totals and the pot stay put", () => {
    const result = run();
    expect(result.byId).toEqual({ harper: 1922, chen: 915, rivera: 1036, kim: 639 });
    expect(result.remainder).toBe(2);
    const milestones = [
      { id: "buy", name: "Buy-in", dueDate: "2027-04-16T04:59:00.000Z", kind: "buy_in" as const, amountRule: "fixed" as const, amount: 10_000, sortOrder: 0 },
      { id: "lodge", name: "Lodging share", dueDate: "2027-05-16T04:59:00.000Z", kind: "installment" as const, amountRule: "pct_of_lodging" as const, amount: 50, sortOrder: 1 },
      { id: "final", name: "Balance", dueDate: "2027-06-16T04:59:00.000Z", kind: "final" as const, amountRule: "fixed" as const, amount: 0, sortOrder: 2 },
    ];
    for (const bill of result.bills.filter((row) => row.payer)) {
      const lines = milestoneSchedule({
        totalCents: bill.totalCents,
        lodgingCents: bill.lodgingCents,
        milestones,
        payments: [],
        userId: bill.userId,
        buyInAmountCents: 10_000,
        now: "2027-04-01T00:00:00.000Z",
      });
      const byId = Object.fromEntries(lines.map((line) => [line.milestoneId, line.amountCents]));
      expect(byId.buy).toBe(10_000);
      expect(byId.lodge).toBe(Math.round((bill.lodgingCents * 50) / 100));
      expect(byId.lodge).not.toBe(Math.round((bill.totalCents * 50) / 100));
      expect(byId.buy + byId.lodge + byId.final).toBe(bill.totalCents);
    }
  });

  it("a split-mode change is ready only when every committed payer has agreed", () => {
    expect(splitChangeReady(["harper", "chen", "rivera", "kim"], ["harper", "chen"])).toBe(false);
    expect(splitChangeReady(["harper", "chen", "rivera", "kim"], ["harper", "chen", "rivera", "kim"])).toBe(true);
    expect(splitChangeReady([], [])).toBe(false);
  });

  it("an accessibility hold is taken only by the party it is held for", () => {
    const needs = new Map([["kim", 1]]);
    const projected = projectClaims(spots, [], ["kim"], needs);
    expect(projected.find((claim) => claim.userId === "kim")?.spotId).not.toBe("suite");
  });

  it("a mixed party with an excluded honoree drops only that traveler's per-head weight", () => {
    const party = [t("bride", "p", "adult", { isHonoree: true }), t("mom", "p", "adult"), t("kid", "p", "child")];
    expect(partyAgeWeight(party, DEFAULT_AGE_WEIGHTS, true)).toBe(1.5);
    expect(partyAgeWeight(party, DEFAULT_AGE_WEIGHTS, false)).toBe(2.5);
  });

  it("party budget badge uses the party's age-weighted per-head share", () => {
    const fit = fitForOption({
      lodgingCents: 3200_00,
      evenPoolCents: 800_00,
      headcount: 3,
      weightSum: 5.6,
      medianWeight: 1.0,
      people: [
        { userId: "harper", budgetCents: 2400_00, highFlightCents: 0, evenShareCents: (800_00 * 3.5) / 7.5 },
        { userId: "chen", budgetCents: 1200_00, highFlightCents: 0, evenShareCents: (800_00 * 2) / 7.5 },
        { userId: "rivera", budgetCents: 1400_00, highFlightCents: 0, evenShareCents: (800_00 * 2) / 7.5 },
        { userId: "kim", budgetCents: 800_00, highFlightCents: 0, evenShareCents: (800_00 * 1) / 7.5 },
      ],
    });
    // Median bed 1.0 at W_P 5.60 is $571.43 of lodging. Kim: 571.43 + 106.67 = $679 ≤ $800.
    expect(fit.badge).toBe("fits_everyone");
    expect(fit.countLabel).toBe("based on 4 budgets");
  });

  it("a multi-traveler party gets room-sized suggestions, not a couch", () => {
    const fit = privateFit({
      lodgingCents: 3200_00,
      evenPoolCents: 800_00,
      headcount: 3,
      weightSum: 5.6,
      medianWeight: 1.0,
      flightCents: 0,
      budgetCents: 600_00,
      wantsOwnRoom: false,
      evenShareCents: (800_00 * 1) / 7.5,
      bedOptions: [{ label: "Loft", weight: 0.6, ownRoom: true }],
    });
    expect(fit.direction).toBe("over");
    expect(fit.hints.map((hint) => hint.label)).toEqual(["Loft"]);
  });
});

describe("spec 2.0 rounding, Example F", () => {
  it("$2,900 across six adult parties is $484 each with $4 in the pot", () => {
    const six = ["a", "b", "c", "d", "e", "f"];
    const args = {
      members: six.map((userId) => ({ userId, role: "member" as const, status: "committed" as const })),
      costs: [{ id: "pool", splitType: "shared" as const, category: "other", amountCents: 2900_00, memberId: null, participantIds: [], isLodging: false }],
      spots: [],
      claims: [],
      payments: [],
      booked: false,
      payerIds: six,
    };
    const bills = billsFor(args);
    expect(bills.every((bill) => bill.totalCents === 484_00)).toBe(true);
    expect(bills.reduce((sum, bill) => sum + bill.totalCents, 0) - vendorCents(args)).toBe(4_00);
  });
});

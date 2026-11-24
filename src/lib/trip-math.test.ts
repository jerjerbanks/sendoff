import { describe, expect, it } from "vitest";
import {
  billsFor,
  rawLodgingCents,
  roundUpDollarCents,
  sensitivity,
  vendorCents,
  type ForecastExtra,
  type MathClaim,
  type MathCost,
  type MathMember,
  type MathPayment,
  type MathSpot,
} from "./trip-math";

const dollars = (cents: number) => cents / 100;

const spot = (
  id: string,
  weight: number,
  extra: Partial<MathSpot> = {},
): MathSpot => ({
  id,
  weight,
  reservedForHonoree: false,
  sharingEnabled: false,
  capacity: 1,
  sortOrder: 0,
  ...extra,
});

const seedSpots: MathSpot[] = [
  spot("master", 1.5, { reservedForHonoree: true, sortOrder: 1, bedType: "king" }),
  spot("bed2", 1.5, { sortOrder: 2, bedType: "queen" }),
  spot("bed3", 1.25, { capacity: 2, sharingEnabled: true, sortOrder: 3, bedType: "queen" }),
  spot("bed4", 1, { sortOrder: 4, bedType: "full" }),
  spot("bunk", 0.8, { sortOrder: 5, bedType: "bunk" }),
  spot("loft", 0.6, { sortOrder: 6, bedType: "sofa_bed" }),
  spot("couch", 0.5, { sortOrder: 7, bedType: "couch" }),
  spot("air", 0.5, { sortOrder: 8, bedType: "air_mattress" }),
];

const flights: Record<string, number> = {
  user_chris: 280_00,
  user_sam: 310_00,
  user_jordan: 250_00,
  user_drew: 295_00,
  user_taylor: 270_00,
  user_riley: 300_00,
  user_casey: 285_00,
};

const costs: MathCost[] = [
  { id: "lodge", splitType: "shared", category: "lodging", amountCents: 2400_00, memberId: null, participantIds: [], isLodging: true },
  { id: "activities", splitType: "shared", category: "activities", amountCents: 600_00, memberId: null, participantIds: [], isLodging: false },
  { id: "alex", splitType: "individual", category: "flights", amountCents: 290_00, memberId: "user_alex", participantIds: [], isLodging: false },
  {
    id: "tee",
    splitType: "optional",
    category: "tee_times",
    amountCents: 480_00,
    memberId: null,
    participantIds: ["user_chris", "user_sam", "user_jordan", "user_drew"],
    isLodging: false,
  },
  ...Object.entries(flights).map(([userId, amountCents]) => ({
    id: `flight_${userId}`,
    splitType: "individual" as const,
    category: "flights",
    amountCents,
    memberId: userId,
    participantIds: [],
    isLodging: false,
  })),
];

const roster: MathMember[] = [
  { userId: "user_chris", role: "organizer", status: "committed", committedAt: "1", forecastOrder: 1 },
  { userId: "user_alex", role: "honoree", status: "committed", committedAt: "1", forecastOrder: 0 },
  { userId: "user_sam", role: "member", status: "committed", committedAt: "2", forecastOrder: 2 },
  { userId: "user_jordan", role: "member", status: "committed", committedAt: "3", forecastOrder: 3 },
  { userId: "user_drew", role: "member", status: "committed", committedAt: "4", forecastOrder: 4 },
  { userId: "user_taylor", role: "member", status: "joined", forecastOrder: 5 },
  { userId: "user_riley", role: "member", status: "joined", forecastOrder: 6 },
  { userId: "user_casey", role: "member", status: "invited", forecastOrder: 7 },
  { userId: "user_morgan", role: "member", status: "declined", forecastOrder: 9 },
];

const pat: ForecastExtra = { userId: "user_pat", individualCents: 280_00 };

const seedClaims: MathClaim[] = [
  { spotId: "master", userId: "user_alex", status: "approved" },
  { spotId: "bed2", userId: "user_chris", status: "approved" },
  { spotId: "bed3", userId: "user_sam", status: "approved" },
  { spotId: "bed4", userId: "user_jordan", status: "approved" },
  { spotId: "bunk", userId: "user_drew", status: "approved" },
];

function totals(
  payerIds: string[],
  claims: MathClaim[],
  options: { booked?: boolean; payments?: MathPayment[]; lodge?: number; members?: MathMember[] } = {},
) {
  const members = options.members ?? roster;
  const args = {
    members,
    costs,
    spots: seedSpots,
    claims,
    payments: options.payments ?? [],
    booked: options.booked ?? false,
    payerIds,
    lodgeOverrideCents: options.lodge,
    extras: [pat],
  };
  const bills = billsFor(args);
  const byId = Object.fromEntries(bills.map((bill) => [bill.userId, dollars(bill.totalCents)]));
  const vendor = vendorCents(args);
  const rounded = bills.filter((bill) => bill.payer).reduce((sum, bill) => sum + bill.totalCents, 0);
  return { byId, remainder: dollars(rounded - vendor) };
}

describe("spec v1.2 worked examples", () => {
  it("Example A: six claimed weights, groom excluded", () => {
    const claims = [
      ...seedClaims,
      { spotId: "loft", userId: "user_taylor", status: "approved" as const },
      { spotId: "couch", userId: "user_riley", status: "approved" as const },
    ];
    const payers = ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor", "user_riley"];
    const lodge = rawLodgingCents(2400_00, seedSpots, claims, payers);
    expect(dollars(lodge.get("user_chris") ?? 0)).toBeCloseTo(637.17, 2);
    expect(dollars(lodge.get("user_riley") ?? 0)).toBeCloseTo(212.39, 2);
    expect(lodge.get("user_alex") ?? 0).toBe(0);
  });

  it("rounds a shared pool up and keeps the remainder", () => {
    expect(roundUpDollarCents(290_000 / 6)).toBe(484_00);
    expect(6 * 484_00 - 290_000).toBe(4_00);
  });

  it("N=4 unofficial, below the minimum", () => {
    const result = totals(
      ["user_chris", "user_sam", "user_jordan", "user_drew"],
      seedClaims,
    );
    expect(result.byId).toMatchObject({ user_chris: 1414, user_sam: 1312, user_jordan: 1120, user_drew: 1060 });
    expect(result.remainder).toBe(1);
  });

  it("N=5 Taylor takes the sofa", () => {
    const result = totals(
      ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"],
      [...seedClaims, { spotId: "loft", userId: "user_taylor", status: "approved" }],
    );
    expect(result.byId).toMatchObject({
      user_chris: 1278,
      user_sam: 1191,
      user_jordan: 1015,
      user_drew: 966,
      user_taylor: 728,
    });
    expect(result.remainder).toBe(3);
  });

  it("N=6 Riley takes the couch", () => {
    const result = totals(
      ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor", "user_riley"],
      [
        ...seedClaims,
        { spotId: "loft", userId: "user_taylor", status: "approved" },
        { spotId: "couch", userId: "user_riley", status: "approved" },
      ],
    );
    expect(result.byId).toMatchObject({
      user_chris: 1186,
      user_sam: 1110,
      user_jordan: 944,
      user_drew: 904,
      user_taylor: 674,
      user_riley: 661,
    });
    expect(result.remainder).toBe(4);
  });

  it("N=7 Casey takes the air mattress", () => {
    const ids = ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor", "user_riley", "user_casey"];
    const result = totals(ids, [
      ...seedClaims,
      { spotId: "loft", userId: "user_taylor", status: "approved" },
      { spotId: "couch", userId: "user_riley", status: "approved" },
      { spotId: "air", userId: "user_casey", status: "approved" },
    ]);
    expect(result.byId.user_chris).toBe(1113);
    expect(result.byId.user_casey).toBe(608);
    expect(result.byId).toMatchObject({
      user_sam: 1045,
      user_jordan: 888,
      user_drew: 855,
      user_taylor: 632,
      user_riley: 623,
    });
    expect(result.remainder).toBe(4);
  });

  it("N=8 expanded, Pat shares Sam's queen", () => {
    const ids = ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor", "user_riley", "user_casey", "user_pat"];
    const result = totals(ids, [
      ...seedClaims,
      { spotId: "loft", userId: "user_taylor", status: "approved" },
      { spotId: "couch", userId: "user_riley", status: "approved" },
      { spotId: "air", userId: "user_casey", status: "approved" },
      { spotId: "bed3", userId: "user_pat", status: "approved" },
    ]);
    expect(result.byId.user_sam).toBe(786);
    expect(result.byId.user_pat).toBe(636);
    expect(result.byId).toMatchObject({
      user_chris: 1097,
      user_jordan: 872,
      user_drew: 839,
      user_taylor: 616,
      user_riley: 607,
      user_casey: 592,
    });
    expect(result.remainder).toBe(5);
  });

  it("mid-path share: Taylor shares the queen at N=5 instead of the sofa", () => {
    const result = totals(
      ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"],
      [...seedClaims, { spotId: "bed3", userId: "user_taylor", status: "approved" }],
    );
    expect(result.byId).toMatchObject({
      user_chris: 1370,
      user_sam: 938,
      user_jordan: 1076,
      user_drew: 1015,
      user_taylor: 778,
    });
    expect(result.remainder).toBe(2);
  });

  it("rebases N=5 when the actual lodging total is $2,640", () => {
    const payers = ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"];
    const claims: MathClaim[] = [...seedClaims, { spotId: "loft", userId: "user_taylor", status: "approved" }];
    const result = totals(payers, claims, { booked: true, lodge: 2640_00 });
    expect(result.byId).toMatchObject({
      user_chris: 1347,
      user_sam: 1249,
      user_jordan: 1061,
      user_drew: 1004,
      user_taylor: 756,
    });
    expect(result.remainder).toBe(2);
  });

  it("Example E: Taylor late-drops after booking and the buy-in pays down lodging", () => {
    const payments: MathPayment[] = [
      { milestoneId: "buy", userId: "user_taylor", amountCents: 150_00, status: "forfeited" },
    ];
    const result = totals(
      ["user_chris", "user_sam", "user_jordan", "user_drew"],
      seedClaims,
      { booked: true, payments },
    );
    expect(result.byId).toMatchObject({
      user_chris: 1365,
      user_sam: 1271,
      user_jordan: 1088,
      user_drew: 1034,
    });
    expect(result.remainder).toBe(3);
  });

  it("Example D: minimum lowered to 3", () => {
    const result = totals(["user_chris", "user_sam", "user_jordan"], seedClaims);
    expect(result.byId).toMatchObject({ user_chris: 1697, user_sam: 1567, user_jordan: 1347 });
    expect(result.remainder).toBe(1);
  });

  it("forecast slider matches Chris at N=5 through N=8, with the live deltas", () => {
    const sense = sensitivity({
      members: roster,
      costs,
      spots: seedSpots,
      claims: seedClaims,
      payments: [],
      booked: false,
      userId: "user_chris",
      minimumCommitters: 5,
      maxHeadcount: 8,
      extras: [pat],
    });
    expect(sense.rows.map((row) => dollars(row.totalCents))).toEqual([1278, 1186, 1113, 1097]);
    expect(sense.rows.map((row) => row.expanded)).toEqual([false, false, false, true]);
    expect(dollars(sense.currentCents ?? 0)).toBe(1414);
    expect(dollars(sense.ifOneMoreSavesCents ?? 0)).toBe(136);
    expect(dollars(sense.ifSomeoneDropsAddsCents ?? 0)).toBe(283);
    expect(sense.underMinimumIfDrop).toBe(true);
  });
});

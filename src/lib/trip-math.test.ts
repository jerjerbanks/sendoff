import { describe, expect, it } from "vitest";
import {
  billForUser,
  lodgingShares,
  reconcileTrip,
  sensitivity,
  settledBills,
  type MathCost,
  type MathMember,
  type MathPayment,
  type MathSpot,
} from "./trip-math";

const dollars = (cents: number) => cents / 100;

const members = (statuses: Record<string, "committed" | "joined">): MathMember[] =>
  [
    ["user_chris", "organizer"],
    ["user_sam", "member"],
    ["user_jordan", "member"],
    ["user_drew", "member"],
    ["user_taylor", "member"],
    ["user_alex", "honoree"],
  ].map(([userId, role]) => ({
    userId,
    role: role as MathMember["role"],
    status: userId === "user_alex" ? "committed" : (statuses[userId] ?? "joined"),
    committedAt: statuses[userId] === "committed" ? `${userId}` : null,
  }));

const costs: MathCost[] = [
  { id: "lodge", splitType: "shared", category: "lodging", amountCents: 91_000, memberId: null, participantIds: [], isLodging: true },
  { id: "fund", splitType: "shared", category: "other", amountCents: 183_000, memberId: null, participantIds: [], isLodging: false },
  { id: "act", splitType: "shared", category: "activity", amountCents: 60_000, memberId: null, participantIds: [], isLodging: false },
  { id: "alex", splitType: "shared", category: "flight", amountCents: 29_000, memberId: null, participantIds: [], isLodging: false },
  { id: "tee", splitType: "optional", category: "golf", amountCents: 48_000, memberId: null, participantIds: ["user_chris", "user_sam", "user_jordan", "user_drew"], isLodging: false },
  { id: "fc", splitType: "individual", category: "flight", amountCents: 31_400, memberId: "user_chris", participantIds: [], isLodging: false },
  { id: "fs", splitType: "individual", category: "flight", amountCents: 26_200, memberId: "user_sam", participantIds: [], isLodging: false },
  { id: "fj", splitType: "individual", category: "flight", amountCents: 12_100, memberId: "user_jordan", participantIds: [], isLodging: false },
  { id: "fd", splitType: "individual", category: "flight", amountCents: 10_000, memberId: "user_drew", participantIds: [], isLodging: false },
  { id: "ft", splitType: "individual", category: "flight", amountCents: 18_400, memberId: "user_taylor", participantIds: [], isLodging: false },
];

const spots: MathSpot[] = [
  { id: "s1", weight: 1.5, reservedForHonoree: false, sharingEnabled: false },
  { id: "s2", weight: 1.25, reservedForHonoree: false, sharingEnabled: true },
  { id: "s3", weight: 1, reservedForHonoree: false, sharingEnabled: false },
  { id: "s4", weight: 0.8, reservedForHonoree: false, sharingEnabled: false },
  { id: "s5", weight: 0.8, reservedForHonoree: false, sharingEnabled: false },
  { id: "s6", weight: 0.6, reservedForHonoree: false, sharingEnabled: false },
  { id: "s7", weight: 1.5, reservedForHonoree: true, sharingEnabled: false },
];

const claims = (extraSpot: string | null = null) => {
  const rows = [
    ["s1", "user_chris"],
    ["s2", "user_sam"],
    ["s3", "user_jordan"],
    ["s4", "user_drew"],
  ].map(([spotId, userId]) => ({ spotId, userId, status: "approved" as const }));
  if (extraSpot) rows.push({ spotId: extraSpot, userId: "user_taylor", status: "approved" });
  return rows;
};

const four: MathMember[] = members({
  user_chris: "committed",
  user_sam: "committed",
  user_jordan: "committed",
  user_drew: "committed",
});

const five: MathMember[] = members({
  user_chris: "committed",
  user_sam: "committed",
  user_jordan: "committed",
  user_drew: "committed",
  user_taylor: "committed",
});

describe("v1.1 worked fixtures", () => {
  it("N=4 Chris owes $1,414", () => {
    const bill = settledBills({ members: four, costs, spots, claims: claims(), payments: [], booked: false }).find(
      (item) => item.userId === "user_chris",
    );
    expect(dollars(bill?.totalCents ?? -1)).toBe(1414);
    expect(dollars(bill?.lodgingCents ?? -1)).toBe(300);
    expect(dollars(bill?.evenCents ?? -1)).toBe(680);
    expect(dollars(bill?.optionalCents ?? -1)).toBe(120);
  });

  it("N=5 with Taylor unclaimed: Chris $1,278 and Taylor $728", () => {
    const bills = settledBills({ members: five, costs, spots, claims: claims(), payments: [], booked: false });
    expect(dollars(bills.find((item) => item.userId === "user_chris")?.totalCents ?? -1)).toBe(1278);
    expect(dollars(bills.find((item) => item.userId === "user_taylor")?.totalCents ?? -1)).toBe(728);
    expect(bills.find((item) => item.userId === "user_taylor")?.lodgingCents).toBe(0);
    expect(bills.find((item) => item.userId === "user_taylor")?.optionalCents).toBe(0);
  });

  it("Example E: Taylor's $150 buy-in is forfeited after booking and tee times stay $120", () => {
    const left = five.map((member) =>
      member.userId === "user_taylor" ? { ...member, status: "off_trip" as const } : member,
    );
    const payments: MathPayment[] = [
      { milestoneId: "ms_buyin", userId: "user_taylor", amountCents: 15_000, status: "forfeited" },
    ];
    const bills = settledBills({ members: left, costs, spots, claims: claims(), payments, booked: true });
    expect(dollars(bills.find((item) => item.userId === "user_chris")?.totalCents ?? -1)).toBe(1365);
    expect(dollars(bills.find((item) => item.userId === "user_sam")?.totalCents ?? -1)).toBe(1271);
    expect(dollars(bills.find((item) => item.userId === "user_jordan")?.totalCents ?? -1)).toBe(1088);
    expect(dollars(bills.find((item) => item.userId === "user_drew")?.totalCents ?? -1)).toBe(1034);
    for (const id of ["user_chris", "user_sam", "user_jordan", "user_drew"]) {
      expect(dollars(bills.find((item) => item.userId === id)?.optionalCents ?? -1)).toBe(120);
    }
  });

  it("one more commit saves Chris $136 when the new payer has not taken a bed", () => {
    const table = sensitivity({
      members: four,
      costs,
      spots,
      claims: claims(),
      payments: [],
      booked: false,
      userId: "user_chris",
      minimumCommitters: 5,
    });
    expect(dollars(table.currentCents ?? -1)).toBe(1414);
    expect(dollars(table.ifOneMoreSavesCents ?? -1)).toBe(136);
    const at5 = table.rows.find((row) => row.payers === 5);
    expect(dollars(at5?.totalCents ?? -1)).toBe(1278);
  });
});

describe("lodging rules", () => {
  it("excludes the honoree's reserved weight and prices an unclaimed spot at zero", () => {
    const shares = lodgingShares(91_000, spots, claims(), ["user_chris", "user_sam", "user_jordan", "user_drew"]);
    expect(dollars(shares.get("user_chris") ?? -1)).toBe(300);
    expect(shares.get("user_alex")).toBeUndefined();
    const withTaylor = lodgingShares(91_000, spots, claims(), ["user_chris", "user_taylor"]);
    expect(withTaylor.get("user_taylor")).toBe(0);
    expect(dollars(withTaylor.get("user_chris") ?? -1)).toBe(910);
  });

  it("splits a shared king or queen between two approved claims", () => {
    const shared = spots.map((spot) => (spot.id === "s1" ? { ...spot, sharingEnabled: true } : spot));
    const both = [
      ...claims(),
      { spotId: "s1", userId: "user_sam", status: "approved" as const },
    ].filter((claim) => claim.spotId !== "s2");
    const shares = lodgingShares(91_000, shared, both, ["user_chris", "user_sam", "user_jordan", "user_drew"]);
    expect(shares.get("user_chris")).toBe(shares.get("user_sam"));
  });

  it("re-prices the room when a claimed weight leaves the payer set", () => {
    const before = lodgingShares(91_000, spots, claims(), ["user_chris", "user_sam", "user_jordan", "user_drew"]);
    const after = lodgingShares(91_000, spots, claims(), ["user_chris", "user_sam", "user_jordan"]);
    expect((after.get("user_chris") ?? 0) > (before.get("user_chris") ?? 0)).toBe(true);
  });
});

describe("commit then book", () => {
  it("reaches booking_ready once payers meet the minimum, before the deadline", () => {
    const outcome = reconcileTrip({
      status: "buy_in_open",
      buyInDeadline: "2026-12-16T05:59:00.000Z",
      minimumCommitters: 5,
      now: "2026-11-24T18:00:00.000Z",
      members: five,
    });
    expect(outcome.status).toBe("booking_ready");
    expect(outcome.payerCount).toBe(5);
    expect(outcome.refundBuyIns).toBe(false);
  });

  it("a booking_ready drop under the minimum reopens buy-in before the deadline", () => {
    const outcome = reconcileTrip({
      status: "booking_ready",
      buyInDeadline: "2026-12-16T05:59:00.000Z",
      minimumCommitters: 5,
      now: "2026-11-24T18:00:00.000Z",
      members: four,
    });
    expect(outcome.status).toBe("buy_in_open");
    expect(outcome.refundBuyIns).toBe(false);
  });

  it("the same short crew is under_minimum once the deadline has passed, and buy-ins refund", () => {
    const outcome = reconcileTrip({
      status: "booking_ready",
      buyInDeadline: "2026-12-16T05:59:00.000Z",
      minimumCommitters: 5,
      now: "2026-12-16T06:00:00.000Z",
      members: four,
    });
    expect(outcome.status).toBe("under_minimum");
    expect(outcome.payerCount).toBe(4);
    expect(outcome.refundBuyIns).toBe(true);
    expect(outcome.droppedUserIds).toContain("user_taylor");
    expect(outcome.members.find((member) => member.userId === "user_alex")?.status).toBe("committed");
  });

  it("does not refund or reopen a trip that is already booked", () => {
    const outcome = reconcileTrip({
      status: "booked",
      buyInDeadline: "2026-12-16T05:59:00.000Z",
      minimumCommitters: 5,
      now: "2026-12-16T06:00:00.000Z",
      members: four,
    });
    expect(outcome.status).toBe("booked");
    expect(outcome.refundBuyIns).toBe(false);
    expect(outcome.deadlineRan).toBe(false);
  });
});

describe("spot claim changes the live price", () => {
  it("giving Taylor the sofa bed changes Chris's N=5 share", () => {
    const open = billForUser(
      { members: five, costs, spots, claims: claims(), payments: [], booked: false },
      ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"],
      "user_chris",
    );
    const claimed = billForUser(
      { members: five, costs, spots, claims: claims("s6"), payments: [], booked: false },
      ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor"],
      "user_chris",
    );
    expect(dollars(open?.totalCents ?? -1)).toBe(1278);
    expect(claimed?.lodgingCents).not.toBe(open?.lodgingCents);
  });
});

/**
 * Bachelor-party money, spec v1.1.
 *
 * One lodging line splits by claimed bed weight:
 *   L_i = S_lodge * w_i / W_P
 * W_P is the sum of weights claimed by payers. The guest of honor's reserved
 * spot is not in W_P. An unclaimed spot adds nothing. Other shared costs split
 * evenly. Optional items split only across opted-in payers. After the stay is
 * booked, a forfeited buy-in pays down the lodging pool before the weight split.
 * Each component is rounded to the nearest dollar.
 */

export type Role = "organizer" | "member" | "honoree";
export type MemberStatus = "invited" | "joined" | "committed" | "off_trip";
export type TripStatus =
  | "planning"
  | "voting"
  | "buy_in_open"
  | "booking_ready"
  | "booked"
  | "under_minimum"
  | "cancelled";
export type SplitType = "shared" | "individual" | "optional";
export type MilestoneKind = "buy_in" | "installment" | "final";
export type AmountRule = "fixed" | "pct_of_share";
export type PaymentStatus = "due" | "paid" | "late" | "forfeited" | "refunded";

export interface MathMember {
  userId: string;
  role: Role;
  status: MemberStatus;
  committedAt?: string | null;
}

export interface MathCost {
  id: string;
  splitType: SplitType;
  category: string;
  amountCents: number;
  memberId: string | null;
  participantIds: string[];
  isLodging: boolean;
}

export type ClaimStatus = "pending" | "approved" | "denied";
export type BedChangePolicy = "member_requests" | "locked";

/** Beds do not store who is in them. Claims live in SpotClaim and are passed in. */
export interface MathSpot {
  id: string;
  weight: number;
  reservedForHonoree: boolean;
  /** King/queen beds can be shared by two members when this is on. */
  sharingEnabled: boolean;
  roomName?: string;
  bedType?: string;
}

export interface MathClaim {
  spotId: string;
  userId: string;
  status: ClaimStatus;
}

export interface MathMilestone {
  id: string;
  name: string;
  dueDate: string;
  kind: MilestoneKind;
  amountRule: AmountRule;
  amount: number;
  sortOrder: number;
}

export interface MathPayment {
  milestoneId: string;
  userId: string;
  amountCents: number;
  status: PaymentStatus;
}

export interface PersonBill {
  userId: string;
  payer: boolean;
  evenCents: number;
  lodgingCents: number;
  optionalCents: number;
  individualCents: number;
  totalCents: number;
}

export interface SensitivityRow {
  payers: number;
  totalCents: number;
}

export function nearestDollarCents(dollars: number): number {
  return Math.round(dollars) * 100;
}

export function isHonoree(member: MathMember): boolean {
  return member.role === "honoree";
}

export function isCommittedPayer(member: MathMember): boolean {
  return member.status === "committed" && !isHonoree(member);
}

export function isPotentialPayer(member: MathMember): boolean {
  return (member.status === "joined" || member.status === "committed") && !isHonoree(member);
}

export function isBooked(status: TripStatus): boolean {
  return status === "booked";
}

export function buyInStillRefundable(status: TripStatus): boolean {
  return status !== "booked" && status !== "cancelled";
}

export function sharedEvenCents(costs: MathCost[]): number {
  return costs
    .filter((cost) => cost.splitType === "shared" && !cost.isLodging)
    .reduce((sum, cost) => sum + cost.amountCents, 0);
}

export function lodgingCents(costs: MathCost[]): number {
  return costs.filter((cost) => cost.isLodging).reduce((sum, cost) => sum + cost.amountCents, 0);
}

export function forfeitedCents(payments: MathPayment[]): number {
  return payments
    .filter((payment) => payment.status === "forfeited")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
}

/** Approved claims only. Sharers on a sharing-enabled bed each take an equal slice of its weight. */
export function claimedWeight(
  spots: MathSpot[],
  claims: MathClaim[],
  payerIds: Set<string>,
): { userId: string; weight: number }[] {
  const bySpot = new Map<string, string[]>();
  for (const claim of claims) {
    if (claim.status !== "approved" || !payerIds.has(claim.userId)) continue;
    const list = bySpot.get(claim.spotId) ?? [];
    list.push(claim.userId);
    bySpot.set(claim.spotId, list);
  }
  const resolved: { userId: string; weight: number }[] = [];
  for (const spot of spots) {
    if (spot.reservedForHonoree) continue;
    const holders = (bySpot.get(spot.id) ?? []).slice().sort();
    const counted = spot.sharingEnabled ? holders.slice(0, 2) : holders.slice(0, 1);
    if (counted.length === 0) continue;
    const slice = spot.weight / counted.length;
    for (const userId of counted) resolved.push({ userId, weight: slice });
  }
  return resolved;
}

/** Weight-split lodging, nearest dollar per payer. The honoree's bed and empty beds add nothing. */
export function lodgingShares(
  lodgeCents: number,
  spots: MathSpot[],
  claims: MathClaim[],
  payerIds: string[],
): Map<string, number> {
  const payers = new Set(payerIds);
  const resolved = claimedWeight(spots, claims, payers);
  const weightSum = resolved.reduce((sum, claim) => sum + claim.weight, 0);
  const map = new Map<string, number>();
  for (const id of payerIds) map.set(id, 0);
  if (lodgeCents <= 0 || weightSum <= 0) return map;
  const dollars = lodgeCents / 100;
  for (const claim of resolved) {
    const previous = (map.get(claim.userId) ?? 0) / 100;
    map.set(claim.userId, nearestDollarCents(previous + (dollars * claim.weight) / weightSum));
  }
  return map;
}

export function evenShareCents(totalCents: number, count: number): number {
  if (count <= 0 || totalCents <= 0) return 0;
  return nearestDollarCents(totalCents / 100 / count);
}

export function optionalShareCents(costs: MathCost[], payerIds: string[]): Map<string, number> {
  const payers = new Set(payerIds);
  const map = new Map<string, number>();
  for (const id of payerIds) map.set(id, 0);
  for (const cost of costs) {
    if (cost.splitType !== "optional") continue;
    const sharing = cost.participantIds.filter((id) => payers.has(id));
    if (sharing.length === 0) continue;
    const each = evenShareCents(cost.amountCents, sharing.length);
    for (const id of sharing) map.set(id, (map.get(id) ?? 0) + each);
  }
  return map;
}

export function individualCentsFor(costs: MathCost[], userId: string): number {
  return costs
    .filter((cost) => cost.splitType === "individual" && cost.memberId === userId)
    .reduce((sum, cost) => sum + cost.amountCents, 0);
}

/**
 * Forfeited buy-ins pay down lodging only after the stay is booked.
 * Before that, buy-ins are refunded and do not change the price.
 */
export function lodgingBasisCents(costs: MathCost[], payments: MathPayment[], booked: boolean): number {
  const base = lodgingCents(costs);
  if (!booked) return base;
  return Math.max(0, base - forfeitedCents(payments));
}

export function billsFor(args: {
  members: MathMember[];
  costs: MathCost[];
  spots: MathSpot[];
  payments: MathPayment[];
  claims: MathClaim[];
  payerIds: string[];
  booked: boolean;
}): PersonBill[] {
  const payerIds = [...new Set(args.payerIds)];
  const even = evenShareCents(sharedEvenCents(args.costs), payerIds.length);
  const lodge = lodgingShares(
    lodgingBasisCents(args.costs, args.payments, args.booked),
    args.spots,
    args.claims,
    payerIds,
  );
  const optional = optionalShareCents(args.costs, payerIds);
  const payerSet = new Set(payerIds);
  const bills: PersonBill[] = [];
  for (const member of args.members) {
    const paying = payerSet.has(member.userId);
    if (!paying && !isHonoree(member)) continue;
    const lodging = paying ? (lodge.get(member.userId) ?? 0) : 0;
    const optionalCents = paying ? (optional.get(member.userId) ?? 0) : 0;
    const individual = paying ? individualCentsFor(args.costs, member.userId) : 0;
    const evenCents = paying ? even : 0;
    bills.push({
      userId: member.userId,
      payer: paying,
      evenCents,
      lodgingCents: lodging,
      optionalCents,
      individualCents: individual,
      totalCents: evenCents + lodging + optionalCents + individual,
    });
  }
  return bills;
}

export function committedPayerIds(members: MathMember[]): string[] {
  return members
    .filter(isCommittedPayer)
    .slice()
    .sort((a, b) => (a.committedAt ?? "").localeCompare(b.committedAt ?? "") || a.userId.localeCompare(b.userId))
    .map((member) => member.userId);
}

export function settledBills(args: {
  members: MathMember[];
  costs: MathCost[];
  spots: MathSpot[];
  claims: MathClaim[];
  payments: MathPayment[];
  booked: boolean;
}): PersonBill[] {
  return billsFor({ ...args, payerIds: committedPayerIds(args.members) });
}

/** Share if exactly these payers commit. Extra people keep whatever bed they already claimed. */
export function billForUser(
  args: {
    members: MathMember[];
    costs: MathCost[];
    spots: MathSpot[];
    claims: MathClaim[];
    payments: MathPayment[];
    booked: boolean;
  },
  payerIds: string[],
  userId: string,
): PersonBill | null {
  return billsFor({ ...args, payerIds }).find((bill) => bill.userId === userId) ?? null;
}

export function sensitivity(args: {
  members: MathMember[];
  costs: MathCost[];
  spots: MathSpot[];
  claims: MathClaim[];
  payments: MathPayment[];
  booked: boolean;
  userId: string;
  minimumCommitters: number;
  maxHeadcount?: number;
}): {
  rows: SensitivityRow[];
  currentCents: number | null;
  ifOneMoreSavesCents: number | null;
  ifSomeoneDropsAddsCents: number | null;
} {
  const committed = committedPayerIds(args.members);
  const waiting = args.members
    .filter((member) => member.status === "joined" && !isHonoree(member))
    .map((member) => member.userId)
    .sort();
  const sequence = [...committed];
  if (!sequence.includes(args.userId) && waiting.includes(args.userId)) sequence.push(args.userId);
  for (const id of waiting) if (!sequence.includes(id)) sequence.push(id);

  const cap = Math.max(args.maxHeadcount ?? sequence.length, sequence.length);
  const rows: SensitivityRow[] = [];
  for (let count = 1; count <= cap; count += 1) {
    const ids = sequence.slice(0, count);
    while (ids.length < count) ids.push(`forecast-${ids.length}`);
    if (!ids.includes(args.userId)) continue;
    if (count < args.minimumCommitters && count !== committed.length) continue;
    if (args.maxHeadcount && count > args.maxHeadcount && count !== committed.length) continue;
    const bill = billForUser(args, ids, args.userId);
    rows.push({ payers: count, totalCents: bill?.totalCents ?? 0 });
  }
  const currentPayers = committed.includes(args.userId) ? committed.length : 0;
  const currentCents = rows.find((row) => row.payers === currentPayers)?.totalCents ?? null;
  const next = rows.find((row) => row.payers === currentPayers + 1);
  const prev = rows.find((row) => row.payers === currentPayers - 1);
  return {
    rows,
    currentCents,
    ifOneMoreSavesCents: currentCents !== null && next ? currentCents - next.totalCents : null,
    ifSomeoneDropsAddsCents: currentCents !== null && prev ? prev.totalCents - currentCents : null,
  };
}

export interface StatusOutcome {
  status: TripStatus;
  members: MathMember[];
  droppedUserIds: string[];
  payerCount: number;
  refundBuyIns: boolean;
  deadlineRan: boolean;
}

function payerCount(members: MathMember[]): number {
  return members.filter(isCommittedPayer).length;
}

/** Promote, drop, or reopen based on headcount and the buy-in deadline. */
export function reconcileTrip(args: {
  status: TripStatus;
  buyInDeadline: string | null;
  minimumCommitters: number;
  now: string;
  members: MathMember[];
}): StatusOutcome {
  if (args.status === "cancelled" || args.status === "booked" || args.status === "planning" || args.status === "voting") {
    return {
      status: args.status,
      members: args.members,
      droppedUserIds: [],
      payerCount: payerCount(args.members),
      refundBuyIns: false,
      deadlineRan: false,
    };
  }

  const deadlinePassed =
    !!args.buyInDeadline && new Date(args.now).getTime() >= new Date(args.buyInDeadline).getTime();
  let members = args.members;
  const droppedUserIds: string[] = [];
  let deadlineRan = false;
  if (deadlinePassed && (args.status === "buy_in_open" || args.status === "booking_ready")) {
    deadlineRan = true;
    members = args.members.map((member) => {
      if (isHonoree(member)) return member.status === "committed" ? member : { ...member, status: "committed" as const };
      if (member.status === "joined" || member.status === "invited") {
        droppedUserIds.push(member.userId);
        return { ...member, status: "off_trip" as const };
      }
      return member;
    });
  }

  const payers = payerCount(members);
  const enough = payers >= args.minimumCommitters;
  if (!enough && deadlinePassed) {
    return { status: "under_minimum", members, droppedUserIds, payerCount: payers, refundBuyIns: true, deadlineRan };
  }
  if (!enough) {
    return {
      status: "buy_in_open",
      members,
      droppedUserIds,
      payerCount: payers,
      refundBuyIns: false,
      deadlineRan,
    };
  }
  return {
    status: "booking_ready",
    members,
    droppedUserIds,
    payerCount: payers,
    refundBuyIns: false,
    deadlineRan,
  };
}

export function spotCapacity(spot: MathSpot): number {
  if (spot.reservedForHonoree) return 0;
  return spot.sharingEnabled ? 2 : 1;
}

export function unclaimedSpots(spots: MathSpot[], claims: MathClaim[]): number {
  return spots.reduce((open, spot) => {
    const taken = claims.filter((claim) => claim.spotId === spot.id && claim.status === "approved").length;
    return open + Math.max(0, spotCapacity(spot) - taken);
  }, 0);
}

export interface MilestoneLine {
  milestoneId: string;
  name: string;
  kind: MilestoneKind;
  dueDate: string;
  amountCents: number;
  status: PaymentStatus;
  locked: boolean;
}

export function milestoneSchedule(args: {
  totalCents: number;
  milestones: MathMilestone[];
  payments: MathPayment[];
  userId: string;
  buyInAmountCents: number;
  now: string;
}): MilestoneLine[] {
  const ordered = [...args.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  let finalAt = ordered.length - 1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index]?.kind === "final") {
      finalAt = index;
      break;
    }
  }
  let remaining = args.totalCents;
  return ordered.map((milestone, index) => {
    const payment = args.payments.find((item) => item.milestoneId === milestone.id && item.userId === args.userId);
    const locked = !!payment && (payment.status === "paid" || payment.status === "forfeited" || payment.status === "refunded");
    let amount = 0;
    if (locked) amount = payment.amountCents;
    else if (index === finalAt) amount = Math.max(0, remaining);
    else if (milestone.kind === "buy_in") {
      amount = Math.max(0, Math.min(args.buyInAmountCents, Math.max(0, remaining)));
    } else if (milestone.amountRule === "pct_of_share") {
      amount = Math.max(0, Math.min(Math.round((args.totalCents * milestone.amount) / 100), Math.max(0, remaining)));
    } else amount = Math.max(0, Math.min(milestone.amount, Math.max(0, remaining)));
    remaining -= amount;
    let status: PaymentStatus = locked ? payment.status : "due";
    if (!locked && amount > 0 && milestone.kind !== "buy_in" && new Date(args.now).getTime() >= new Date(milestone.dueDate).getTime()) {
      status = "late";
    }
    if (!locked && amount <= 0) status = "paid";
    return {
      milestoneId: milestone.id,
      name: milestone.name,
      kind: milestone.kind,
      dueDate: milestone.dueDate,
      amountCents: amount,
      status,
      locked,
    };
  });
}

export function nextDue(lines: MilestoneLine[]): MilestoneLine | null {
  return lines.find((line) => (line.status === "due" || line.status === "late") && line.amountCents > 0) ?? null;
}

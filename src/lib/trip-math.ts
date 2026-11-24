/**
 * Bachelor-party money, spec v1.2.
 *
 * Lodging splits by effective bed weight. Sharers split that bed's weight.
 * The honoree's reserved room is outside W_P unless a payer is sharing it,
 * in which case only the payer's slice counts. Other shared costs, including
 * the honoree's own flight, split evenly. Optional items split only across
 * opted-in payers. A forfeited buy-in, after booking, pays down lodging first.
 * The shared piece (lodging + even + optional) rounds UP to the next dollar.
 * Flights and other individual items are added after that and are not rounded.
 * The extra dollars stay in the trip pot.
 */

export type Role = "organizer" | "member" | "honoree";
export type MemberStatus = "invited" | "joined" | "committed" | "off_trip" | "declined";
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
  /** Order for people who have not bought in yet. Lower picks the next bed. */
  forecastOrder?: number;
}

export interface MathCost {
  id: string;
  splitType: SplitType;
  category: string;
  amountCents: number;
  memberId: string | null;
  participantIds: string[];
  isLodging: boolean;
  lowEstimate?: number | null;
  highEstimate?: number | null;
}

export type ClaimStatus = "pending" | "approved" | "denied";
export type BedChangePolicy = "member_requests" | "locked";

/** Beds do not store who is in them. Claims live in SpotClaim and are passed in. */
export interface MathSpot {
  id: string;
  weight: number;
  reservedForHonoree: boolean;
  /** Members may take an open second slot without a request. */
  sharingEnabled: boolean;
  /** 1 or 2. A second occupant needs capacity 2. */
  capacity: number;
  sortOrder?: number;
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
  expanded: boolean;
}

export interface ForecastExtra {
  userId: string;
  individualCents: number;
}

/** Already-whole dollars stay put. Anything above a dollar rounds up. */
export function roundUpDollarCents(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.ceil(cents / 100 - 1e-9) * 100;
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

export function sharedEvenCents(costs: MathCost[], honoreeIds: string[] = []): number {
  const honorees = new Set(honoreeIds);
  return costs
    .filter((cost) => {
      if (cost.isLodging) return false;
      if (cost.splitType === "shared") return true;
      return cost.splitType === "individual" && !!cost.memberId && honorees.has(cost.memberId);
    })
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

export function bedCapacity(spot: MathSpot): number {
  return Math.max(1, spot.capacity || (spot.sharingEnabled ? 2 : 1));
}

/** Approved claims only. Every occupant, including the honoree, splits the bed's weight. */
export function claimedWeight(
  spots: MathSpot[],
  claims: MathClaim[],
  payerIds: Set<string>,
): { userId: string; weight: number }[] {
  const bySpot = new Map<string, string[]>();
  for (const claim of claims) {
    if (claim.status !== "approved") continue;
    const list = bySpot.get(claim.spotId) ?? [];
    list.push(claim.userId);
    bySpot.set(claim.spotId, list);
  }
  const resolved: { userId: string; weight: number }[] = [];
  for (const spot of spots) {
    const holders = (bySpot.get(spot.id) ?? []).slice().sort().slice(0, bedCapacity(spot));
    if (holders.length === 0) continue;
    const slice = spot.weight / holders.length;
    for (const userId of holders) {
      if (!payerIds.has(userId)) continue;
      resolved.push({ userId, weight: slice });
    }
  }
  return resolved;
}

export function rawLodgingCents(
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
  for (const claim of resolved) {
    map.set(claim.userId, (map.get(claim.userId) ?? 0) + (lodgeCents * claim.weight) / weightSum);
  }
  return map;
}

export function individualCentsFor(costs: MathCost[], userId: string, honoreeIds: string[] = []): number {
  const honorees = new Set(honoreeIds);
  return costs
    .filter((cost) => cost.splitType === "individual" && cost.memberId === userId && !honorees.has(userId))
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
  lodgeOverrideCents?: number | null;
  extras?: ForecastExtra[];
}): PersonBill[] {
  const payerIds = [...new Set(args.payerIds)];
  const honoreeIds = args.members.filter(isHonoree).map((member) => member.userId);
  const payerSet = new Set(payerIds);
  const evenPool = sharedEvenCents(args.costs, honoreeIds);
  const evenRaw = payerIds.length > 0 ? evenPool / payerIds.length : 0;
  const lodgeBase =
    args.lodgeOverrideCents != null
      ? Math.max(0, args.lodgeOverrideCents - (args.booked ? forfeitedCents(args.payments) : 0))
      : lodgingBasisCents(args.costs, args.payments, args.booked);
  const lodge = rawLodgingCents(lodgeBase, args.spots, args.claims, payerIds);
  const optional = new Map<string, number>();
  for (const id of payerIds) optional.set(id, 0);
  for (const cost of args.costs) {
    if (cost.splitType !== "optional") continue;
    const sharing = cost.participantIds.filter((id) => payerSet.has(id));
    if (sharing.length === 0) continue;
    const each = cost.amountCents / sharing.length;
    for (const id of sharing) optional.set(id, (optional.get(id) ?? 0) + each);
  }
  const extraFlight = new Map((args.extras ?? []).map((extra) => [extra.userId, extra.individualCents]));
  const known = new Set(args.members.map((member) => member.userId));
  const bills: PersonBill[] = [];
  const emit = (userId: string, paying: boolean) => {
    const lodgingRaw = paying ? (lodge.get(userId) ?? 0) : 0;
    const optionalRaw = paying ? (optional.get(userId) ?? 0) : 0;
    const evenPart = paying ? evenRaw : 0;
    const shared = roundUpDollarCents(lodgingRaw + evenPart + optionalRaw);
    const shownEven = Math.round(evenPart);
    const shownOptional = Math.round(optionalRaw);
    const shownLodging = shared - shownEven - shownOptional;
    const individual =
      (paying ? individualCentsFor(args.costs, userId, honoreeIds) : 0) + (paying ? (extraFlight.get(userId) ?? 0) : 0);
    bills.push({
      userId,
      payer: paying,
      evenCents: shownEven,
      lodgingCents: shownLodging,
      optionalCents: shownOptional,
      individualCents: individual,
      totalCents: shared + individual,
    });
  };
  for (const member of args.members) {
    const paying = payerSet.has(member.userId);
    if (!paying && !isHonoree(member)) continue;
    emit(member.userId, paying);
  }
  for (const id of payerIds) {
    if (!known.has(id)) emit(id, true);
  }
  return bills;
}

export function vendorCents(args: {
  costs: MathCost[];
  members: MathMember[];
  payerIds: string[];
  payments: MathPayment[];
  booked: boolean;
  lodgeOverrideCents?: number | null;
  extras?: ForecastExtra[];
}): number {
  const honoreeIds = args.members.filter(isHonoree).map((member) => member.userId);
  const payers = new Set(args.payerIds);
  const lodge =
    args.lodgeOverrideCents != null
      ? Math.max(0, args.lodgeOverrideCents - (args.booked ? forfeitedCents(args.payments) : 0))
      : lodgingBasisCents(args.costs, args.payments, args.booked);
  const optional = args.costs
    .filter((cost) => cost.splitType === "optional" && cost.participantIds.some((id) => payers.has(id)))
    .reduce((sum, cost) => sum + cost.amountCents, 0);
  const individual =
    args.costs
      .filter((cost) => cost.splitType === "individual" && cost.memberId && payers.has(cost.memberId) && !honoreeIds.includes(cost.memberId))
      .reduce((sum, cost) => sum + cost.amountCents, 0) +
    (args.extras ?? []).filter((extra) => payers.has(extra.userId)).reduce((sum, extra) => sum + extra.individualCents, 0);
  return lodge + sharedEvenCents(args.costs, honoreeIds) + optional + individual;
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
  lodgeOverrideCents?: number | null;
  extras?: ForecastExtra[];
}): PersonBill[] {
  return billsFor({ ...args, payerIds: committedPayerIds(args.members) });
}

/** Share if exactly these payers commit. Extra people keep whatever bed they already claimed. */
export function projectClaims(spots: MathSpot[], claims: MathClaim[], payerIds: string[]): MathClaim[] {
  const wanted = new Set(payerIds);
  const kept = claims.filter((claim) => claim.status === "approved" && wanted.has(claim.userId));
  const seated = new Set(kept.map((claim) => claim.userId));
  const occupied = new Map<string, number>();
  for (const claim of kept) occupied.set(claim.spotId, (occupied.get(claim.spotId) ?? 0) + 1);
  const result = [...kept];
  const waiting = payerIds.filter((id) => !seated.has(id));
  const vacant = spots
    .filter((spot) => !spot.reservedForHonoree && (occupied.get(spot.id) ?? 0) === 0)
    .slice()
    .sort((a, b) => b.weight - a.weight || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const still: string[] = [];
  waiting.forEach((id, index) => {
    const spot = vacant[index];
    if (!spot) {
      still.push(id);
      return;
    }
    result.push({ spotId: spot.id, userId: id, status: "approved" });
    occupied.set(spot.id, 1);
  });
  const shares = spots
    .filter((spot) => !spot.reservedForHonoree && spot.sharingEnabled)
    .filter((spot) => {
      const taken = occupied.get(spot.id) ?? 0;
      return taken > 0 && taken < bedCapacity(spot);
    })
    .sort((a, b) => b.weight - a.weight || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  still.forEach((id, index) => {
    const spot = shares[index];
    if (!spot) return;
    result.push({ spotId: spot.id, userId: id, status: "approved" });
  });
  return result;
}

export function unsharedCapacity(spots: MathSpot[]): number {
  return spots.filter((spot) => !spot.reservedForHonoree).length;
}

export function expandedCapacity(spots: MathSpot[]): number {
  return spots
    .filter((spot) => !spot.reservedForHonoree)
    .reduce((sum, spot) => sum + (spot.sharingEnabled ? bedCapacity(spot) : 1), 0);
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
  extras?: ForecastExtra[];
  lodgeOverrideCents?: number | null;
}): {
  rows: SensitivityRow[];
  currentCents: number | null;
  ifOneMoreSavesCents: number | null;
  ifSomeoneDropsAddsCents: number | null;
  underMinimumIfDrop: boolean;
} {
  const committed = committedPayerIds(args.members);
  const pipeline = args.members
    .filter((member) => !isHonoree(member) && member.status !== "off_trip" && member.status !== "declined" && !committed.includes(member.userId))
    .slice()
    .sort((a, b) => (a.forecastOrder ?? 99) - (b.forecastOrder ?? 99) || a.userId.localeCompare(b.userId))
    .map((member) => member.userId);
  const extraIds = (args.extras ?? []).map((extra) => extra.userId);
  const sequence = [...committed, ...pipeline, ...extraIds];
  const cap = args.maxHeadcount ?? sequence.length;
  const base = unsharedCapacity(args.spots);
  const quote = (ids: string[]) =>
    billsFor({
      ...args,
      payerIds: ids,
      claims: projectClaims(args.spots, args.claims, ids),
    }).find((bill) => bill.userId === args.userId)?.totalCents ?? null;

  const rows: SensitivityRow[] = [];
  for (let count = args.minimumCommitters; count <= Math.min(cap, sequence.length); count += 1) {
    const total = quote(sequence.slice(0, count));
    if (total === null) continue;
    rows.push({ payers: count, totalCents: total, expanded: count > base });
  }
  const currentCount = committed.includes(args.userId) ? committed.length : 0;
  const currentCents = currentCount > 0 ? quote(sequence.slice(0, currentCount)) : null;
  const nextCents = currentCount > 0 && currentCount < sequence.length ? quote(sequence.slice(0, currentCount + 1)) : null;
  const others = committed.filter((id) => id !== args.userId);
  const dropTarget = others[others.length - 1];
  const droppedIds = dropTarget ? committed.filter((id) => id !== dropTarget) : [];
  const prevCents = droppedIds.includes(args.userId) ? quote(droppedIds) : null;
  return {
    rows,
    currentCents,
    ifOneMoreSavesCents: currentCents !== null && nextCents !== null ? currentCents - nextCents : null,
    ifSomeoneDropsAddsCents: currentCents !== null && prevCents !== null ? prevCents - currentCents : null,
    underMinimumIfDrop: droppedIds.length > 0 && droppedIds.length < args.minimumCommitters,
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

export function openSlots(spots: MathSpot[], claims: MathClaim[]): number {
  return spots
    .filter((spot) => !spot.reservedForHonoree)
    .reduce((open, spot) => {
      const taken = claims.filter((claim) => claim.spotId === spot.id && claim.status === "approved").length;
      const direct = spot.sharingEnabled ? bedCapacity(spot) : 1;
      return open + Math.max(0, direct - taken);
    }, 0);
}

export function unclaimedSpots(spots: MathSpot[], claims: MathClaim[]): number {
  return openSlots(spots, claims);
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

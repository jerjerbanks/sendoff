import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { DEMO_TRIP_ID, LAKE_TRIP_ID, APP_NAME } from "./constants";
import { RULES } from "./rules";
import { contactKey } from "./tokens";
import { isDemoTrip } from "./demo-tour";
import { getD1, getDb } from "./db";
import { recordFunnel, type FunnelStep } from "./funnel";
import { importedRoomSpots, type ImportRoom } from "./listing-import";
import {
  demoCosts,
  demoMembers,
  demoMilestones,
  demoOptions,
  demoPayments,
  demoPolls,
  demoAirports,
  demoBudgets,
  demoClaims,
  demoQuotes,
  demoSpots,
  demoTeeParticipants,
  demoTrip,
  demoUsers,
  demoVotes,
  lakeBoatRiders,
  lakeBudgets,
  lakeClaims,
  lakeCosts,
  lakeMembers,
  lakeMilestones,
  lakeOptions,
  lakeParties,
  lakePayments,
  lakePolls,
  lakeSpots,
  lakeTravelers,
  lakeTrip,
  lakeUsers,
  lakeVotes,
} from "./demo-data";
import {
  costItemParticipants,
  costItems,
  flightQuotes,
  privateBudgets,
  tripEvents,
  funnelEvents,
  milestones,
  parties,
  payments,
  pollOptions,
  travelerOptIns,
  travelers,
  polls,
  sleepRooms,
  sleepSpots,
  splitModeAcks,
  spotClaims,
  spotRequests,
  tripMembers,
  trips,
  users,
  votes,
} from "./schema";
import {
  DEFAULT_AGE_WEIGHTS,
  agePricedAmount,
  hasAgePrices,
  partyAgeWeight,
  partySleeps,
  partySpotTravelers,
  travelerSharesFor,
  isBooked,
  isCommittedPayer,
  isHonoree,
  isPotentialPayer,
  reconcileTrip,
  milestoneSchedule,
  settledBills,
  splitChangeReady,
  unclaimedSpots,
  type MathCost,
  type MathClaim,
  type MathSpot,
  type MathMember,
  type MathMilestone,
  type MathPayment,
  type MemberStatus,
  type MilestoneKind,
  type PaymentStatus,
  type Role,
  type SplitType,
  type TripStatus,
  type AgeBand,
  type AgePrices,
  type AmountRule,
  type AgeWeights,
  type MathTraveler,
  type SplitMode,
} from "./trip-math";

export type Result = { ok: true } | { ok: false; error: string };

export interface MemberRecord {
  userId: string;
  name: string;
  contact: string;
  role: Role;
  status: MemberStatus;
  committedAt: string | null;
  /** The payer of this member's party. Equal to userId for a payer. */
  partyUserId: string;
}

export type ShareComfort = "any" | "no_share" | "note_only";

/** Organizer-only fields (shareComfort*) must be stripped before another party sees a party. */
export interface PartyRecord {
  payerUserId: string;
  name: string;
  shareComfort: ShareComfort;
  shareComfortNote: string | null;
}

/** needsNotes is organizer-only. */
export interface TravelerRecord extends MathTraveler {
  name: string;
  userId: string | null;
  needsNotes: string | null;
  honoreeRole: string | null;
  coSleepSpotId: string | null;
  sortOrder: number;
  /** Read from the payer because the party has no traveler rows yet. */
  synthetic: boolean;
}

export interface SpotRecord extends MathSpot {
  privateBath: boolean;
  privateRoom: boolean;
  groundFloor: boolean;
  noStairs: boolean;
  accessibleBath: boolean;
  cribSpace: boolean;
  coSleepAllowed: boolean;
  maxCoSleepers: number;
}

export interface CostRecord extends MathCost {
  agePrices: AgePrices | null;
  /** Travelers opted in to an optional item. */
  optInTravelerIds: string[];
}

export const AGE_BANDS: AgeBand[] = ["adult", "teen", "child", "infant"];

export function asAgeBand(value: string | null | undefined): AgeBand {
  return value === "teen" || value === "child" || value === "infant" ? value : "adult";
}

export function asSplitMode(value: string | null | undefined): SplitMode {
  return value === "even_per_traveler" || value === "even_per_party" ? value : "weighted_by_spot";
}

export function parseAgeWeights(value: string | null | undefined): AgeWeights {
  if (!value) return { ...DEFAULT_AGE_WEIGHTS };
  try {
    const parsed = JSON.parse(value) as Partial<AgeWeights>;
    const out = { ...DEFAULT_AGE_WEIGHTS };
    for (const band of AGE_BANDS) {
      const n = Number(parsed[band]);
      if (Number.isFinite(n) && n >= 0) out[band] = n;
    }
    return out;
  } catch {
    return { ...DEFAULT_AGE_WEIGHTS };
  }
}

/** bed-type default: co-sleep allowed on a king or queen. */
export function defaultCoSleep(bedType: string): boolean {
  const bed = bedType.toLowerCase();
  return bed === "king" || bed === "queen";
}

export function honoreeRoleFor(style: string | null): string {
  if (style === "bachelor") return "groom";
  if (style === "bachelorette") return "bride";
  return "other";
}

export function selfTravelerId(tripId: string, userId: string): string {
  return `self_${tripId}_${userId}`;
}

export interface RawTrip {
  trip: {
    id: string;
    name: string;
    tripType: string;
    organizerId: string;
    guestOfHonorUserId: string;
    dateWindow: string;
    status: TripStatus;
    buyInAmount: number;
    buyInDeadline: string | null;
    minHeadcount: number;
    maxHeadcount: number;
    bedChangePolicy: "member_requests" | "locked";
    honoreeExcluded: boolean;
    inviteToken: string;
    simulatedNow: string | null;
    bookingConfirmation: string | null;
    actualLodgingTotal: number | null;
    bookedAt: string | null;
    preWeddingStyle: string | null;
    splitMode: SplitMode;
    pendingSplitMode: SplitMode | null;
    ageWeights: AgeWeights;
  };
  spots: SpotRecord[];
  claims: MathClaim[];
  members: MemberRecord[];
  parties: PartyRecord[];
  travelers: TravelerRecord[];
  polls: { id: string; kind: string; deadline: string; lockedOptionId: string | null }[];
  options: { id: string; pollId: string; label: string; estCost: number; link: string; sortOrder: number; lodgingEstimate: number | null; hidden: boolean }[];
  votes: { pollOptionId: string; userId: string }[];
  costs: CostRecord[];
  costLabels: { id: string; label: string }[];
  milestones: MathMilestone[];
  payments: (MathPayment & { id: string; paidAt: string | null })[];
  splitAcks: { payerUserId: string; proposedMode: SplitMode; acknowledgedAt: string }[];
}

function asRole(value: string): Role {
  if (value === "organizer" || value === "honoree" || value === "member") return value;
  return "member";
}

function asStatus(value: string): MemberStatus {
  if (value === "invited" || value === "joined" || value === "committed" || value === "off_trip" || value === "declined") return value;
  return "joined";
}

function asTripStatus(value: string): TripStatus {
  if (
    value === "planning" ||
    value === "voting" ||
    value === "buy_in_open" ||
    value === "booking_ready" ||
    value === "booked" ||
    value === "under_minimum" ||
    value === "cancelled"
  ) {
    return value;
  }
  return "planning";
}

function asPaymentStatus(value: string): PaymentStatus {
  if (value === "due" || value === "paid" || value === "late" || value === "forfeited" || value === "refunded") {
    return value;
  }
  return "due";
}

function asMilestoneKind(value: string): MilestoneKind {
  if (value === "buy_in" || value === "installment" || value === "final") return value;
  return "installment";
}

function asSplit(value: string): SplitType {
  if (value === "shared" || value === "individual" || value === "optional") return value;
  return "shared";
}

function asAmountRule(value: string): AmountRule {
  if (value === "pct_of_share" || value === "pct_of_lodging" || value === "fixed") return value;
  return "fixed";
}

const lockedPayment = new Set<PaymentStatus>(["paid", "forfeited", "refunded"]);

export function tripNow(raw: RawTrip): string {
  return raw.trip.simulatedNow ?? new Date().toISOString();
}

export function buyInTermsLocked(raw: RawTrip): boolean {
  return raw.members.some((member) => isCommittedPayer(member));
}

export async function readRaw(tripId: string): Promise<RawTrip | null> {
  const db = getDb();
  const trip = (await db.select().from(trips).where(eq(trips.id, tripId)))[0];
  if (!trip) return null;

  const [memberRows, pollRows, costRows, milestoneRows, spotRows, partyRows, travelerRows, ackRows] = await Promise.all([
    db.select({
      userId: tripMembers.userId,
      name: users.name,
      contact: users.contact,
      role: tripMembers.role,
      status: tripMembers.status,
      committedAt: tripMembers.committedAt,
      partyUserId: tripMembers.partyUserId,
    })
    .from(tripMembers)
    .innerJoin(users, eq(users.id, tripMembers.userId))
    .where(eq(tripMembers.tripId, tripId)),
    db.select().from(polls).where(eq(polls.tripId, tripId)),
    db.select().from(costItems).where(eq(costItems.tripId, tripId)),
    db.select().from(milestones).where(eq(milestones.tripId, tripId)),
    db.select().from(sleepSpots).where(eq(sleepSpots.tripId, tripId)),
    db.select().from(parties).where(eq(parties.tripId, tripId)),
    db.select().from(travelers).where(eq(travelers.tripId, tripId)),
    db.select().from(splitModeAcks).where(eq(splitModeAcks.tripId, tripId)),
  ]);
  const pollIds = pollRows.map((poll) => poll.id);
  const costIds = costRows.map((cost) => cost.id);
  const milestoneIds = milestoneRows.map((milestone) => milestone.id);
  const spotIds = spotRows.map((spot) => spot.id);
  const [optionRows, participantRows, paymentRows, claimRows, optInRows] = await Promise.all([
    pollIds.length ? db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds)) : Promise.resolve([]),
    costIds.length ? db.select().from(costItemParticipants).where(inArray(costItemParticipants.costItemId, costIds)) : Promise.resolve([]),
    milestoneIds.length ? db.select().from(payments).where(inArray(payments.milestoneId, milestoneIds)) : Promise.resolve([]),
    spotIds.length ? db.select().from(spotClaims).where(inArray(spotClaims.spotId, spotIds)) : Promise.resolve([]),
    costIds.length ? db.select().from(travelerOptIns).where(inArray(travelerOptIns.costItemId, costIds)) : Promise.resolve([]),
  ]);
  const optionIds = optionRows.map((option) => option.id);
  const voteRows = optionIds.length
    ? await db.select().from(votes).where(inArray(votes.pollOptionId, optionIds))
    : [];

  const ageWeights = parseAgeWeights(trip.ageWeights);
  const members: MemberRecord[] = memberRows.map((member) => ({
    userId: member.userId,
    name: member.name,
    contact: member.contact,
    role: asRole(member.role),
    status: asStatus(member.status),
    committedAt: member.committedAt,
    partyUserId: member.partyUserId || member.userId,
  }));
  const payers = members.filter((member) => member.partyUserId === member.userId);
  const travelerList: TravelerRecord[] = [];
  for (const payer of payers) {
    const rows = travelerRows
      .filter((row) => row.partyUserId === payer.userId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (rows.length === 0) {
      travelerList.push({
        id: selfTravelerId(tripId, payer.userId),
        partyId: payer.userId,
        name: payer.name,
        ageBand: "adult",
        isHonoree: payer.role === "honoree",
        userId: payer.userId,
        needsNotes: null,
        honoreeRole: payer.role === "honoree" ? honoreeRoleFor(trip.preWeddingStyle) : null,
        coSleepSpotId: null,
        coSleep: false,
        sortOrder: 0,
        synthetic: true,
      });
      continue;
    }
    for (const row of rows) {
      travelerList.push({
        id: row.id,
        partyId: payer.userId,
        name: row.name,
        ageBand: asAgeBand(row.ageBand),
        isHonoree: row.isHonoree === 1,
        userId: row.userId,
        needsNotes: row.needsNotes,
        honoreeRole: row.honoreeRole,
        coSleepSpotId: row.coSleepSpotId,
        coSleep: !!row.coSleepSpotId,
        sortOrder: row.sortOrder,
        synthetic: false,
      });
    }
  }
  const partyList: PartyRecord[] = payers.map((payer) => {
    const row = partyRows.find((item) => item.payerUserId === payer.userId);
    return {
      payerUserId: payer.userId,
      name: row?.name ?? payer.name.split(" ")[0] ?? payer.name,
      shareComfort: row?.shareComfort === "no_share" || row?.shareComfort === "note_only" ? row.shareComfort : "any",
      shareComfortNote: row?.shareComfortNote ?? null,
    };
  });
  const honoreeExcluded = trip.honoreeExcludedFromSplit === 1;
  /** A legacy per-person opt-in belongs to that payer's own traveler row. */
  const selfOf = (userId: string) =>
    travelerList.find((traveler) => traveler.partyId === userId && traveler.userId === userId) ??
    travelerList.find((traveler) => traveler.partyId === userId);
  const costList: CostRecord[] = costRows.map((cost) => {
    const prices: AgePrices = {
      adult: cost.agePriceAdult,
      teen: cost.agePriceTeen,
      child: cost.agePriceChild,
      infant: cost.agePriceInfant,
    };
    const priced = hasAgePrices(prices);
    const optInIds = new Set(optInRows.filter((row) => row.costItemId === cost.id).map((row) => row.travelerId));
    for (const row of participantRows.filter((item) => item.costItemId === cost.id)) {
      const self = selfOf(row.userId);
      if (self) optInIds.add(self.id);
    }
    const optedIn = travelerList.filter((traveler) => optInIds.has(traveler.id));
    const optional = cost.splitType === "optional";
    return {
      id: cost.id,
      splitType: asSplit(cost.splitType),
      category: cost.category,
      amountCents: optional && priced ? agePricedAmount(optedIn, prices) : cost.amount,
      memberId: cost.memberId,
      participantIds: [...new Set(optedIn.map((traveler) => traveler.partyId))],
      isLodging: cost.isLodging === 1,
      lowEstimate: cost.lowEstimate,
      highEstimate: cost.highEstimate,
      agePrices: priced ? prices : null,
      optInTravelerIds: optedIn.map((traveler) => traveler.id),
      agePriced: optional && priced,
      travelerShares: optional
        ? travelerSharesFor({ optedIn, weights: ageWeights, honoreeExcluded, prices: priced ? prices : null })
        : undefined,
    };
  });

  return {
    trip: {
      id: trip.id,
      name: trip.name,
      tripType: trip.tripType,
      organizerId: trip.organizerId,
      guestOfHonorUserId: trip.guestOfHonorUserId,
      dateWindow: trip.dateWindow,
      status: asTripStatus(trip.status),
      buyInAmount: trip.buyInAmount,
      buyInDeadline: trip.buyInDeadline,
      minHeadcount: trip.minHeadcount,
      maxHeadcount: trip.maxHeadcount,
      bedChangePolicy: trip.bedChangePolicy === "locked" ? "locked" : "member_requests",
      honoreeExcluded: trip.honoreeExcludedFromSplit === 1,
      inviteToken: trip.inviteToken,
      simulatedNow: trip.simulatedNow,
      bookingConfirmation: trip.bookingConfirmation,
      actualLodgingTotal: trip.actualLodgingTotal,
      bookedAt: trip.bookedAt,
      preWeddingStyle: trip.preWeddingStyle,
      splitMode: asSplitMode(trip.splitMode),
      pendingSplitMode: trip.pendingSplitMode ? asSplitMode(trip.pendingSplitMode) : null,
      ageWeights,
    },
    spots: spotRows.map((spot) => {
      const coSleepAllowed = spot.coSleepAllowed == null ? defaultCoSleep(spot.bedType) : spot.coSleepAllowed === 1;
      return {
        id: spot.id,
        weight: spot.weight / 1000,
        reservedForHonoree: spot.reservedForHonoree === 1,
        sharingEnabled: spot.sharingEnabled === 1,
        capacity: spot.capacity || 1,
        sortOrder: spot.sortOrder || 0,
        roomName: spot.roomName,
        bedType: spot.bedType,
        reservedForUserId: spot.reservedForUserId,
        privateBath: spot.privateBath === 1,
        privateRoom: spot.privateRoom === 1,
        groundFloor: spot.groundFloor === 1,
        noStairs: spot.noStairs === 1,
        accessibleBath: spot.accessibleBath === 1,
        cribSpace: spot.cribSpace === 1,
        coSleepAllowed,
        maxCoSleepers: spot.maxCoSleepers ?? (coSleepAllowed ? 1 : 0),
      };
    }),
    claims: claimRows.map((claim) => ({
      spotId: claim.spotId,
      userId: claim.userId,
      status: claim.status === "approved" || claim.status === "denied" ? claim.status : "pending" as const,
    })),
    members,
    parties: partyList,
    travelers: travelerList,
    polls: pollRows.map((poll) => ({
      id: poll.id,
      kind: poll.kind,
      deadline: poll.deadline,
      lockedOptionId: poll.lockedOptionId,
    })),
    options: optionRows.map((option) => ({
      id: option.id,
      pollId: option.pollId,
      label: option.label,
      estCost: option.estCost,
      link: option.link,
      sortOrder: option.sortOrder,
      lodgingEstimate: option.lodgingEstimate,
      hidden: option.hiddenByOrganizer === 1,
    })),
    votes: voteRows.map((vote) => ({ pollOptionId: vote.pollOptionId, userId: vote.userId })),
    costs: costList,
    costLabels: costRows.map((cost) => ({ id: cost.id, label: cost.label })),
    milestones: milestoneRows.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      dueDate: milestone.dueDate,
      kind: asMilestoneKind(milestone.kind),
      amountRule: asAmountRule(milestone.amountRule),
      amount: milestone.amount,
      sortOrder: milestone.sortOrder,
    })),
    payments: paymentRows.map((payment) => ({
      id: payment.id,
      milestoneId: payment.milestoneId,
      userId: payment.userId,
      amountCents: payment.amount,
      status: asPaymentStatus(payment.status),
      paidAt: payment.paidAt,
    })),
    splitAcks: ackRows.map((ack) => ({
      payerUserId: ack.payerUserId,
      proposedMode: asSplitMode(ack.proposedMode),
      acknowledgedAt: ack.acknowledgedAt,
    })),
  };
}

export function isPayerMember(member: MemberRecord): boolean {
  return member.partyUserId === member.userId;
}

export function travelersOf(raw: RawTrip, partyUserId: string): TravelerRecord[] {
  return raw.travelers.filter((traveler) => traveler.partyId === partyUserId);
}

/** One MathMember per paying party. Other account-holders on a party are not money units. */
export function mathMembers(raw: RawTrip): MathMember[] {
  return raw.members.filter(isPayerMember).map((member) => {
    const mine = travelersOf(raw, member.userId);
    return {
      userId: member.userId,
      role: member.role,
      status: member.status,
      committedAt: member.committedAt,
      ageWeight: partyAgeWeight(mine, raw.trip.ageWeights, raw.trip.honoreeExcluded),
      spotTravelers: partySpotTravelers(mine),
    };
  });
}

export function billInput(raw: RawTrip) {
  return {
    members: mathMembers(raw),
    costs: raw.costs,
    spots: raw.spots,
    claims: raw.claims,
    payments: plainPayments(raw),
    booked: raw.trip.status === "booked",
    splitMode: raw.trip.splitMode,
  };
}

function plainPayments(raw: RawTrip): MathPayment[] {
  return raw.payments.map(({ milestoneId, userId, amountCents, status }) => ({
    milestoneId,
    userId,
    amountCents,
    status,
  }));
}

export async function persistMath(tripId: string, rawIn?: RawTrip | null): Promise<RawTrip | null> {
  let raw = rawIn ?? await readRaw(tripId);
  if (!raw) return null;
  const db = getDb();
  const now = tripNow(raw);
  const outcome = reconcileTrip({
    status: raw.trip.status,
    buyInDeadline: raw.trip.buyInDeadline,
    minimumCommitters: raw.trip.minHeadcount,
    now,
    members: mathMembers(raw),
  });

  let dirty = false;
  if (outcome.deadlineRan || outcome.status !== raw.trip.status) {
    dirty = true;
    await db.update(trips).set({ status: outcome.status }).where(eq(trips.id, tripId));
    if (outcome.status === "booking_ready" && raw.trip.status !== "booking_ready") await safeEvent(tripId, null, "booking_ready");
    for (const member of outcome.members) {
      const previous = raw.members.find((item) => item.userId === member.userId);
      if (!previous || previous.status === member.status) continue;
      await db.update(tripMembers)
        .set({
          status: member.status,
          committedAt:
            member.status === "committed" ? (previous.committedAt ?? now) : previous.committedAt,
        })
        .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, member.userId)))
        ;
    }
  }

  if (await syncLinkedMembers(tripId, raw)) dirty = true;
  if (dirty) {
    const fresh = await readRaw(tripId);
    if (!fresh) return null;
    raw = fresh;
  }
  if (outcome.refundBuyIns || raw.trip.status === "under_minimum") {
    if (await refundBuyIns(raw)) dirty = true;
  }
  if (raw.trip.status === "cancelled") {
    if (await refundCollected(raw)) dirty = true;
  }
  if (raw.trip.status === "buy_in_open" || raw.trip.status === "booking_ready" || raw.trip.status === "booked") {
    if (await syncOpenPayments(raw, tripNow(raw))) dirty = true;
  } else if (await clearUncollected(raw)) {
    dirty = true;
  }
  if (dirty) return await readRaw(tripId);
  return raw;
}

/** Account-holders on a party follow their payer's commitment state. */
async function syncLinkedMembers(tripId: string, raw: RawTrip): Promise<boolean> {
  const db = getDb();
  let dirty = false;
  for (const linked of raw.members.filter((member) => !isPayerMember(member))) {
    const payer = raw.members.find((member) => member.userId === linked.partyUserId);
    if (!payer || payer.status === linked.status) continue;
    dirty = true;
    await db.update(tripMembers)
      .set({ status: payer.status })
      .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, linked.userId)));
  }
  return dirty;
}

async function refundBuyIns(raw: RawTrip): Promise<boolean> {
  const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
  if (!buyIn) return false;
  const db = getDb();
  let dirty = false;
  for (const payment of raw.payments) {
    if (payment.milestoneId === buyIn.id && payment.status === "paid") {
      dirty = true;
      await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
    }
  }
  return dirty;
}

async function refundCollected(raw: RawTrip): Promise<boolean> {
  const db = getDb();
  let dirty = false;
  for (const payment of raw.payments) {
    if (payment.status === "paid") {
      dirty = true;
      await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
    }
  }
  return dirty;
}

async function clearUncollected(raw: RawTrip): Promise<boolean> {
  const pending = raw.payments.filter((payment) => !lockedPayment.has(payment.status));
  if (pending.length === 0) return false;
  const db = getDb();
  for (const payment of pending) {
    await db.delete(payments).where(eq(payments.id, payment.id));
  }
  return true;
}

async function syncOpenPayments(raw: RawTrip, now: string): Promise<boolean> {
  const db = getDb();
  const members = mathMembers(raw);
  const payList = plainPayments(raw);
  const shares = settledBills(billInput(raw));
  const shareOf = new Map(shares.map((bill) => [bill.userId, bill]));
  const keep = new Set<string>();
  const desired: { milestoneId: string; userId: string; amountCents: number; status: PaymentStatus }[] = [];

  for (const member of members) {
    if (isCommittedPayer(member) && (raw.trip.status === "booking_ready" || raw.trip.status === "booked")) {
      const bill = shareOf.get(member.userId);
      const lines = milestoneSchedule({
        totalCents: bill?.totalCents ?? 0,
        lodgingCents: bill?.lodgingCents ?? 0,
        milestones: raw.milestones,
        payments: payList,
        userId: member.userId,
        buyInAmountCents: raw.trip.buyInAmount,
        now,
      });
      for (const line of lines) {
        const key = `${line.milestoneId}:${member.userId}`;
        if (line.locked) {
          keep.add(key);
          continue;
        }
        if (line.amountCents <= 0) continue;
        desired.push({
          milestoneId: line.milestoneId,
          userId: member.userId,
          amountCents: line.amountCents,
          status: line.status === "late" ? "late" : "due",
        });
        keep.add(key);
      }
    } else if (raw.trip.status === "buy_in_open" && isPotentialPayer(member) && member.status === "joined") {
      const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
      if (!buyIn || raw.trip.buyInAmount <= 0) continue;
      const existing = raw.payments.find(
        (payment) => payment.milestoneId === buyIn.id && payment.userId === member.userId,
      );
      const key = `${buyIn.id}:${member.userId}`;
      if (existing && lockedPayment.has(existing.status)) {
        keep.add(key);
      } else {
        desired.push({
          milestoneId: buyIn.id,
          userId: member.userId,
          amountCents: raw.trip.buyInAmount,
          status: "due",
        });
        keep.add(key);
      }
    } else if (raw.trip.status === "buy_in_open" && isCommittedPayer(member)) {
      const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
      if (buyIn) keep.add(`${buyIn.id}:${member.userId}`);
    }
  }

  for (const payment of raw.payments) {
    if (lockedPayment.has(payment.status)) keep.add(`${payment.milestoneId}:${payment.userId}`);
  }

  let dirty = false;
  for (const row of desired) {
    const existing = raw.payments.find(
      (payment) => payment.milestoneId === row.milestoneId && payment.userId === row.userId,
    );
    if (!existing) dirty = true;
    else if (!lockedPayment.has(existing.status) && (existing.amountCents !== row.amountCents || existing.status !== row.status)) {
      dirty = true;
    }
  }
  for (const payment of raw.payments) {
    const key = `${payment.milestoneId}:${payment.userId}`;
    if (!keep.has(key) && !lockedPayment.has(payment.status)) dirty = true;
  }
  if (!dirty) return false;

  for (const row of desired) {
    const existing = raw.payments.find(
      (payment) => payment.milestoneId === row.milestoneId && payment.userId === row.userId,
    );
    if (!existing) {
      await db.insert(payments)
        .values({
          id: crypto.randomUUID(),
          milestoneId: row.milestoneId,
          userId: row.userId,
          amount: row.amountCents,
          status: row.status,
          paidAt: null,
        })
        // Two renders can reconcile the same trip at once; the second insert is a no-op.
        .onConflictDoNothing()
        ;
    } else if (!lockedPayment.has(existing.status)) {
      if (existing.amountCents !== row.amountCents || existing.status !== row.status) {
        await db.update(payments)
          .set({ amount: row.amountCents, status: row.status })
          .where(eq(payments.id, existing.id))
          ;
      }
    }
  }

  for (const payment of raw.payments) {
    const key = `${payment.milestoneId}:${payment.userId}`;
    if (!keep.has(key) && !lockedPayment.has(payment.status)) {
      await db.delete(payments).where(eq(payments.id, payment.id));
    }
  }
  return true;
}

export async function tripIdForToken(token: string) {
  const trip = (await getDb().select({ id: trips.id }).from(trips).where(eq(trips.inviteToken, token)))[0];
  return trip?.id ?? null;
}

export async function loadTrip(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return null;
  return await persistMath(tripId, raw);
}

/** Bump when a fixture changes shape. A stale demo trip is reset to the new seed. */
const SEED_MARK = "bachelor";

export async function ensureDemoSeed() {
  const db = getDb();
  const existing = (await db.select().from(trips).where(eq(trips.id, DEMO_TRIP_ID)))[0];
  if (!existing) await seedPreWedding();
  else if (existing.preWeddingStyle !== SEED_MARK) await resetDemoTrip();
  const lake = (await db.select({ id: trips.id }).from(trips).where(eq(trips.id, LAKE_TRIP_ID)))[0];
  if (!lake) await seedLake();
}

async function seedPreWedding() {
  const db = getDb();
  for (const user of demoUsers) await db.insert(users).values({ ...user }).onConflictDoNothing();
  await db.insert(trips).values({ ...demoTrip }).onConflictDoNothing();
  for (const member of demoMembers) await db.insert(tripMembers).values({ tripId: DEMO_TRIP_ID, ...member }).onConflictDoNothing();
  for (const poll of demoPolls) await db.insert(polls).values({ tripId: DEMO_TRIP_ID, ...poll }).onConflictDoNothing();
  for (const option of demoOptions) await db.insert(pollOptions).values({ ...option }).onConflictDoNothing();
  for (const vote of demoVotes) {
    await db.insert(votes).values({ pollOptionId: vote.optionId, userId: vote.userId }).onConflictDoNothing();
  }
  for (const cost of demoCosts) {
    const airport = demoAirports[cost.memberId ?? ""];
    await db.insert(costItems).values({
      tripId: DEMO_TRIP_ID,
      ...cost,
      homeAirport: airport?.airport || null,
      lowEstimate: airport && cost.splitType === "individual" ? airport.low : null,
      highEstimate: airport && cost.splitType === "individual" ? airport.high : null,
    }).onConflictDoNothing();
  }
  for (const userId of demoTeeParticipants) {
    await db.insert(costItemParticipants).values({ costItemId: "cost_tee", userId }).onConflictDoNothing();
  }
  for (const milestone of demoMilestones) await db.insert(milestones).values({ tripId: DEMO_TRIP_ID, ...milestone }).onConflictDoNothing();
  for (const payment of demoPayments) await db.insert(payments).values({ ...payment }).onConflictDoNothing();
  for (const spot of demoSpots) await db.insert(sleepSpots).values({ tripId: DEMO_TRIP_ID, ...spot }).onConflictDoNothing();
  for (const claim of demoClaims) await db.insert(spotClaims).values(claim).onConflictDoNothing();
  for (const budget of demoBudgets) {
    await db.insert(privateBudgets).values({
      tripId: DEMO_TRIP_ID,
      userId: budget.userId,
      maxAllIn: budget.maxAllIn,
      flexNote: budget.flexNote,
      mustHaves: budget.mustHaves,
      updatedAt: "2026-11-20T16:00:00.000Z",
    }).onConflictDoNothing();
  }
  for (const [userId, optionId, highCents] of demoQuotes) {
    await db.insert(flightQuotes).values({ userId, optionId, highCents }).onConflictDoNothing();
  }
}

async function seedLake() {
  const db = getDb();
  const tripId = LAKE_TRIP_ID;
  for (const user of lakeUsers) await db.insert(users).values({ ...user }).onConflictDoNothing();
  await db.insert(trips).values({ ...lakeTrip }).onConflictDoNothing();
  for (const member of lakeMembers) await db.insert(tripMembers).values({ tripId, ...member }).onConflictDoNothing();
  for (const party of lakeParties) await db.insert(parties).values({ tripId, ...party }).onConflictDoNothing();
  for (const traveler of lakeTravelers) {
    await db.insert(travelers).values({ tripId, ...traveler, isHonoree: 0, honoreeRole: null, coSleepSpotId: null }).onConflictDoNothing();
  }
  for (const poll of lakePolls) await db.insert(polls).values({ tripId, ...poll }).onConflictDoNothing();
  for (const option of lakeOptions) await db.insert(pollOptions).values({ ...option }).onConflictDoNothing();
  for (const vote of lakeVotes) await db.insert(votes).values({ pollOptionId: vote.optionId, userId: vote.userId }).onConflictDoNothing();
  for (const cost of lakeCosts) await db.insert(costItems).values({ tripId, ...cost }).onConflictDoNothing();
  for (const travelerId of lakeBoatRiders) {
    await db.insert(travelerOptIns).values({ costItemId: "lake_cost_boat", travelerId }).onConflictDoNothing();
  }
  for (const milestone of lakeMilestones) await db.insert(milestones).values({ tripId, ...milestone }).onConflictDoNothing();
  for (const payment of lakePayments) await db.insert(payments).values({ ...payment }).onConflictDoNothing();
  for (const spot of lakeSpots) await db.insert(sleepSpots).values({ tripId, ...spot }).onConflictDoNothing();
  for (const claim of lakeClaims) await db.insert(spotClaims).values(claim).onConflictDoNothing();
  for (const budget of lakeBudgets) {
    await db.insert(privateBudgets).values({ tripId, ...budget, updatedAt: "2026-11-15T18:00:00.000Z" }).onConflictDoNothing();
  }
}

/** Remove one trip and everything hanging off it. Users are kept. */
async function wipeTrip(tripId: string) {
  const db = getDb();
  const pollIds = (await db.select().from(polls).where(eq(polls.tripId, tripId))).map((poll) => poll.id);
  const optionIds = pollIds.length
    ? (await db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds))).map((option) => option.id)
    : [];
  const costIds = (await db.select().from(costItems).where(eq(costItems.tripId, tripId))).map((cost) => cost.id);
  const milestoneIds = (await db.select().from(milestones).where(eq(milestones.tripId, tripId))).map((item) => item.id);
  const spotIds = (await db.select().from(sleepSpots).where(eq(sleepSpots.tripId, tripId))).map((spot) => spot.id);
  if (optionIds.length) await db.delete(votes).where(inArray(votes.pollOptionId, optionIds));
  if (pollIds.length) await db.delete(pollOptions).where(inArray(pollOptions.pollId, pollIds));
  await db.delete(polls).where(eq(polls.tripId, tripId));
  if (costIds.length) {
    await db.delete(costItemParticipants).where(inArray(costItemParticipants.costItemId, costIds));
    await db.delete(travelerOptIns).where(inArray(travelerOptIns.costItemId, costIds));
  }
  await db.delete(costItems).where(eq(costItems.tripId, tripId));
  if (milestoneIds.length) await db.delete(payments).where(inArray(payments.milestoneId, milestoneIds));
  await db.delete(milestones).where(eq(milestones.tripId, tripId));
  if (spotIds.length) await db.delete(spotClaims).where(inArray(spotClaims.spotId, spotIds));
  await db.delete(spotRequests).where(eq(spotRequests.tripId, tripId));
  await db.delete(sleepSpots).where(eq(sleepSpots.tripId, tripId));
  try {
    await db.delete(sleepRooms).where(eq(sleepRooms.tripId, tripId));
  } catch {
    // Migration 0009 not run yet; there are no floors to clear.
  }
  await db.delete(privateBudgets).where(eq(privateBudgets.tripId, tripId));
  await db.delete(tripEvents).where(eq(tripEvents.tripId, tripId));
  await db.delete(funnelEvents).where(eq(funnelEvents.tripId, tripId));
  await db.delete(travelers).where(eq(travelers.tripId, tripId));
  await db.delete(parties).where(eq(parties.tripId, tripId));
  await db.delete(tripMembers).where(eq(tripMembers.tripId, tripId));
  await db.delete(splitModeAcks).where(eq(splitModeAcks.tripId, tripId));
  await db.delete(trips).where(eq(trips.id, tripId));
}

/** Restores both seeded fixtures. Trips people created are untouched. */
export async function resetDemoTrip() {
  const db = getDb();
  await wipeTrip(DEMO_TRIP_ID);
  await wipeTrip(LAKE_TRIP_ID);
  await db.delete(flightQuotes).where(inArray(flightQuotes.userId, demoUsers.map((user) => user.id)));
  await seedPreWedding();
  await seedLake();
  return { ok: true };
}

/** "adult" is a plain adults trip; wedding occasions stay "pre_wedding". */
export type TripType = "pre_wedding" | "adult" | "family";
export type PreWeddingStyle = "bachelor" | "bachelorette" | "joint";
export type HonoreeRole = "bride" | "groom" | "birthday" | "other";

function defaultPartyName(fullName: string, tripType: string): string {
  const words = fullName.trim().split(/\s+/);
  if (tripType === "family" && words.length > 1) return words[words.length - 1] ?? fullName;
  return words[0] ?? fullName;
}

export async function createTrip(input: {
  name: string;
  organizerName: string;
  organizerContact: string;
  tripType: TripType;
  preWeddingStyle: PreWeddingStyle | null;
  honorees: { name: string; contact: string; contactGiven?: boolean; role: HonoreeRole }[];
  dateWindow: string;
  /** A signed-in person starting another trip organizes it as themselves, so they keep every trip on this phone. */
  organizerUserId?: string;
}) {
  const db = getDb();
  const tripId = crypto.randomUUID();
  const organizerId = input.organizerUserId ?? crypto.randomUUID();
  const now = Date.now();
  const honorees = input.honorees.map((honoree) => ({ ...honoree, id: crypto.randomUUID() }));
  if (!input.organizerUserId) await db.insert(users).values({ id: organizerId, name: input.organizerName, contact: input.organizerContact });
  for (const honoree of honorees) {
    // A made-up contact is marked claimed, so nobody can sign in as the honoree with it.
    await db.insert(users).values({ id: honoree.id, name: honoree.name, contact: honoree.contact, claimed: honoree.contactGiven === false ? 1 : 0 });
  }
  await db.insert(trips).values({
    id: tripId,
    name: input.name,
    tripType: input.tripType,
    // A family trip can carry a wedding style too (Family · Joint); a plain adult trip never does.
    preWeddingStyle: input.tripType === "pre_wedding" ? (input.preWeddingStyle ?? "joint") : input.tripType === "family" ? input.preWeddingStyle : null,
    organizerId,
    guestOfHonorUserId: honorees[0]?.id ?? "",
    dateWindow: input.dateWindow,
    status: "voting",
    buyInAmount: 0,
    buyInDeadline: null,
    minHeadcount: input.tripType === "family" ? 3 : 5,
    maxHeadcount: input.tripType === "family" ? 12 : 10,
    bedChangePolicy: "member_requests",
    // Default on when at least one honoree is named; ignored when there are none.
    honoreeExcludedFromSplit: honorees.length > 0 ? 1 : 0,
    inviteToken: crypto.randomBytes(9).toString("base64url"),
    simulatedNow: null,
  });
  await db.insert(tripMembers).values({ tripId, userId: organizerId, role: "organizer", status: "joined", committedAt: null, partyUserId: null });
  await db.insert(parties).values({ tripId, payerUserId: organizerId, name: defaultPartyName(input.organizerName, input.tripType) });
  for (const honoree of honorees) {
    // An honoree-only party: in the trip, buy-in waived, never dropped.
    await db.insert(tripMembers).values({
      tripId,
      userId: honoree.id,
      role: "honoree",
      status: "committed",
      committedAt: new Date().toISOString(),
      partyUserId: null,
    });
    await db.insert(parties).values({ tripId, payerUserId: honoree.id, name: defaultPartyName(honoree.name, input.tripType) });
    await db.insert(travelers).values({
      id: crypto.randomUUID(),
      tripId,
      partyUserId: honoree.id,
      name: honoree.name,
      ageBand: "adult",
      userId: honoree.id,
      isHonoree: 1,
      honoreeRole: honoree.role,
    });
  }
  const kinds = ["destination", "dates", "activity"] as const;
  for (let index = 0; index < kinds.length; index += 1) {
    const kind = kinds[index];
    await db.insert(polls).values({
      id: crypto.randomUUID(),
      tripId,
      kind,
      deadline: new Date(now + (10 + index * 2) * 86_400_000).toISOString(),
      lockedOptionId: null,
    });
  }
  await funnel(tripId, organizerId, "trip_created");
  return { tripId, organizerId };
}

export async function joinTrip(input: {
  token: string;
  name: string;
  contact: string;
  /** Who this browser is already signed in as, if anyone. */
  viewerId?: string | null;
}) {
  const db = getDb();
  const found = (await db.select().from(trips).where(eq(trips.inviteToken, input.token)))[0];
  if (!found) return { ok: false, error: "That invite link doesn't go anywhere." };
  await persistMath(found.id);
  const raw = await readRaw(found.id);
  if (!raw) return { ok: false, error: "That invite link doesn't go anywhere." };

  const contact = contactKey(input.contact);
  const existing = raw.members.find((member) => contactKey(member.contact) === contact);
  if (existing) {
    // Typing a phone or email proves nothing. It signs you in as that person only
    // if this browser already is them, or nobody has ever signed in as them (an
    // honoree the organizer added, or someone from before sessions existed).
    const owner = (await db.select({ claimed: users.claimed }).from(users).where(eq(users.id, existing.userId)))[0];
    if (existing.userId !== input.viewerId && owner?.claimed === 1) {
      return { ok: false, error: CONTACT_TAKEN };
    }
    if (existing.status === "off_trip") {
      if (raw.trip.status !== "buy_in_open" && raw.trip.status !== "voting" && raw.trip.status !== "planning") {
        return { ok: false, error: "The deadline has passed. You can't rejoin this trip." };
      }
      await db.update(tripMembers)
        .set({ status: "joined", committedAt: null })
        .where(and(eq(tripMembers.tripId, raw.trip.id), eq(tripMembers.userId, existing.userId)))
        ;
    }
    await db.update(users).set({ name: input.name }).where(eq(users.id, existing.userId));
    return { ok: true, tripId: raw.trip.id, userId: existing.userId, isNew: false };
  }

  const blocked = newMemberBlocked(raw);
  if (blocked) return { ok: false, error: blocked };

  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, name: input.name, contact: input.contact.trim() });
  await db.insert(tripMembers)
    .values({ tripId: raw.trip.id, userId, role: "member", status: "joined", committedAt: null, partyUserId: null })
    ;
  // A solo joiner is a party of one adult. They can add people on the party screen.
  await db.insert(parties).values({ tripId: raw.trip.id, payerUserId: userId, name: defaultPartyName(input.name, raw.trip.tripType) });
  await funnel(raw.trip.id, userId, "member_joined");
  // The Metrics page reads the first "joined" event.
  await safeEvent(raw.trip.id, userId, "joined");
  return { ok: true, tripId: raw.trip.id, userId, isNew: true };
}

/** Why nobody new can join this trip right now, or null when they can. */
function newMemberBlocked(raw: RawTrip): string | null {
  if (raw.trip.status === "cancelled") return "This trip was cancelled.";
  if (raw.trip.status === "booked" || raw.trip.status === "under_minimum") {
    return "The buy-in deadline has passed. Nobody can join after that.";
  }
  const onTrip = raw.travelers.filter((traveler) => {
    const payer = memberOf(raw, traveler.partyId);
    return payer && payer.status !== "off_trip" && payer.status !== "declined";
  }).length;
  if (onTrip >= raw.trip.maxHeadcount) {
    return `This trip is full at ${raw.trip.maxHeadcount} travelers. Ask the organizer to raise the cap.`;
  }
  return null;
}

const CONTACT_TAKEN =
  "Someone on this trip already joined with that phone or email. If it's you, open the trip on the phone you joined with, go to Your party, and tap “Sign in on another phone.”";

/**
 * Join a trip as the person this phone is already signed in as, so one sign-in holds
 * every trip they're on. Same rules as joinTrip: a contact already used on the trip by
 * someone else is refused, and nobody joins a cancelled, booked or full trip. Demo
 * trips are joined only through the form, which makes a throwaway demo sign-in.
 */
export async function joinTripAsUser(input: { token: string; userId: string }) {
  const db = getDb();
  const found = (await db.select().from(trips).where(eq(trips.inviteToken, input.token)))[0];
  if (!found || isDemoTrip(found.id)) return { ok: false, error: "That invite link doesn't go anywhere." };
  await persistMath(found.id);
  const raw = await readRaw(found.id);
  if (!raw) return { ok: false, error: "That invite link doesn't go anywhere." };
  const person = (await db.select({ name: users.name, contact: users.contact }).from(users).where(eq(users.id, input.userId)))[0];
  if (!person) return { ok: false, error: "Sign in again, then open the invite." };

  const existing = memberOf(raw, input.userId);
  if (existing) {
    if (existing.status === "off_trip") {
      if (raw.trip.status !== "buy_in_open" && raw.trip.status !== "voting" && raw.trip.status !== "planning") {
        return { ok: false, error: "The deadline has passed. You can't rejoin this trip." };
      }
      await db.update(tripMembers)
        .set({ status: "joined", committedAt: null })
        .where(and(eq(tripMembers.tripId, raw.trip.id), eq(tripMembers.userId, input.userId)));
    }
    return { ok: true, tripId: raw.trip.id, userId: input.userId, isNew: false };
  }
  const key = contactKey(person.contact);
  if (raw.members.some((member) => contactKey(member.contact) === key)) return { ok: false, error: CONTACT_TAKEN };
  const blocked = newMemberBlocked(raw);
  if (blocked) return { ok: false, error: blocked };

  await db.insert(tripMembers)
    .values({ tripId: raw.trip.id, userId: input.userId, role: "member", status: "joined", committedAt: null, partyUserId: null });
  await db.insert(parties).values({ tripId: raw.trip.id, payerUserId: input.userId, name: defaultPartyName(person.name, raw.trip.tripType) });
  await funnel(raw.trip.id, input.userId, "member_joined");
  await safeEvent(raw.trip.id, input.userId, "joined");
  return { ok: true, tripId: raw.trip.id, userId: input.userId, isNew: true };
}

/** Name and contact of one person, for "Join as …" and "Organizing as …". */
export async function personBasics(userId: string): Promise<{ name: string; contact: string } | null> {
  const row = (await getDb().select({ name: users.name, contact: users.contact }).from(users).where(eq(users.id, userId)))[0];
  return row ?? null;
}

function memberOf(raw: RawTrip, userId: string): MemberRecord | undefined {
  return raw.members.find((member) => member.userId === userId);
}

async function requireOrganizer(tripId: string, userId: string) {
  await persistMath(tripId);
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const member = memberOf(raw, userId);
  if (!member || member.role !== "organizer") return { ok: false, error: "Only the organizer can do that." };
  return raw;
}

export async function toggleVote(tripId: string, userId: string, optionId: string) {
  await persistMath(tripId);
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const member = memberOf(raw, userId);
  if (!member || member.status === "off_trip" || member.status === "invited") {
    return { ok: false, error: "You're not voting on this trip." };
  }
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  const option = raw.options.find((item) => item.id === optionId);
  const poll = raw.polls.find((item) => item.id === option?.pollId);
  if (!option || !poll) return { ok: false, error: "That option is gone." };
  if (poll.lockedOptionId) return { ok: false, error: "The organizer already locked this poll." };
  if (new Date(tripNow(raw)).getTime() >= new Date(poll.deadline).getTime()) {
    return { ok: false, error: "Voting on this poll is closed." };
  }
  const db = getDb();
  const existing = raw.votes.some((vote) => vote.pollOptionId === optionId && vote.userId === userId);
  if (existing) {
    await db.delete(votes).where(and(eq(votes.pollOptionId, optionId), eq(votes.userId, userId)));
  } else {
    await db.insert(votes).values({ pollOptionId: optionId, userId });
    await funnel(tripId, userId, "voted");
  }
  return { ok: true };
}

export async function addPollOption(input: {
  tripId: string;
  userId: string;
  pollId: string;
  label: string;
  estCost: number;
  link: string;
}) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  const poll = raw.polls.find((item) => item.id === input.pollId);
  if (!poll) return { ok: false, error: "That poll is gone." };
  if (poll.lockedOptionId) return { ok: false, error: "Clear the lock before adding options." };
  const sortOrder = raw.options.filter((option) => option.pollId === poll.id).length;
  await getDb().insert(pollOptions).values({
    id: crypto.randomUUID(),
    pollId: poll.id,
    label: input.label,
    estCost: input.estCost,
    link: input.link,
    sortOrder,
  });
  return { ok: true };
}

export async function lockPollOption(tripId: string, userId: string, optionId: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  const option = raw.options.find((item) => item.id === optionId);
  if (!option) return { ok: false, error: "That option is gone." };
  await getDb().update(polls).set({ lockedOptionId: optionId }).where(eq(polls.id, option.pollId));
  return { ok: true };
}

export async function clearPollLock(tripId: string, userId: string, pollId: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (!raw.polls.some((poll) => poll.id === pollId)) return { ok: false, error: "That poll isn't on this trip." };
  await getDb().update(polls).set({ lockedOptionId: null }).where(eq(polls.id, pollId));
  return { ok: true };
}

export async function setPollDeadline(tripId: string, userId: string, pollId: string, deadlineIso: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (!raw.polls.some((poll) => poll.id === pollId)) return { ok: false, error: "That poll isn't on this trip." };
  if (Number.isNaN(new Date(deadlineIso).getTime())) return { ok: false, error: "Pick a real date and time." };
  await getDb().update(polls).set({ deadline: deadlineIso }).where(eq(polls.id, pollId));
  return { ok: true };
}

export async function addCost(input: {
  tripId: string;
  userId: string;
  label: string;
  category: string;
  splitType: SplitType;
  amountCents: number;
  memberId: string | null;
  agePrices?: AgePrices | null;
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const actor = memberOf(raw, input.userId);
  if (!actor || actor.status === "off_trip") return { ok: false, error: "You can't edit costs." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  if (input.splitType !== "individual" && actor.role !== "organizer") {
    return { ok: false, error: "Only the organizer adds shared or optional costs." };
  }
  let memberId: string | null = null;
  if (input.splitType === "individual") {
    const chosen = actor.role === "organizer" ? input.memberId : actor.userId;
    // An individual item belongs to a party, so it lands on the party's payer.
    memberId = chosen ? (memberOf(raw, chosen)?.partyUserId ?? null) : null;
    if (!memberId) return { ok: false, error: "Pick who pays this." };
  }
  const prices = input.splitType !== "individual" && hasAgePrices(input.agePrices) ? input.agePrices : null;
  await getDb().insert(costItems).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    label: input.label,
    category: input.category,
    splitType: input.splitType,
    amount: input.amountCents,
    memberId,
    isLodging: input.category === "lodging" && input.splitType === "shared" ? 1 : 0,
    agePriceAdult: prices?.adult ?? null,
    agePriceTeen: prices?.teen ?? null,
    agePriceChild: prices?.child ?? null,
    agePriceInfant: prices?.infant ?? null,
  });
  await persistMath(input.tripId);
  return { ok: true };
}

export async function deleteCost(tripId: string, userId: string, costId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const actor = memberOf(raw, userId);
  const cost = raw.costs.find((item) => item.id === costId);
  if (!actor || !cost) return { ok: false, error: "That cost is gone." };
  const owns = cost.splitType === "individual" && cost.memberId === actor.userId;
  if (actor.role !== "organizer" && !owns) return { ok: false, error: "Only the organizer can remove that." };
  const db = getDb();
  await db.delete(costItemParticipants).where(eq(costItemParticipants.costItemId, costId));
  await db.delete(costItems).where(eq(costItems.id, costId));
  await persistMath(tripId);
  return { ok: true };
}

export async function toggleOptional(tripId: string, userId: string, costId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const member = memberOf(raw, userId);
  const self = raw.travelers.find((traveler) => traveler.userId === userId) ?? raw.travelers.find((traveler) => traveler.partyId === member?.partyUserId);
  if (!self) return { ok: false, error: "You're not paying on this trip." };
  return await toggleTravelerOptIn(tripId, userId, costId, self.id);
}

/** The payer (or the organizer) opts one traveler in or out of an optional item. */
export async function toggleTravelerOptIn(tripId: string, actorId: string, costId: string, travelerId: string) {
  await persistMath(tripId);
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status !== "buy_in_open") {
    return { ok: false, error: "You can opt in or out only while buy-in is open." };
  }
  const actor = memberOf(raw, actorId);
  const traveler = raw.travelers.find((item) => item.id === travelerId);
  if (!actor || !traveler) return { ok: false, error: "That person isn't on this trip." };
  const payer = memberOf(raw, traveler.partyId);
  if (!payer || !isPotentialPayer(payer)) return { ok: false, error: "That party isn't paying on this trip." };
  if (actor.role !== "organizer" && actor.partyUserId !== traveler.partyId) {
    return { ok: false, error: "Only that party's payer can change their opt-ins." };
  }
  const cost = raw.costs.find((item) => item.id === costId);
  if (!cost || cost.splitType !== "optional") return { ok: false, error: "That isn't an optional cost." };
  await materializeParty(raw, traveler.partyId);
  const db = getDb();
  if (cost.optInTravelerIds.includes(travelerId)) {
    await db.delete(travelerOptIns)
      .where(and(eq(travelerOptIns.costItemId, costId), eq(travelerOptIns.travelerId, travelerId)));
    if (traveler.userId) {
      await db.delete(costItemParticipants)
        .where(and(eq(costItemParticipants.costItemId, costId), eq(costItemParticipants.userId, traveler.userId)));
    }
  } else {
    await db.insert(travelerOptIns).values({ costItemId: costId, travelerId }).onConflictDoNothing();
  }
  await persistMath(tripId);
  return { ok: true };
}

export async function saveBuyIn(input: {
  tripId: string;
  userId: string;
  amountCents: number;
  minHeadcount: number;
  deadlineIso: string;
}) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  if (raw.trip.status === "cancelled" || raw.trip.status === "booked" || raw.trip.status === "under_minimum") {
    return { ok: false, error: "Buy-in is no longer open." };
  }
  if (buyInTermsLocked(raw)) {
    return { ok: false, error: "The buy-in amount and deadline lock after the first person commits." };
  }
  if (input.amountCents <= 0) return { ok: false, error: "Set a buy-in greater than zero." };
  if (input.minHeadcount < 1) return { ok: false, error: "The trip needs at least one paying party to book." };
  const db = getDb();
  await db.update(trips)
    .set({
      status: "buy_in_open",
      buyInAmount: input.amountCents,
      minHeadcount: input.minHeadcount,
      buyInDeadline: input.deadlineIso,
    })
    .where(eq(trips.id, input.tripId))
    ;
  const fresh = await readRaw(input.tripId);
  const buyIn = fresh?.milestones.find((milestone) => milestone.kind === "buy_in");
  const secondDue = new Date(new Date(input.deadlineIso).getTime() + 35 * 86_400_000).toISOString();
  const finalDue = new Date(new Date(input.deadlineIso).getTime() + 75 * 86_400_000).toISOString();
  if (!buyIn) {
    await db.insert(milestones)
      .values([
        {
          id: crypto.randomUUID(),
          tripId: input.tripId,
          name: "Buy-in",
          dueDate: input.deadlineIso,
          kind: "buy_in",
          amountRule: "fixed",
          amount: input.amountCents,
          sortOrder: 0,
        },
        {
          id: crypto.randomUUID(),
          tripId: input.tripId,
          name: "Second payment",
          dueDate: secondDue,
          kind: "installment",
          amountRule: "pct_of_share",
          amount: 40,
          sortOrder: 1,
        },
        {
          id: crypto.randomUUID(),
          tripId: input.tripId,
          name: "Final payment",
          dueDate: finalDue,
          kind: "final",
          amountRule: "pct_of_share",
          amount: 0,
          sortOrder: 2,
        },
      ])
      ;
  } else {
    await db.update(milestones)
      .set({ dueDate: input.deadlineIso, amount: input.amountCents, amountRule: "fixed" })
      .where(eq(milestones.id, buyIn.id))
      ;
  }
  await persistMath(input.tripId);
  return { ok: true };
}

export async function payMilestone(tripId: string, userId: string, milestoneId: string) {
  await persistMath(tripId);
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  if (raw.trip.status === "under_minimum") {
    return { ok: false, error: "The crew missed the minimum. Buy-ins are being refunded, not collected." };
  }
  const member = memberOf(raw, userId);
  if (!member || member.status === "off_trip" || member.status === "invited") {
    return { ok: false, error: "You're not paying on this trip." };
  }
  if (isHonoree(member)) return { ok: false, error: "The guest of honor doesn't pay a buy-in. The group covers that share." };
  if (!isPayerMember(member)) {
    const payer = memberOf(raw, member.partyUserId);
    return { ok: false, error: `${payer?.name ?? "Your party's payer"} pays for your party.` };
  }
  const milestone = raw.milestones.find((item) => item.id === milestoneId);
  if (!milestone) return { ok: false, error: "That payment doesn't exist." };
  if (milestone.kind !== "buy_in" && raw.trip.status !== "booking_ready" && !isBooked(raw.trip.status)) {
    return { ok: false, error: "Later payments open once enough people have committed." };
  }
  if (milestone.kind === "buy_in" && raw.trip.status !== "buy_in_open" && raw.trip.status !== "booking_ready") {
    return { ok: false, error: "Buy-in is closed." };
  }
  if (
    milestone.kind === "buy_in" &&
    RULES.blockBuyInWhenNoUnclaimedSpot &&
    !raw.claims.some((claim) => claim.userId === userId && claim.status === "approved") &&
    !roomForParty(raw, userId)
  ) {
    return { ok: false, error: "There isn't room for everyone in your party. The organizer has to add a spot or approve a share first." };
  }
  const existing = raw.payments.find((payment) => payment.milestoneId === milestoneId && payment.userId === userId);
  if (existing?.status === "paid") return { ok: true };
  if (existing?.status === "forfeited") return { ok: false, error: "That payment was forfeited." };
  if (existing?.status === "refunded") return { ok: false, error: "That payment was refunded." };

  let amount = Math.min(raw.trip.buyInAmount, Number.MAX_SAFE_INTEGER);
  if (milestone.kind === "buy_in") {
    if (raw.trip.buyInAmount <= 0) return { ok: false, error: "The organizer hasn't set a buy-in yet." };
    amount = raw.trip.buyInAmount;
  } else {
    const bill = settledBills(billInput(raw)).find((item) => item.userId === userId);
    const line = milestoneSchedule({
      totalCents: bill?.totalCents ?? 0,
      lodgingCents: bill?.lodgingCents ?? 0,
      milestones: raw.milestones,
      payments: plainPayments(raw),
      userId,
      buyInAmountCents: raw.trip.buyInAmount,
      now: tripNow(raw),
    }).find((item) => item.milestoneId === milestoneId);
    if (!line || line.amountCents <= 0) return { ok: false, error: "Nothing is due on that payment." };
    amount = line.amountCents;
  }

  const now = tripNow(raw);
  const db = getDb();
  if (existing) {
    await db.update(payments).set({ status: "paid", amount, paidAt: now }).where(eq(payments.id, existing.id));
  } else {
    await db.insert(payments).values({
      id: crypto.randomUUID(),
      milestoneId,
      userId,
      amount,
      status: "paid",
      paidAt: now,
    });
  }
  if (milestone.kind === "buy_in" && member.status !== "committed") {
    await db.update(tripMembers)
      .set({ status: "committed", committedAt: now })
      .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)))
      ;
  }
  if (milestone.kind === "buy_in") await funnel(tripId, userId, "committed");
  await persistMath(tripId);
  return { ok: true };
}

export async function removeLateMember(tripId: string, actorId: string, userId: string) {
  const raw = await requireOrganizer(tripId, actorId);
  if ("ok" in raw) return raw;
  const member = memberOf(raw, userId);
  if (!member) return { ok: false, error: "That person isn't on this trip." };
  if (member.role === "organizer") return { ok: false, error: "The organizer stays on the trip." };
  if (isHonoree(member)) return { ok: false, error: "The guest of honor is never dropped." };
  if (!isPayerMember(member)) return { ok: false, error: "Drop the party through its payer." };
  if (member.status !== "committed") return { ok: false, error: "They're not a committed payer." };
  const now = tripNow(raw);
  const bill = settledBills(billInput(raw)).find((item) => item.userId === userId);
  const booked = isBooked(raw.trip.status);
  const late = milestoneSchedule({
    totalCents: bill?.totalCents ?? 0,
    lodgingCents: bill?.lodgingCents ?? 0,
    milestones: raw.milestones,
    payments: plainPayments(raw),
    userId,
    buyInAmountCents: raw.trip.buyInAmount,
    now,
  }).some((line) => line.status === "late");
  if (booked && !late) {
    return { ok: false, error: "After the stay is booked, only a late payer can be dropped, and their buy-in is forfeited." };
  }

  const db = getDb();
  for (const payment of raw.payments.filter((item) => item.userId === userId)) {
    if (payment.status === "paid") {
      await db.update(payments).set({ status: booked ? "forfeited" : "refunded" }).where(eq(payments.id, payment.id));
    } else if (payment.status === "due" || payment.status === "late") {
      await db.delete(payments).where(eq(payments.id, payment.id));
    }
  }
  await db.update(tripMembers)
    .set({ status: "off_trip" })
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId)));
  const held = raw.spots.map((spot) => spot.id);
  if (held.length) {
    await db.delete(spotClaims).where(and(inArray(spotClaims.spotId, held), eq(spotClaims.userId, userId)));
  }
  await db.update(travelers).set({ coSleepSpotId: null }).where(and(eq(travelers.tripId, tripId), eq(travelers.partyUserId, userId)));
  await persistMath(tripId);
  return { ok: true };
}

export async function extendDeadline(tripId: string, userId: string, deadlineIso: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (raw.trip.status !== "under_minimum") {
    return { ok: false, error: "Extend the deadline only when the crew has missed the minimum." };
  }
  if (new Date(deadlineIso).getTime() <= new Date(tripNow(raw)).getTime()) {
    return { ok: false, error: "Pick a deadline after the demo clock. Dropped people still can't rejoin." };
  }
  const db = getDb();
  await db.update(trips)
    .set({ status: "buy_in_open", buyInDeadline: deadlineIso })
    .where(eq(trips.id, tripId))
    ;
  const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
  if (buyIn) {
    await db.update(milestones).set({ dueDate: deadlineIso }).where(eq(milestones.id, buyIn.id));
    for (const payment of raw.payments) {
      if (payment.milestoneId === buyIn.id && payment.status === "refunded") {
        await db.update(payments).set({ status: "paid" }).where(eq(payments.id, payment.id));
      }
    }
  }
  return { ok: true };
}

export async function cancelTrip(tripId: string, userId: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  await getDb().update(trips).set({ status: "cancelled" }).where(eq(trips.id, tripId));
  await persistMath(tripId);
  return { ok: true };
}

export async function setClock(tripId: string, iso: string | null) {
  if (!(await readRaw(tripId))) return { ok: false, error: "Trip not found." };
  await getDb().update(trips).set({ simulatedNow: iso }).where(eq(trips.id, tripId));
  await persistMath(tripId);
  return { ok: true };
}

/** Free space for a party that has no claim yet: a share slot fits one, a room fits a family. */
function roomForParty(raw: RawTrip, partyUserId: string): boolean {
  const need = Math.max(1, partySpotTravelers(travelersOf(raw, partyUserId)));
  if (need <= 1 && unclaimedSpots(raw.spots.filter((spot) => !spot.reservedForUserId || spot.reservedForUserId === partyUserId), raw.claims) > 0) {
    return true;
  }
  const free = raw.spots
    .filter((spot) => !spot.reservedForHonoree && (!spot.reservedForUserId || spot.reservedForUserId === partyUserId))
    .filter((spot) => !raw.claims.some((claim) => claim.spotId === spot.id && claim.status === "approved"))
    .reduce((sum, spot) => sum + partySleeps(spot), 0);
  return free >= need;
}

/** S14: parties pick in buy-in order, so only a committed party picks. */
function partyCommitted(raw: RawTrip, partyUserId: string): boolean {
  return memberOf(raw, partyUserId)?.status === "committed";
}

function spotHeldForOther(spot: SpotRecord, partyUserId: string): boolean {
  return !!spot.reservedForUserId && spot.reservedForUserId !== partyUserId;
}

export async function claimSpot(tripId: string, userId: string, spotId: string, acceptShareDisclosure = false) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  const actor = memberOf(raw, userId);
  const spot = raw.spots.find((item) => item.id === spotId);
  if (!actor || !spot) return { ok: false, error: "That bed isn't on this trip." };
  const party = actor.partyUserId;
  if (spot.reservedForHonoree) return { ok: false, error: "That room is reserved for the guest of honor." };
  const isOrganizer = actor.role === "organizer";
  if (!isOrganizer && !partyCommitted(raw, party)) {
    return { ok: false, error: "Commit first. Parties pick rooms in the order they bought in." };
  }
  if (spotHeldForOther(spot, party) && !isOrganizer) return { ok: false, error: "That room is reserved." };
  const approvedHere = raw.claims.filter((claim) => claim.spotId === spotId && claim.status === "approved");
  const openShare = spot.sharingEnabled && approvedHere.length > 0 && approvedHere.length < (spot.capacity || 2) && !approvedHere.some((claim) => claim.userId === party);
  const empty = approvedHere.length === 0;
  if (!isOrganizer && (raw.trip.bedChangePolicy === "locked" || raw.trip.status === "booked")) {
    return await requestSpot({
      tripId,
      userId,
      toSpotId: spotId,
      type: openShare || approvedHere.length > 0 ? "share" : "switch",
    });
  }
  if (!isOrganizer && !empty && !openShare) {
    return await requestSpot({ tripId, userId, toSpotId: spotId, type: approvedHere.length ? "share" : "switch" });
  }
  if (empty && spot.sharingEnabled && !acceptShareDisclosure && !isOrganizer) {
    return { ok: false, error: "This bed may be shared with another party. Tick the box to accept that, or pick another bed." };
  }
  const db = getDb();
  if (!openShare) {
    // A solo pick replaces the party's other claims. A whole-room claim uses claimRoom.
    await db.delete(spotClaims).where(and(eq(spotClaims.userId, party), inArray(spotClaims.spotId, raw.spots.map((item) => item.id))));
    await db.update(travelers).set({ coSleepSpotId: null }).where(and(eq(travelers.tripId, tripId), eq(travelers.partyUserId, party)));
  }
  await db.insert(spotClaims).values({ spotId, userId: party, status: "approved" }).onConflictDoUpdate({
    target: [spotClaims.spotId, spotClaims.userId],
    set: { status: "approved" },
  });
  return { ok: true };
}

/** A party takes every spot in a room as a unit. No share approval inside a party. */
export async function claimRoom(tripId: string, userId: string, roomName: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  const actor = memberOf(raw, userId);
  if (!actor) return { ok: false, error: "Join the trip first." };
  const party = actor.partyUserId;
  const room = raw.spots.filter((spot) => (spot.roomName ?? spot.id) === roomName);
  if (room.length === 0) return { ok: false, error: "That room isn't on this trip." };
  const isOrganizer = actor.role === "organizer";
  if (!isOrganizer && !partyCommitted(raw, party)) {
    return { ok: false, error: "Commit first. Parties pick rooms in the order they bought in." };
  }
  if (room.some((spot) => spot.reservedForHonoree)) return { ok: false, error: "That room is reserved for the guest of honor." };
  if (!isOrganizer && room.some((spot) => spotHeldForOther(spot, party))) return { ok: false, error: "That room is reserved." };
  if (!isOrganizer && (raw.trip.bedChangePolicy === "locked" || raw.trip.status === "booked")) {
    return { ok: false, error: "Room moves go through the organizer right now. Ask them from the approvals queue." };
  }
  const takenByOthers = raw.claims.some(
    (claim) => claim.status === "approved" && claim.userId !== party && room.some((spot) => spot.id === claim.spotId),
  );
  if (takenByOthers) return { ok: false, error: "Someone else already has a bed in that room." };
  const db = getDb();
  await db.delete(spotClaims).where(and(eq(spotClaims.userId, party), inArray(spotClaims.spotId, raw.spots.map((item) => item.id))));
  await db.update(travelers).set({ coSleepSpotId: null }).where(and(eq(travelers.tripId, tripId), eq(travelers.partyUserId, party)));
  for (const spot of room) {
    await db.insert(spotClaims).values({ spotId: spot.id, userId: party, status: "approved" }).onConflictDoUpdate({
      target: [spotClaims.spotId, spotClaims.userId],
      set: { status: "approved" },
    });
  }
  return { ok: true };
}

/** Attach a traveler at $0 to a spot their own party already claims. */
export async function setCoSleep(tripId: string, actorId: string, travelerId: string, spotId: string | null) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const actor = memberOf(raw, actorId);
  const traveler = raw.travelers.find((item) => item.id === travelerId);
  if (!actor || !traveler) return { ok: false, error: "That person isn't on this trip." };
  if (actor.role !== "organizer" && actor.partyUserId !== traveler.partyId) return { ok: false, error: "Only your own party." };
  if (spotId) {
    const spot = raw.spots.find((item) => item.id === spotId);
    if (!spot) return { ok: false, error: "That bed isn't on this trip." };
    if (!raw.claims.some((claim) => claim.spotId === spotId && claim.userId === traveler.partyId && claim.status === "approved")) {
      return { ok: false, error: "Co-sleeping only works in a bed your party already has." };
    }
    if (!spot.coSleepAllowed) return { ok: false, error: "The organizer turned off co-sleeping in that bed." };
    const already = raw.travelers.filter((item) => item.coSleepSpotId === spotId && item.id !== travelerId).length;
    if (already >= spot.maxCoSleepers) return { ok: false, error: "That bed already has as many co-sleepers as the organizer allows." };
  }
  await materializeParty(raw, traveler.partyId);
  await getDb().update(travelers).set({ coSleepSpotId: spotId }).where(eq(travelers.id, travelerId));
  await persistMath(tripId);
  return { ok: true };
}

export async function requestSpot(input: {
  tripId: string;
  userId: string;
  toSpotId: string;
  type: "share" | "switch";
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const actor = memberOf(raw, input.userId);
  if (!actor) return { ok: false, error: "Join the trip first." };
  if (!raw.spots.some((spot) => spot.id === input.toSpotId)) return { ok: false, error: "That bed isn't on this trip." };
  if (actor.role !== "organizer" && raw.trip.bedChangePolicy === "locked" && raw.trip.status !== "booked") {
    return { ok: false, error: "Beds are locked. Only the organizer can move people." };
  }
  const party = actor.partyUserId;
  const mine = raw.claims.find((claim) => claim.userId === party && claim.status === "approved");
  const target = raw.claims.find((claim) => claim.spotId === input.toSpotId && claim.status === "approved" && claim.userId !== party);
  await getDb().insert(spotRequests).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    type: input.type,
    fromSpotId: mine?.spotId ?? null,
    toSpotId: input.toSpotId,
    requesterUserId: party,
    counterpartUserId: target?.userId ?? null,
    status: "pending",
    createdAt: tripNow(raw),
  });
  return { ok: true };
}

export async function listSpotRequests(tripId: string) {
  return getDb().select().from(spotRequests).where(eq(spotRequests.tripId, tripId));
}

export async function resolveSpotRequest(tripId: string, userId: string, requestId: string, approve: boolean) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  const request = (await getDb().select().from(spotRequests).where(eq(spotRequests.id, requestId)))[0];
  if (!request || request.tripId !== tripId) return { ok: false, error: "That request is gone." };
  if (!approve) {
    await getDb().update(spotRequests).set({ status: "denied" }).where(eq(spotRequests.id, requestId));
    return { ok: true };
  }
  const spot = raw.spots.find((item) => item.id === request.toSpotId);
  if (request.type === "share" && request.counterpartUserId && !spot?.sharingEnabled && request.counterpartOptedIn !== 1) {
    return { ok: false, error: "The other party hasn't opted in to sharing yet. Both parties have to say yes." };
  }
  const db = getDb();
  if (request.type === "switch" && request.fromSpotId) {
    await db.delete(spotClaims).where(and(eq(spotClaims.spotId, request.fromSpotId), eq(spotClaims.userId, request.requesterUserId)));
  }
  await db.insert(spotClaims).values({
    spotId: request.toSpotId,
    userId: request.requesterUserId,
    status: "approved",
  }).onConflictDoUpdate({
    target: [spotClaims.spotId, spotClaims.userId],
    set: { status: "approved" },
  });
  await db.update(spotRequests).set({ status: "approved" }).where(eq(spotRequests.id, requestId));
  return { ok: true };
}

/** The party already in the bed says yes to a share request. */
export async function optInToShare(tripId: string, userId: string, requestId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const actor = memberOf(raw, userId);
  const request = (await getDb().select().from(spotRequests).where(eq(spotRequests.id, requestId)))[0];
  if (!actor || !request || request.tripId !== tripId) return { ok: false, error: "That request is gone." };
  if (request.counterpartUserId !== actor.partyUserId) return { ok: false, error: "Only the party in that bed can opt in." };
  await getDb().update(spotRequests).set({ counterpartOptedIn: 1 }).where(eq(spotRequests.id, requestId));
  return { ok: true };
}

export async function setBedPolicy(tripId: string, userId: string, policy: "member_requests" | "locked") {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  await getDb().update(trips).set({ bedChangePolicy: policy }).where(eq(trips.id, tripId));
  return { ok: true };
}

export async function releaseSpot(tripId: string, userId: string, spotId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status === "booked") return { ok: false, error: "Spots are frozen once the stay is booked." };
  const actor = memberOf(raw, userId);
  const spot = raw.spots.find((item) => item.id === spotId);
  if (!actor || !spot || spot.reservedForHonoree) return { ok: false, error: "That bed can't be released." };
  const party = actor.partyUserId;
  if (!raw.claims.some((claim) => claim.spotId === spotId && claim.userId === party)) {
    return { ok: false, error: "You can only give up your own party's bed." };
  }
  await getDb().delete(spotClaims).where(and(eq(spotClaims.spotId, spotId), eq(spotClaims.userId, party)));
  await getDb().update(travelers).set({ coSleepSpotId: null }).where(and(eq(travelers.tripId, tripId), eq(travelers.coSleepSpotId, spotId)));
  return { ok: true };
}

export async function addSpot(input: {
  tripId: string;
  userId: string;
  roomName: string;
  bedType: string;
  privateBath: boolean;
  privateRoom: boolean;
  weight: number;
  reservedForHonoree: boolean;
  allowSharing: boolean;
  groundFloor: boolean;
  noStairs: boolean;
  accessibleBath: boolean;
  cribSpace: boolean;
}) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  const bed = input.bedType.toLowerCase().replace(/\s+/g, "_");
  const big = bed === "king" || bed === "queen";
  await getDb().insert(sleepSpots).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    roomName: input.roomName,
    bedType: bed,
    privateBath: input.privateBath ? 1 : 0,
    privateRoom: input.privateRoom ? 1 : 0,
    weight: Math.round(input.weight * 1000),
    capacity: big && input.allowSharing ? 2 : 1,
    sharingEnabled: big && input.allowSharing ? 1 : 0,
    sortOrder: 99,
    reservedForHonoree: input.reservedForHonoree ? 1 : 0,
    groundFloor: input.groundFloor ? 1 : 0,
    noStairs: input.noStairs ? 1 : 0,
    accessibleBath: input.accessibleBath ? 1 : 0,
    cribSpace: input.cribSpace ? 1 : 0,
  });
  return { ok: true };
}

/**
 * Organizer: add rooms read from a listing (or pasted text) after the confirm
 * screen. Rooms are added next to any existing ones; a name that's already
 * taken is refused rather than merged, so beds never land in the wrong room.
 */
export async function importRooms(input: { tripId: string; userId: string; rooms: ImportRoom[]; source: "link" | "paste" }) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  if (raw.trip.status === "booked" || raw.trip.status === "cancelled") return { ok: false, error: "Rooms can't change once the stay is booked." };
  const taken = new Set(raw.spots.map((spot) => (spot.roomName ?? "").toLowerCase()));
  const clash = input.rooms.find((room) => taken.has(room.room.toLowerCase()));
  if (clash) return { ok: false, error: `"${clash.room}" is already a room on this trip. Rename it or remove it from the import.` };

  const db = getDb();
  const start = raw.spots.reduce((max, spot) => Math.max(max, spot.sortOrder ?? 0), 0) + 1;
  let order = start;
  const rows: (typeof sleepSpots.$inferInsert)[] = [];
  for (const room of input.rooms) {
    const { spots, cribSpace, groundFloor } = importedRoomSpots(room);
    for (const spot of spots) {
      rows.push({
        id: crypto.randomUUID(),
        tripId: input.tripId,
        roomName: room.room,
        bedType: spot.bedType,
        privateBath: 0,
        privateRoom: spot.privateRoom ? 1 : 0,
        weight: Math.round(spot.weight * 1000),
        capacity: 1,
        sharingEnabled: 0,
        reservedForHonoree: 0,
        sortOrder: order++,
        groundFloor: groundFloor ? 1 : 0,
        noStairs: 0,
        accessibleBath: 0,
        cribSpace: cribSpace ? 1 : 0,
      });
    }
  }
  if (rows.length === 0) return { ok: false, error: "There are no beds to add. A crib alone doesn't make a room." };
  // D1 caps bound parameters per statement, so insert in small chunks, all in one batch (one transaction).
  const statements = [];
  for (let i = 0; i < rows.length; i += 5) statements.push(db.insert(sleepSpots).values(rows.slice(i, i + 5)));
  const floors = input.rooms.filter((room) => room.floor);
  for (const room of floors) {
    statements.push(
      db.insert(sleepRooms).values({ tripId: input.tripId, roomName: room.room, floor: room.floor })
        .onConflictDoUpdate({ target: [sleepRooms.tripId, sleepRooms.roomName], set: { floor: room.floor } }),
    );
  }
  await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  await recordEvent(input.tripId, input.userId, "rooms_imported", `${input.source}:${input.rooms.length} rooms, ${rows.length} spots`);
  return { ok: true, rooms: input.rooms.length, spots: rows.length };
}

/** Floors by room name, for the Rooms and beds page. Empty if migration 0009 hasn't run. */
export async function roomFloors(tripId: string): Promise<Map<string, string>> {
  try {
    const rows = await getDb().select().from(sleepRooms).where(eq(sleepRooms.tripId, tripId));
    return new Map(rows.filter((row) => row.floor).map((row) => [row.roomName, row.floor as string]));
  } catch {
    return new Map();
  }
}

/** Organizer or not, cheaply: one indexed lookup, no trip math. */
export async function isOrganizerOf(tripId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const row = (await getDb().select({ role: tripMembers.role }).from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId))))[0];
  return row?.role === "organizer";
}

/** Organizer: accessibility flags, a hold for one party, and co-sleep limits on every spot in a room. */
export async function updateRoom(input: {
  tripId: string;
  userId: string;
  roomName: string;
  groundFloor: boolean;
  noStairs: boolean;
  accessibleBath: boolean;
  cribSpace: boolean;
  reservedForUserId: string | null;
  coSleepAllowed: boolean;
  maxCoSleepers: number;
}) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  const room = raw.spots.filter((spot) => (spot.roomName ?? spot.id) === input.roomName);
  if (room.length === 0) return { ok: false, error: "That room isn't on this trip." };
  if (input.reservedForUserId && !raw.members.some((member) => member.userId === input.reservedForUserId && isPayerMember(member))) {
    return { ok: false, error: "Hold a room for a party on this trip." };
  }
  const db = getDb();
  for (const spot of room) {
    await db.update(sleepSpots).set({
      groundFloor: input.groundFloor ? 1 : 0,
      noStairs: input.noStairs ? 1 : 0,
      accessibleBath: input.accessibleBath ? 1 : 0,
      cribSpace: input.cribSpace ? 1 : 0,
      reservedForUserId: input.reservedForUserId,
      coSleepAllowed: input.coSleepAllowed ? 1 : 0,
      maxCoSleepers: input.coSleepAllowed ? Math.max(0, Math.min(4, input.maxCoSleepers)) : 0,
    }).where(eq(sleepSpots.id, spot.id));
  }
  return { ok: true };
}

/** Organizer: assign a whole room to a party, e.g. to approve an accessibility hold before picks open. */
export async function assignRoom(tripId: string, userId: string, roomName: string, partyUserId: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  const party = raw.members.find((member) => member.userId === partyUserId && isPayerMember(member));
  if (!party) return { ok: false, error: "Pick a party on this trip." };
  const room = raw.spots.filter((spot) => (spot.roomName ?? spot.id) === roomName);
  const db = getDb();
  for (const spot of room) {
    await db.delete(spotClaims).where(eq(spotClaims.spotId, spot.id));
    await db.insert(spotClaims).values({ spotId: spot.id, userId: partyUserId, status: "approved" });
  }
  await persistMath(tripId);
  return { ok: true };
}

export async function bookStay(tripId: string, userId: string, confirmation: string, actualLodgingCents: number) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (raw.trip.status !== "booking_ready") {
    return { ok: false, error: "Book the stay once enough people have committed." };
  }
  const db = getDb();
  const now = tripNow(raw);
  await db.update(trips).set({
    status: "booked",
    bookingConfirmation: confirmation,
    actualLodgingTotal: actualLodgingCents,
    bookedAt: now,
  }).where(eq(trips.id, tripId));
  await persistMath(tripId);
  return { ok: true };
}

export async function simulateDeadline(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (!raw.trip.buyInDeadline) return { ok: false, error: "Set a buy-in deadline first." };
  const jump = new Date(new Date(raw.trip.buyInDeadline).getTime() + 60_000).toISOString();
  return await setClock(tripId, jump);
}

export async function saveBudget(input: {
  tripId: string;
  userId: string;
  maxAllInCents: number;
  flexNote: string;
  mustHaves: string[];
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const member = memberOf(raw, input.userId);
  if (!member) return { ok: false, error: "Join the trip first." };
  if (!isPayerMember(member)) return { ok: false, error: "Your party's payer sets the party budget." };
  if (member.status === "committed" || member.status === "off_trip") {
    return { ok: false, error: "Your budget locks once you buy in." };
  }
  await getDb().insert(privateBudgets).values({
    tripId: input.tripId,
    userId: input.userId,
    maxAllIn: input.maxAllInCents,
    flexNote: input.flexNote || null,
    mustHaves: input.mustHaves.join(","),
    updatedAt: tripNow(raw),
  }).onConflictDoUpdate({
    target: [privateBudgets.tripId, privateBudgets.userId],
    set: {
      maxAllIn: input.maxAllInCents,
      flexNote: input.flexNote || null,
      mustHaves: input.mustHaves.join(","),
      updatedAt: tripNow(raw),
    },
  });
  return { ok: true };
}

export async function setOptionHidden(tripId: string, userId: string, optionId: string, hidden: boolean) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (!raw.options.some((option) => option.id === optionId)) return { ok: false, error: "That option isn't on this trip." };
  await getDb().update(pollOptions).set({ hiddenByOrganizer: hidden ? 1 : 0 }).where(eq(pollOptions.id, optionId));
  return { ok: true };
}

export async function recordEvent(tripId: string, userId: string | null, kind: string, detail: string | null = null) {
  await getDb().insert(tripEvents).values({
    id: crypto.randomUUID(),
    tripId,
    userId,
    kind,
    at: new Date().toISOString(),
    detail,
  });
}

/** A trip_events row that can never fail the action that caused it. */
async function safeEvent(tripId: string, userId: string | null, kind: string, detail: string | null = null) {
  try {
    await recordEvent(tripId, userId, kind, detail);
  } catch (error) {
    console.warn("event write failed", kind, error instanceof Error ? error.message : error);
  }
}

function funnel(tripId: string, userId: string, step: FunnelStep) {
  return recordFunnel(getD1(), tripId, userId, step);
}

export async function listEvents(tripId: string) {
  return getDb().select().from(tripEvents).where(eq(tripEvents.tripId, tripId));
}

/** Budgets for the feasibility math. Callers must not send this list to a browser. */
export async function ownBudget(tripId: string, userId: string) {
  return (await getDb().select().from(privateBudgets).where(and(eq(privateBudgets.tripId, tripId), eq(privateBudgets.userId, userId))))[0] ?? null;
}

export async function listBudgets(tripId: string) {
  return getDb().select().from(privateBudgets).where(eq(privateBudgets.tripId, tripId));
}

/** This trip's flight quotes only (by its poll options), not every trip's. */
export async function listFlightQuotes(tripId: string) {
  return getDb()
    .select({ userId: flightQuotes.userId, optionId: flightQuotes.optionId, highCents: flightQuotes.highCents })
    .from(flightQuotes)
    .innerJoin(pollOptions, eq(pollOptions.id, flightQuotes.optionId))
    .innerJoin(polls, eq(polls.id, pollOptions.pollId))
    .where(eq(polls.tripId, tripId));
}

export async function jumpPastSecondPayment(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const installment = raw.milestones.find((milestone) => milestone.kind === "installment");
  if (!installment) return { ok: false, error: "There isn't a second payment yet." };
  const jump = new Date(new Date(installment.dueDate).getTime() + 86_400_000).toISOString();
  return await setClock(tripId, jump);
}

/** Turn a read-only "party of one" into real traveler rows before the first edit. */
async function materializeParty(raw: RawTrip, partyUserId: string) {
  const synthetic = travelersOf(raw, partyUserId).filter((traveler) => traveler.synthetic);
  const db = getDb();
  for (const traveler of synthetic) {
    await db.insert(travelers).values({
      id: traveler.id,
      tripId: raw.trip.id,
      partyUserId,
      name: traveler.name,
      ageBand: traveler.ageBand,
      userId: traveler.userId,
      needsNotes: null,
      isHonoree: traveler.isHonoree ? 1 : 0,
      honoreeRole: traveler.honoreeRole,
      coSleepSpotId: null,
      sortOrder: 0,
    }).onConflictDoNothing();
  }
  const hasRow = (await db.select().from(parties).where(and(eq(parties.tripId, raw.trip.id), eq(parties.payerUserId, partyUserId))))[0];
  if (!hasRow) {
    const party = raw.parties.find((item) => item.payerUserId === partyUserId);
    await db.insert(parties).values({ tripId: raw.trip.id, payerUserId: partyUserId, name: party?.name ?? "Party" });
  }
}

/** The payer manages their own party. The organizer can edit any party. */
function canEditParty(raw: RawTrip, actorId: string, partyUserId: string): boolean {
  const actor = memberOf(raw, actorId);
  if (!actor) return false;
  return actor.role === "organizer" || actor.userId === partyUserId;
}

export async function saveParty(input: {
  tripId: string;
  actorId: string;
  partyUserId: string;
  name: string;
  shareComfort: ShareComfort;
  shareComfortNote: string;
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (!canEditParty(raw, input.actorId, input.partyUserId)) return { ok: false, error: "Only the party's payer or the organizer can edit this." };
  if (!raw.members.some((member) => member.userId === input.partyUserId && isPayerMember(member))) {
    return { ok: false, error: "That party isn't on this trip." };
  }
  if (!input.name.trim()) return { ok: false, error: "Give the party a name." };
  await materializeParty(raw, input.partyUserId);
  await getDb().update(parties).set({
    name: input.name.trim(),
    shareComfort: input.shareComfort,
    shareComfortNote: input.shareComfortNote.trim() || null,
  }).where(and(eq(parties.tripId, input.tripId), eq(parties.payerUserId, input.partyUserId)));
  return { ok: true };
}

export async function addTraveler(input: {
  tripId: string;
  actorId: string;
  partyUserId: string;
  name: string;
  ageBand: AgeBand;
  needsNotes: string;
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (!canEditParty(raw, input.actorId, input.partyUserId)) return { ok: false, error: "Only the party's payer or the organizer can add people." };
  const payer = memberOf(raw, input.partyUserId);
  if (!payer || payer.status === "off_trip" || payer.status === "declined") return { ok: false, error: "That party is off the trip." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  if (!input.name.trim()) return { ok: false, error: "Add a name." };
  const onTrip = raw.travelers.filter((traveler) => {
    const member = memberOf(raw, traveler.partyId);
    return member && member.status !== "off_trip" && member.status !== "declined";
  }).length;
  if (onTrip >= raw.trip.maxHeadcount) {
    return { ok: false, error: `The trip is capped at ${raw.trip.maxHeadcount} travelers. Ask the organizer to raise the cap.` };
  }
  await materializeParty(raw, input.partyUserId);
  await getDb().insert(travelers).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    partyUserId: input.partyUserId,
    name: input.name.trim(),
    ageBand: input.ageBand,
    userId: null,
    needsNotes: input.needsNotes.trim() || null,
    isHonoree: 0,
    honoreeRole: null,
    sortOrder: travelersOf(raw, input.partyUserId).length,
  });
  await persistMath(input.tripId);
  await recordEvent(input.tripId, input.actorId, "traveler_added", input.ageBand);
  return { ok: true };
}

export async function updateTraveler(input: {
  tripId: string;
  actorId: string;
  travelerId: string;
  name: string;
  ageBand: AgeBand;
  needsNotes: string;
}) {
  const raw = await readRaw(input.tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const traveler = raw.travelers.find((item) => item.id === input.travelerId);
  if (!traveler) return { ok: false, error: "That person isn't on this trip." };
  if (!canEditParty(raw, input.actorId, traveler.partyId)) return { ok: false, error: "Only the party's payer or the organizer can edit this." };
  await materializeParty(raw, traveler.partyId);
  await getDb().update(travelers).set({
    name: input.name.trim() || traveler.name,
    ageBand: input.ageBand,
    needsNotes: input.needsNotes.trim() || null,
  }).where(eq(travelers.id, input.travelerId));
  const payer = memberOf(raw, traveler.partyId);
  if (traveler.ageBand !== input.ageBand && payer?.status === "committed") {
    // A late band change re-prices per-head shares now; the organizer can see that it happened.
    await recordEvent(input.tripId, input.actorId, "age_band_changed_after_buy_in", `${traveler.ageBand}->${input.ageBand}`);
  }
  await persistMath(input.tripId);
  return { ok: true };
}

export async function removeTraveler(tripId: string, actorId: string, travelerId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const traveler = raw.travelers.find((item) => item.id === travelerId);
  if (!traveler) return { ok: false, error: "That person isn't on this trip." };
  if (!canEditParty(raw, actorId, traveler.partyId)) return { ok: false, error: "Only the party's payer or the organizer can remove people." };
  if (traveler.userId === traveler.partyId) return { ok: false, error: "The payer stays on their own party." };
  if (traveler.userId) return { ok: false, error: "This person has their own login. They stay on the party." };
  const db = getDb();
  await db.delete(travelerOptIns).where(eq(travelerOptIns.travelerId, travelerId));
  await db.delete(travelers).where(eq(travelers.id, travelerId));
  await persistMath(tripId);
  return { ok: true };
}

/**
 * Lodging split mode. Free to switch before any buy-in. After one, every committed
 * paying party has to have acknowledged the before/after (recorded by the organizer).
 */
export async function setSplitMode(tripId: string, userId: string, mode: SplitMode) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  const db = getDb();
  const locked = buyInTermsLocked(raw);
  if (!locked) {
    if (mode === raw.trip.splitMode && !raw.trip.pendingSplitMode) return { ok: true };
    await db.update(trips).set({ splitMode: mode, pendingSplitMode: null }).where(eq(trips.id, tripId));
    await db.delete(splitModeAcks).where(eq(splitModeAcks.tripId, tripId));
    if (mode !== raw.trip.splitMode) {
      await recordEvent(tripId, userId, "split_mode_changed", `${raw.trip.splitMode}->${mode}`);
    }
    await persistMath(tripId);
    return { ok: true };
  }
  if (mode === raw.trip.splitMode) {
    if (!raw.trip.pendingSplitMode) return { ok: true };
    await db.update(trips).set({ pendingSplitMode: null }).where(eq(trips.id, tripId));
    await db.delete(splitModeAcks).where(eq(splitModeAcks.tripId, tripId));
    return { ok: true };
  }
  if (raw.trip.pendingSplitMode === mode) return { ok: true };
  await db.delete(splitModeAcks).where(eq(splitModeAcks.tripId, tripId));
  await db.update(trips).set({ pendingSplitMode: mode }).where(eq(trips.id, tripId));
  await recordEvent(tripId, userId, "split_mode_proposed", `${raw.trip.splitMode}->${mode}`);
  return { ok: true };
}

export async function acknowledgeSplitMode(tripId: string, userId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const pending = raw.trip.pendingSplitMode;
  if (!pending) return { ok: false, error: "There's no split change waiting on agreement." };
  const member = memberOf(raw, userId);
  if (!member || !isPayerMember(member) || !isCommittedPayer(member)) {
    return { ok: false, error: "Only a committed party's payer can agree to this." };
  }
  const db = getDb();
  const already = raw.splitAcks.find((ack) => ack.payerUserId === userId && ack.proposedMode === pending);
  if (!already) {
    await db.insert(splitModeAcks).values({
      tripId,
      payerUserId: userId,
      proposedMode: pending,
      acknowledgedAt: tripNow(raw),
    });
  }
  const committed = mathMembers(raw).filter((item) => isCommittedPayer(item)).map((item) => item.userId);
  const acked = new Set([
    ...raw.splitAcks.filter((ack) => ack.proposedMode === pending).map((ack) => ack.payerUserId),
    userId,
  ]);
  if (splitChangeReady(committed, acked)) {
    await db.update(trips).set({ splitMode: pending, pendingSplitMode: null }).where(eq(trips.id, tripId));
    await db.delete(splitModeAcks).where(eq(splitModeAcks.tripId, tripId));
    await recordEvent(tripId, userId, "split_mode_changed", `${raw.trip.splitMode}->${pending} (all parties agreed)`);
    await persistMath(tripId);
  }
  return { ok: true };
}

export async function setAgeWeights(tripId: string, userId: string, weights: AgeWeights) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  for (const band of AGE_BANDS) {
    if (!Number.isFinite(weights[band]) || weights[band] < 0 || weights[band] > 2) {
      return { ok: false, error: "Each weight has to be between 0 and 2." };
    }
  }
  await getDb().update(trips).set({ ageWeights: JSON.stringify(weights) }).where(eq(trips.id, tripId));
  await persistMath(tripId);
  return { ok: true };
}

export async function setHonoreeExclusion(tripId: string, userId: string, excluded: boolean) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (buyInTermsLocked(raw)) return { ok: false, error: "This locks once someone has bought in." };
  await getDb().update(trips).set({ honoreeExcludedFromSplit: excluded ? 1 : 0 }).where(eq(trips.id, tripId));
  await persistMath(tripId);
  return { ok: true };
}

export async function setHeadcounts(tripId: string, userId: string, minPayers: number, maxTravelers: number) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
  if (!Number.isInteger(minPayers) || minPayers < 1) return { ok: false, error: "The minimum has to be at least one paying party." };
  if (!Number.isInteger(maxTravelers) || maxTravelers < 1) return { ok: false, error: "Set a traveler cap." };
  if (minPayers > 100 || maxTravelers > 200) return { ok: false, error: `${APP_NAME} handles up to 200 travelers.` };
  const onTrip = raw.travelers.filter((traveler) => {
    const member = memberOf(raw, traveler.partyId);
    return member && member.status !== "off_trip" && member.status !== "declined";
  }).length;
  if (maxTravelers < onTrip) return { ok: false, error: `${onTrip} travelers are already on the trip.` };
  await getDb().update(trips).set({ minHeadcount: minPayers, maxHeadcount: maxTravelers }).where(eq(trips.id, tripId));
  if (raw.trip.status === "under_minimum" && raw.members.filter(isCommittedPayer).length >= minPayers) {
    // 6.5: lowering the minimum so |P| meets it moves the trip to booking_ready.
    await getDb().update(trips).set({ status: "booking_ready" }).where(eq(trips.id, tripId));
    await safeEvent(tripId, userId, "booking_ready");
    const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
    for (const payment of raw.payments) {
      if (buyIn && payment.milestoneId === buyIn.id && payment.status === "refunded") {
        const member = memberOf(raw, payment.userId);
        if (member?.status === "committed") await getDb().update(payments).set({ status: "paid" }).where(eq(payments.id, payment.id));
      }
    }
  }
  await persistMath(tripId);
  return { ok: true };
}

/** True when this user is on this trip. Used to refuse a demo switch to a stranger. */
export async function isMemberOf(tripId: string, userId: string): Promise<boolean> {
  if (!userId) return false;
  const row = (await getDb().select({ id: tripMembers.userId }).from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, userId))))[0];
  return !!row;
}

/**
 * Put the seeded demo trip in the state a tour step expects, so Back and Next
 * never strand someone. Only ever touches the demo trips.
 */
export async function prepareTourStep(step: number) {
  if (step === 1) {
    await resetDemoTrip();
    return;
  }
  if (step < 5) return;
  if (step > 6) return;
  const tripId = DEMO_TRIP_ID;
  let raw = await loadTrip(tripId);
  if (!raw) return;
  // Steps 5 and 6 tell the story from after Taylor commits and takes the sofa.
  const taylor = raw.members.find((member) => member.userId === "user_taylor");
  const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
  if (taylor?.status === "joined" && buyIn && (raw.trip.status === "buy_in_open" || raw.trip.status === "booking_ready")) {
    await payMilestone(tripId, "user_taylor", buyIn.id);
    raw = await loadTrip(tripId);
  }
  if (raw && !raw.claims.some((claim) => claim.userId === "user_taylor" && claim.status === "approved")) {
    const loftFree = !raw.claims.some((claim) => claim.spotId === "spot_loft" && claim.status === "approved");
    if (loftFree) await claimSpot(tripId, "user_taylor", "spot_loft");
  }
  if (step === 6) {
    raw = await loadTrip(tripId);
    if (raw?.trip.status === "buy_in_open") await simulateDeadline(tripId);
  }
}

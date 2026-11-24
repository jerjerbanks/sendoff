import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { DEMO_TRIP_ID } from "./constants";
import { RULES } from "./rules";
import { getDb } from "./db";
import {
  demoCosts,
  demoMembers,
  demoMilestones,
  demoOptions,
  demoPayments,
  demoPolls,
  demoClaims,
  demoSpots,
  demoTeeParticipants,
  demoTrip,
  demoUsers,
  demoVotes,
} from "./demo-data";
import {
  costItemParticipants,
  costItems,
  milestones,
  payments,
  pollOptions,
  polls,
  sleepSpots,
  spotClaims,
  spotRequests,
  tripMembers,
  trips,
  users,
  votes,
} from "./schema";
import {
  isBooked,
  isCommittedPayer,
  isHonoree,
  isPotentialPayer,
  reconcileTrip,
  milestoneSchedule,
  settledBills,
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
} from "./trip-math";

export type Result = { ok: true } | { ok: false; error: string };

export interface MemberRecord {
  userId: string;
  name: string;
  contact: string;
  role: Role;
  status: MemberStatus;
  committedAt: string | null;
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
  };
  spots: MathSpot[];
  claims: MathClaim[];
  members: MemberRecord[];
  polls: { id: string; kind: string; deadline: string; lockedOptionId: string | null }[];
  options: { id: string; pollId: string; label: string; estCost: number; link: string; sortOrder: number }[];
  votes: { pollOptionId: string; userId: string }[];
  costs: MathCost[];
  costLabels: { id: string; label: string }[];
  milestones: MathMilestone[];
  payments: (MathPayment & { id: string; paidAt: string | null })[];
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

  const memberRows = await db.select({
      userId: tripMembers.userId,
      name: users.name,
      contact: users.contact,
      role: tripMembers.role,
      status: tripMembers.status,
      committedAt: tripMembers.committedAt,
    })
    .from(tripMembers)
    .innerJoin(users, eq(users.id, tripMembers.userId))
    .where(eq(tripMembers.tripId, tripId))
    ;

  const pollRows = await db.select().from(polls).where(eq(polls.tripId, tripId));
  const pollIds = pollRows.map((poll) => poll.id);
  const optionRows = pollIds.length
    ? await db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds))
    : [];
  const optionIds = optionRows.map((option) => option.id);
  const voteRows = optionIds.length
    ? await db.select().from(votes).where(inArray(votes.pollOptionId, optionIds))
    : [];
  const costRows = await db.select().from(costItems).where(eq(costItems.tripId, tripId));
  const costIds = costRows.map((cost) => cost.id);
  const participantRows = costIds.length
    ? await db.select().from(costItemParticipants).where(inArray(costItemParticipants.costItemId, costIds))
    : [];
  const milestoneRows = await db.select().from(milestones).where(eq(milestones.tripId, tripId));
  const milestoneIds = milestoneRows.map((milestone) => milestone.id);
  const paymentRows = milestoneIds.length
    ? await db.select().from(payments).where(inArray(payments.milestoneId, milestoneIds))
    : [];
  const spotRows = await db.select().from(sleepSpots).where(eq(sleepSpots.tripId, tripId));
  const spotIds = spotRows.map((spot) => spot.id);
  const claimRows = spotIds.length
    ? await db.select().from(spotClaims).where(inArray(spotClaims.spotId, spotIds))
    : [];

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
    },
    spots: spotRows.map((spot) => ({
      id: spot.id,
      weight: spot.weight / 1000,
      reservedForHonoree: spot.reservedForHonoree === 1,
      sharingEnabled: spot.sharingEnabled === 1,
      capacity: spot.capacity || 1,
      sortOrder: spot.sortOrder || 0,
      roomName: spot.roomName,
      bedType: spot.bedType,
    })),
    claims: claimRows.map((claim) => ({
      spotId: claim.spotId,
      userId: claim.userId,
      status: claim.status === "approved" || claim.status === "denied" ? claim.status : "pending" as const,
    })),
    members: memberRows.map((member) => ({
      userId: member.userId,
      name: member.name,
      contact: member.contact,
      role: asRole(member.role),
      status: asStatus(member.status),
      committedAt: member.committedAt,
    })),
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
    })),
    votes: voteRows.map((vote) => ({ pollOptionId: vote.pollOptionId, userId: vote.userId })),
    costs: costRows.map((cost) => ({
      id: cost.id,
      splitType: asSplit(cost.splitType),
      category: cost.category,
      amountCents: cost.amount,
      memberId: cost.memberId,
      participantIds: participantRows.filter((row) => row.costItemId === cost.id).map((row) => row.userId),
      isLodging: cost.isLodging === 1,
    })),
    costLabels: costRows.map((cost) => ({ id: cost.id, label: cost.label })),
    milestones: milestoneRows.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      dueDate: milestone.dueDate,
      kind: asMilestoneKind(milestone.kind),
      amountRule: milestone.amountRule === "pct_of_share" ? "pct_of_share" : "fixed",
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
  };
}

function mathMembers(raw: RawTrip): MathMember[] {
  return raw.members.map((member) => ({
    userId: member.userId,
    role: member.role,
    status: member.status,
  }));
}

function billInput(raw: RawTrip) {
  return {
    members: mathMembers(raw),
    costs: raw.costs,
    spots: raw.spots,
    claims: raw.claims,
    payments: plainPayments(raw),
    booked: raw.trip.status === "booked",
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

export async function persistMath(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return;
  const db = getDb();
  const now = tripNow(raw);
  const outcome = reconcileTrip({
    status: raw.trip.status,
    buyInDeadline: raw.trip.buyInDeadline,
    minimumCommitters: raw.trip.minHeadcount,
    now,
    members: mathMembers(raw),
  });

  if (outcome.deadlineRan || outcome.status !== raw.trip.status) {
    await db.update(trips).set({ status: outcome.status }).where(eq(trips.id, tripId));
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

  const fresh = await readRaw(tripId);
  if (!fresh) return;
  if (outcome.refundBuyIns || fresh.trip.status === "under_minimum") await refundBuyIns(fresh);
  if (fresh.trip.status === "cancelled") await refundCollected(fresh);
  if (fresh.trip.status === "buy_in_open" || fresh.trip.status === "booking_ready" || fresh.trip.status === "booked") {
    await syncOpenPayments(tripId, tripNow(fresh));
  } else {
    await clearUncollected(tripId);
  }
}

async function refundBuyIns(raw: RawTrip) {
  const buyIn = raw.milestones.find((milestone) => milestone.kind === "buy_in");
  if (!buyIn) return;
  const db = getDb();
  for (const payment of raw.payments) {
    if (payment.milestoneId === buyIn.id && payment.status === "paid") {
      await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
    }
  }
}

async function refundCollected(raw: RawTrip) {
  const db = getDb();
  for (const payment of raw.payments) {
    if (payment.status === "paid") {
      await db.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
    }
  }
}

async function clearUncollected(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return;
  const db = getDb();
  for (const payment of raw.payments) {
    if (!lockedPayment.has(payment.status)) {
      await db.delete(payments).where(eq(payments.id, payment.id));
    }
  }
}

async function syncOpenPayments(tripId: string, now: string) {
  const raw = await readRaw(tripId);
  if (!raw) return;
  const db = getDb();
  const members = mathMembers(raw);
  const payList = plainPayments(raw);
  const shares = settledBills(billInput(raw));
  const shareOf = new Map(shares.map((bill) => [bill.userId, bill]));
  const keep = new Set<string>();
  const desired: { milestoneId: string; userId: string; amountCents: number; status: PaymentStatus }[] = [];

  for (const member of members) {
    if (isCommittedPayer(member) && (raw.trip.status === "booking_ready" || raw.trip.status === "booked")) {
      const total = shareOf.get(member.userId)?.totalCents ?? 0;
      const lines = milestoneSchedule({
        totalCents: total,
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
}

export async function tripIdForToken(token: string) {
  const trip = (await getDb().select({ id: trips.id }).from(trips).where(eq(trips.inviteToken, token)))[0];
  return trip?.id ?? null;
}

export async function loadTrip(tripId: string) {
  if (!(await readRaw(tripId))) return null;
  await persistMath(tripId);
  return await readRaw(tripId);
}

export async function ensureDemoSeed() {
  const db = getDb();
  const existing = (await db.select().from(trips).where(eq(trips.id, DEMO_TRIP_ID)))[0];
  if (existing) {
    const lodge = (await db.select().from(costItems).where(eq(costItems.id, "cost_lodge")))[0];
    if (lodge?.amount === 240_000) return;
    await resetDemoTrip();
    return;
  }
  for (const user of demoUsers) await db.insert(users).values({ ...user }).onConflictDoNothing();
  await db.insert(trips).values({ ...demoTrip });
  for (const member of demoMembers) await db.insert(tripMembers).values({ tripId: DEMO_TRIP_ID, ...member });
  for (const poll of demoPolls) await db.insert(polls).values({ tripId: DEMO_TRIP_ID, ...poll });
  for (const option of demoOptions) await db.insert(pollOptions).values({ ...option });
  for (const vote of demoVotes) {
    await db.insert(votes).values({ pollOptionId: vote.optionId, userId: vote.userId });
  }
  for (const cost of demoCosts) await db.insert(costItems).values({ tripId: DEMO_TRIP_ID, ...cost });
  for (const userId of demoTeeParticipants) {
    await db.insert(costItemParticipants).values({ costItemId: "cost_tee", userId });
  }
  for (const milestone of demoMilestones) await db.insert(milestones).values({ tripId: DEMO_TRIP_ID, ...milestone });
  for (const payment of demoPayments) await db.insert(payments).values({ ...payment });
  for (const spot of demoSpots) await db.insert(sleepSpots).values({ tripId: DEMO_TRIP_ID, ...spot });
  for (const claim of demoClaims) await db.insert(spotClaims).values(claim);
}

export async function resetDemoTrip() {
  const db = getDb();
  const pollRows = await db.select().from(polls).where(eq(polls.tripId, DEMO_TRIP_ID));
  const pollIds = pollRows.map((poll) => poll.id);
  const optionRows = pollIds.length
    ? await db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds))
    : [];
  const costRows = await db.select().from(costItems).where(eq(costItems.tripId, DEMO_TRIP_ID));
  const milestoneRows = await db.select().from(milestones).where(eq(milestones.tripId, DEMO_TRIP_ID));
  if (optionRows.length) {
    await db.delete(votes).where(inArray(votes.pollOptionId, optionRows.map((option) => option.id)));
  }
  if (pollIds.length) await db.delete(pollOptions).where(inArray(pollOptions.pollId, pollIds));
  await db.delete(polls).where(eq(polls.tripId, DEMO_TRIP_ID));
  if (costRows.length) {
    await db.delete(costItemParticipants).where(
      inArray(costItemParticipants.costItemId, costRows.map((cost) => cost.id)),
    );
  }
  await db.delete(costItems).where(eq(costItems.tripId, DEMO_TRIP_ID));
  if (milestoneRows.length) {
    await db.delete(payments).where(inArray(payments.milestoneId, milestoneRows.map((milestone) => milestone.id)));
  }
  await db.delete(milestones).where(eq(milestones.tripId, DEMO_TRIP_ID));
  const demoSpotIds = (await db.select().from(sleepSpots).where(eq(sleepSpots.tripId, DEMO_TRIP_ID))).map((spot) => spot.id);
  if (demoSpotIds.length) await db.delete(spotClaims).where(inArray(spotClaims.spotId, demoSpotIds));
  await db.delete(spotRequests).where(eq(spotRequests.tripId, DEMO_TRIP_ID));
  await db.delete(sleepSpots).where(eq(sleepSpots.tripId, DEMO_TRIP_ID));
  await db.delete(tripMembers).where(eq(tripMembers.tripId, DEMO_TRIP_ID));
  await db.delete(trips).where(eq(trips.id, DEMO_TRIP_ID));
  await ensureDemoSeed();
  return { ok: true };
}

export async function createTrip(input: {
  name: string;
  organizerName: string;
  organizerContact: string;
  honoreeName: string;
  honoreeContact: string;
  dateWindow: string;
}) {
  const db = getDb();
  const tripId = crypto.randomUUID();
  const organizerId = crypto.randomUUID();
  const honoreeId = crypto.randomUUID();
  const now = Date.now();
  await db.insert(users).values([
    { id: organizerId, name: input.organizerName, contact: input.organizerContact },
    { id: honoreeId, name: input.honoreeName, contact: input.honoreeContact },
  ]);
  await db.insert(trips).values({
    id: tripId,
    name: input.name,
    tripType: "bachelor",
    organizerId,
    guestOfHonorUserId: honoreeId,
    dateWindow: input.dateWindow,
    status: "voting",
    buyInAmount: 0,
    buyInDeadline: null,
    minHeadcount: 5,
    maxHeadcount: 8,
    bedChangePolicy: "member_requests",
    honoreeExcludedFromSplit: 1,
    inviteToken: crypto.randomBytes(9).toString("base64url"),
    simulatedNow: null,
  });
  await db.insert(tripMembers).values([
    { tripId, userId: organizerId, role: "organizer", status: "joined", committedAt: null },
    { tripId, userId: honoreeId, role: "honoree", status: "committed", committedAt: new Date().toISOString() },
  ]);
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
  return { tripId, organizerId };
}

export async function joinTrip(input: {
  token: string;
  name: string;
  contact: string;
}) {
  const db = getDb();
  const found = (await db.select().from(trips).where(eq(trips.inviteToken, input.token)))[0];
  if (!found) return { ok: false, error: "That invite link doesn't go anywhere." };
  await persistMath(found.id);
  const raw = await readRaw(found.id);
  if (!raw) return { ok: false, error: "That invite link doesn't go anywhere." };

  const contact = input.contact.trim().toLowerCase();
  const existing = raw.members.find((member) => member.contact.trim().toLowerCase() === contact);
  if (existing) {
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
    return { ok: true, tripId: raw.trip.id, userId: existing.userId };
  }

  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  if (raw.trip.status === "booked" || raw.trip.status === "under_minimum") {
    return { ok: false, error: "The buy-in deadline has passed. Nobody can join after that." };
  }

  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, name: input.name, contact: input.contact.trim() });
  await db.insert(tripMembers)
    .values({ tripId: raw.trip.id, userId, role: "member", status: "joined", committedAt: null })
    ;
  return { ok: true, tripId: raw.trip.id, userId };
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
  await getDb().update(polls).set({ lockedOptionId: null }).where(eq(polls.id, pollId));
  return { ok: true };
}

export async function setPollDeadline(tripId: string, userId: string, pollId: string, deadlineIso: string) {
  const raw = await requireOrganizer(tripId, userId);
  if ("ok" in raw) return raw;
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
    memberId = actor.role === "organizer" ? input.memberId : actor.userId;
    if (!memberId || !memberOf(raw, memberId)) return { ok: false, error: "Pick who pays this." };
  }
  await getDb().insert(costItems).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    label: input.label,
    category: input.category,
    splitType: input.splitType,
    amount: input.amountCents,
    memberId,
    isLodging: input.category === "lodging" && input.splitType === "shared" ? 1 : 0,
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
  await persistMath(tripId);
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status !== "buy_in_open") {
    return { ok: false, error: "You can opt in or out only while buy-in is open." };
  }
  const member = memberOf(raw, userId);
  if (!member || !isPotentialPayer(member)) return { ok: false, error: "You're not paying on this trip." };
  const cost = raw.costs.find((item) => item.id === costId);
  if (!cost || cost.splitType !== "optional") return { ok: false, error: "That isn't an optional cost." };
  const db = getDb();
  if (cost.participantIds.includes(userId)) {
    await db.delete(costItemParticipants)
      .where(and(eq(costItemParticipants.costItemId, costId), eq(costItemParticipants.userId, userId)))
      ;
  } else {
    await db.insert(costItemParticipants).values({ costItemId: costId, userId });
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
  if (input.minHeadcount < 2) return { ok: false, error: "Minimum crew has to include the guest of honor and at least one payer." };
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
  if (isHonoree(member)) return { ok: false, error: "The guest of honor doesn't pay a buy-in. The crew covers that share." };
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
    unclaimedSpots(raw.spots, raw.claims) === 0 &&
    !raw.claims.some((claim) => claim.userId === userId && claim.status === "approved")
  ) {
    return { ok: false, error: "No free bed or open share slot. The organizer has to add a spot or approve a share first." };
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
  if (member.status !== "committed") return { ok: false, error: "They're not a committed payer." };
  const now = tripNow(raw);
  const bill = settledBills(billInput(raw)).find((item) => item.userId === userId);
  const booked = isBooked(raw.trip.status);
  const late = milestoneSchedule({
    totalCents: bill?.totalCents ?? 0,
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

export async function claimSpot(tripId: string, userId: string, spotId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  if (raw.trip.status === "cancelled") return { ok: false, error: "This trip was cancelled." };
  const actor = memberOf(raw, userId);
  const spot = raw.spots.find((item) => item.id === spotId);
  if (!actor || !spot) return { ok: false, error: "That bed isn't on this trip." };
  if (spot.reservedForHonoree) return { ok: false, error: "That room is reserved for the guest of honor." };
  const isOrganizer = actor.role === "organizer";
  const approvedHere = raw.claims.filter((claim) => claim.spotId === spotId && claim.status === "approved");
  const openShare = spot.sharingEnabled && approvedHere.length > 0 && approvedHere.length < (spot.capacity || 2);
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
  const db = getDb();
  if (!openShare) {
    await db.delete(spotClaims).where(and(eq(spotClaims.userId, userId), inArray(spotClaims.spotId, raw.spots.map((item) => item.id))));
  }
  await db.insert(spotClaims).values({ spotId, userId, status: "approved" }).onConflictDoUpdate({
    target: [spotClaims.spotId, spotClaims.userId],
    set: { status: "approved" },
  });
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
  if (actor.role !== "organizer" && raw.trip.bedChangePolicy === "locked" && raw.trip.status !== "booked") {
    return { ok: false, error: "Beds are locked. Only the organizer can move people." };
  }
  const mine = raw.claims.find((claim) => claim.userId === input.userId && claim.status === "approved");
  const target = raw.claims.find((claim) => claim.spotId === input.toSpotId && claim.status === "approved" && claim.userId !== input.userId);
  await getDb().insert(spotRequests).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    type: input.type,
    fromSpotId: mine?.spotId ?? null,
    toSpotId: input.toSpotId,
    requesterUserId: input.userId,
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
  if (actor.role !== "organizer" && !raw.claims.some((claim) => claim.spotId === spotId && claim.userId === userId)) {
    return { ok: false, error: "You can only give up your own bed." };
  }
  await getDb().delete(spotClaims).where(and(eq(spotClaims.spotId, spotId), eq(spotClaims.userId, actor.role === "organizer" ? userId : userId)));
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
}) {
  const raw = await requireOrganizer(input.tripId, input.userId);
  if ("ok" in raw) return raw;
  await getDb().insert(sleepSpots).values({
    id: crypto.randomUUID(),
    tripId: input.tripId,
    roomName: input.roomName,
    bedType: input.bedType,
    privateBath: input.privateBath ? 1 : 0,
    privateRoom: input.privateRoom ? 1 : 0,
    weight: Math.round(input.weight * 1000),
    capacity: input.bedType.toLowerCase() === "king" || input.bedType.toLowerCase() === "queen" ? 2 : 1,
    sharingEnabled: input.bedType.toLowerCase() === "king" || input.bedType.toLowerCase() === "queen" ? 1 : 0,
    sortOrder: 99,
    reservedForHonoree: input.reservedForHonoree ? 1 : 0,
  });
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

export async function jumpPastSecondPayment(tripId: string) {
  const raw = await readRaw(tripId);
  if (!raw) return { ok: false, error: "Trip not found." };
  const installment = raw.milestones.find((milestone) => milestone.kind === "installment");
  if (!installment) return { ok: false, error: "There isn't a second payment yet." };
  const jump = new Date(new Date(installment.dueDate).getTime() + 86_400_000).toISOString();
  return await setClock(tripId, jump);
}

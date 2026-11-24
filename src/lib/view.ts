import { cache } from "react";
import { money } from "./format";
import { DEMO_TRIP_ID } from "./constants";
import { ensureDemoSeed, loadTrip, tripNow, buyInTermsLocked, type MemberRecord, type RawTrip } from "./store";
import {
  forfeitedCents,
  type MathClaim,
  type MathSpot,
  isBooked,
  isCommittedPayer,
  isHonoree,
  isPotentialPayer,
  lodgingCents,
  milestoneSchedule,
  nextDue,
  sensitivity,
  settledBills,
  vendorCents,
  sharedEvenCents,
  type MilestoneLine,
  type PersonBill,
  type SensitivityRow,
  type TripStatus,
} from "./trip-math";

export interface PayLine extends MilestoneLine {
  canPay: boolean;
}

export interface MemberView {
  userId: string;
  name: string;
  contact: string;
  role: MemberRecord["role"];
  status: MemberRecord["status"];
  committedAt: string | null;
  bill: PersonBill | null;
  paidCents: number;
  forfeitedCents: number;
  refundedCents: number;
  balanceCents: number | null;
  lines: PayLine[];
}

export interface PollOptionView {
  id: string;
  label: string;
  estCost: number;
  link: string;
  votes: number;
  votedByMe: boolean;
}

export interface PollView {
  id: string;
  kind: string;
  deadline: string;
  lockedOptionId: string | null;
  lockedLabel: string | null;
  closed: boolean;
  options: PollOptionView[];
}

export interface CostView {
  id: string;
  label: string;
  category: string;
  splitType: RawTrip["costs"][number]["splitType"];
  amountCents: number;
  memberId: string | null;
  memberName: string | null;
  participantIds: string[];
  participantNames: string[];
  optedIn: boolean;
}

export interface Notice {
  tone: "info" | "warn" | "bad" | "good";
  text: string;
}

export interface TripView {
  id: string;
  name: string;
  tripType: string;
  dateWindow: string;
  status: TripStatus;
  buyInAmountCents: number;
  buyInDeadline: string | null;
  minHeadcount: number;
  maxHeadcount: number;
  bedChangePolicy: "member_requests" | "locked";
  inviteToken: string;
  organizerName: string;
  guestName: string;
  now: string;
  simulated: boolean;
  viewer: MemberView | null;
  isOrganizer: boolean;
  members: MemberView[];
  polls: PollView[];
  costs: CostView[];
  milestones: RawTrip["milestones"];
  spots: MathSpot[];
  claims: MathClaim[];
  termsLocked: boolean;
  buyInOpen: boolean;
  lockedIn: boolean;
  underMinimum: boolean;
  cancelled: boolean;
  payerCount: number;
  potentialPayerCount: number;
  minPayerCount: number;
  suggestedBuyInCents: number;
  sharedCents: number;
  forfeitedPotCents: number;
  roundingCents: number;
  notices: Notice[];
  nextPayment: PayLine | null;
  sensitivityRows: SensitivityRow[];
  rebase: { userId: string; name: string; beforeCents: number; afterCents: number }[];
  currentShareCents: number | null;
  saveIfOneMoreCents: number | null;
  addIfSomeoneDropsCents: number | null;
  isDemo: boolean;
}

function historyLines(raw: RawTrip, userId: string): MilestoneLine[] {
  return raw.payments
    .filter((payment) => payment.userId === userId)
    .map((payment) => {
      const milestone = raw.milestones.find((item) => item.id === payment.milestoneId);
      return {
        milestoneId: payment.milestoneId,
        name: milestone?.name ?? "Payment",
        kind: milestone?.kind ?? "installment",
        dueDate: milestone?.dueDate ?? tripNow(raw),
        amountCents: payment.amountCents,
        status: payment.status,
        locked: true,
      };
    });
}

function buildMember(raw: RawTrip, member: MemberRecord, bill: PersonBill | undefined, now: string): MemberView {
  const paidCents = raw.payments
    .filter((payment) => payment.userId === member.userId && payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const forfeited = raw.payments
    .filter((payment) => payment.userId === member.userId && payment.status === "forfeited")
    .reduce((sum, payment) => sum + payment.amountCents, 0);
  const refunded = raw.payments
    .filter((payment) => payment.userId === member.userId && payment.status === "refunded")
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  let base: MilestoneLine[] = [];
  const priced = raw.trip.status === "booking_ready" || raw.trip.status === "booked" || raw.trip.status === "buy_in_open";
  if (!priced || member.status === "off_trip" || member.status === "invited") {
    base = historyLines(raw, member.userId);
  } else if (isCommittedPayer(member) && (raw.trip.status === "booking_ready" || raw.trip.status === "booked") && bill) {
    base = milestoneSchedule({
      totalCents: bill.totalCents,
      milestones: raw.milestones,
      payments: raw.payments,
      userId: member.userId,
      buyInAmountCents: raw.trip.buyInAmount,
      now,
    });
  } else if (isPotentialPayer(member) && raw.trip.buyInAmount > 0) {
    const buyIn = raw.milestones.find((item) => item.kind === "buy_in");
    if (buyIn) {
      const existing = raw.payments.find(
        (payment) => payment.milestoneId === buyIn.id && payment.userId === member.userId,
      );
      base = [
        {
          milestoneId: buyIn.id,
          name: buyIn.name,
          kind: "buy_in",
          dueDate: buyIn.dueDate,
          amountCents: existing?.amountCents ?? raw.trip.buyInAmount,
          status: existing?.status === "paid" || existing?.status === "refunded" ? existing.status : "due",
          locked: existing?.status === "paid" || existing?.status === "refunded",
        },
      ];
    }
  }

  const lines: PayLine[] = base.map((line) => ({
    ...line,
    canPay:
      raw.trip.status !== "cancelled" &&
      raw.trip.status !== "under_minimum" &&
      line.amountCents > 0 &&
      (line.status === "due" || line.status === "late") &&
      (line.kind === "buy_in"
        ? (raw.trip.status === "buy_in_open" || raw.trip.status === "booking_ready") && member.status === "joined"
        : (raw.trip.status === "booking_ready" || raw.trip.status === "booked") && member.status === "committed"),
  }));

  let balanceCents: number | null = 0;
  if (member.status === "off_trip" || isHonoree(member)) balanceCents = 0;
  else if (bill?.payer) balanceCents = Math.max(0, bill.totalCents - paidCents);
  else if (raw.trip.status === "buy_in_open" && isCommittedPayer(member)) balanceCents = null;
  else if (member.status === "joined") {
    const buyIn = lines.find((line) => line.kind === "buy_in");
    balanceCents = buyIn && buyIn.status === "due" ? buyIn.amountCents : 0;
  }

  return {
    userId: member.userId,
    name: member.name,
    contact: member.contact,
    role: member.role,
    status: member.status,
    committedAt: member.committedAt,
    bill: bill ?? null,
    paidCents,
    forfeitedCents: forfeited,
    refundedCents: refunded,
    balanceCents,
    lines,
  };
}

function buildView(raw: RawTrip, viewerUserId: string | null): TripView {
  const now = tripNow(raw);
  const forecastOrder = ["user_taylor", "user_riley", "user_casey", "user_morgan"];
  const membersMath = raw.members.map((member) => ({
    userId: member.userId,
    role: member.role,
    status: member.status,
    committedAt: member.committedAt,
    forecastOrder: forecastOrder.indexOf(member.userId),
  }));
  const extras = raw.costs
    .filter((cost) => cost.splitType === "individual" && cost.memberId && !raw.members.some((member) => member.userId === cost.memberId))
    .map((cost) => ({ userId: cost.memberId as string, individualCents: cost.amountCents }));
  const lodgeOverride = raw.trip.actualLodgingTotal;
  const billArgs = {
    members: membersMath,
    costs: raw.costs,
    spots: raw.spots,
    claims: raw.claims,
    payments: raw.payments,
    booked: raw.trip.status === "booked",
    lodgeOverrideCents: lodgeOverride,
    extras,
  };
  const bills = settledBills(billArgs);
  const previousBills =
    lodgeOverride != null
      ? settledBills({ ...billArgs, lodgeOverrideCents: null })
      : null;
  const billOf = new Map(bills.map((bill) => [bill.userId, bill]));
  const nameOf = new Map(raw.members.map((member) => [member.userId, member.name]));

  const members = raw.members
    .map((member) => buildMember(raw, member, billOf.get(member.userId), now))
    .sort((a, b) => {
      const statusOrder = { committed: 0, joined: 1, invited: 2, declined: 3, off_trip: 4 };
      const roleOrder = { organizer: 0, honoree: 1, member: 2 };
      return statusOrder[a.status] - statusOrder[b.status] || roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name);
    });

  const viewer = members.find((member) => member.userId === viewerUserId) ?? null;
  const payerCount = raw.members.filter(isCommittedPayer).length;
  const potential = raw.members.filter(isPotentialPayer);
  const minPayerCount = raw.trip.minHeadcount;
  const sense =
    viewer && !isHonoree(viewer)
      ? sensitivity({
          ...billArgs,
          userId: viewer.userId,
          minimumCommitters: raw.trip.minHeadcount,
          maxHeadcount: raw.trip.maxHeadcount,
        })
      : null;

  const polls: PollView[] = [...raw.polls]
    .sort((a, b) => ["destination", "dates", "activity"].indexOf(a.kind) - ["destination", "dates", "activity"].indexOf(b.kind))
    .map((poll) => {
      const options = raw.options
        .filter((option) => option.pollId === poll.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({
          id: option.id,
          label: option.label,
          estCost: option.estCost,
          link: option.link,
          votes: raw.votes.filter((vote) => vote.pollOptionId === option.id).length,
          votedByMe: !!viewerUserId && raw.votes.some((vote) => vote.pollOptionId === option.id && vote.userId === viewerUserId),
        }));
      return {
        id: poll.id,
        kind: poll.kind,
        deadline: poll.deadline,
        lockedOptionId: poll.lockedOptionId,
        lockedLabel: options.find((option) => option.id === poll.lockedOptionId)?.label ?? null,
        closed: !!poll.lockedOptionId || new Date(now).getTime() >= new Date(poll.deadline).getTime(),
        options,
      };
    });

  const costs: CostView[] = raw.costs.map((cost) => ({
    id: cost.id,
    label: raw.costLabels.find((item) => item.id === cost.id)?.label ?? "Cost",
    category: cost.category,
    splitType: cost.splitType,
    amountCents: cost.amountCents,
    memberId: cost.memberId,
    memberName: cost.memberId ? (nameOf.get(cost.memberId) ?? null) : null,
    participantIds: cost.participantIds,
    participantNames: cost.participantIds.map((id) => nameOf.get(id) ?? "Someone"),
    optedIn: !!viewerUserId && cost.participantIds.includes(viewerUserId),
  }));

  const underMinimum = raw.trip.status === "under_minimum";
  const locked = isBooked(raw.trip.status);
  const notices = buildNotices({ raw, viewer, underMinimum, payerCount, minPayerCount, locked });

  return {
    id: raw.trip.id,
    name: raw.trip.name,
    tripType: raw.trip.tripType,
    dateWindow: raw.trip.dateWindow,
    status: raw.trip.status,
    buyInAmountCents: raw.trip.buyInAmount,
    buyInDeadline: raw.trip.buyInDeadline,
    minHeadcount: raw.trip.minHeadcount,
    maxHeadcount: raw.trip.maxHeadcount,
    bedChangePolicy: raw.trip.bedChangePolicy,
    inviteToken: raw.trip.inviteToken,
    organizerName: raw.members.find((member) => member.role === "organizer")?.name ?? "Organizer",
    guestName: raw.members.find((member) => member.userId === raw.trip.guestOfHonorUserId)?.name ?? "the guest of honor",
    now,
    simulated: raw.trip.simulatedNow !== null,
    viewer,
    isOrganizer: viewer?.role === "organizer",
    members,
    polls,
    costs,
    milestones: [...raw.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
    spots: raw.spots,
    claims: raw.claims,
    termsLocked: buyInTermsLocked(raw),
    buyInOpen: raw.trip.status === "buy_in_open",
    lockedIn: locked,
    underMinimum,
    cancelled: raw.trip.status === "cancelled",
    payerCount,
    potentialPayerCount: potential.length,
    minPayerCount,
    suggestedBuyInCents: lodgingCents(raw.costs),
    sharedCents: sharedEvenCents(raw.costs),
    forfeitedPotCents: forfeitedCents(raw.payments),
    roundingCents: Math.max(
      0,
      bills.filter((bill) => bill.payer).reduce((sum, bill) => sum + bill.totalCents, 0) -
        vendorCents({
          ...billArgs,
          payerIds: raw.members.filter(isCommittedPayer).map((member) => member.userId),
        }),
    ),
    notices,
    nextPayment: viewer ? (nextDue(viewer.lines.filter((line) => line.canPay)) as PayLine | null) : null,
    sensitivityRows: sense?.rows ?? [],
    rebase: previousBills
      ? bills
          .filter((bill) => bill.payer)
          .map((bill) => ({
            userId: bill.userId,
            name: nameOf.get(bill.userId) ?? "Someone",
            beforeCents: previousBills.find((prior) => prior.userId === bill.userId)?.totalCents ?? bill.totalCents,
            afterCents: bill.totalCents,
          }))
      : [],
    currentShareCents: sense?.currentCents ?? viewer?.bill?.totalCents ?? null,
    saveIfOneMoreCents: sense?.ifOneMoreSavesCents ?? null,
    addIfSomeoneDropsCents: sense?.ifSomeoneDropsAddsCents ?? null,
    isDemo: raw.trip.id === DEMO_TRIP_ID,
  };
}

function buildNotices(args: {
  raw: RawTrip;
  viewer: MemberView | null;
  underMinimum: boolean;
  payerCount: number;
  minPayerCount: number;
  locked: boolean;
}): Notice[] {
  const { raw, viewer } = args;
  if (raw.trip.status === "cancelled") {
    return [{ tone: "bad", text: "This trip is cancelled. Buy-ins are marked refunded. No card was ever charged." }];
  }
  const notices: Notice[] = [];
  if (args.underMinimum) {
    notices.push({
      tone: "warn",
      text: `Under the minimum. ${args.payerCount} payers committed and the trip needs ${args.minPayerCount}. Buy-ins are refunded in this test. People who missed the deadline can't rejoin.`,
    });
  }
  if (raw.trip.status === "buy_in_open") {
    notices.push({
      tone: "info",
      text: "The buy-in is part of your share, not a fee on top. It is refundable until the stay is booked, and forfeited only after that. If the crew misses the minimum, or the trip is cancelled before booking, the test payment is refunded.",
    });
  }
  if (viewer?.status === "joined" && raw.trip.status === "buy_in_open") {
    notices.push({
      tone: "warn",
      text: "You haven't committed. When the deadline passes, you're off the trip and you can't rejoin.",
    });
  }
  if (viewer?.status === "off_trip") {
    notices.push({
      tone: "bad",
      text:
        viewer.forfeitedCents > 0
          ? `You're off this trip. ${money(viewer.forfeitedCents)} was forfeited into the base pot. It is not refunded.`
          : "You're off this trip. The deadline has passed, so you can't rejoin.",
    });
  }
  const late = viewer?.lines.find((line) => line.status === "late" && line.amountCents > 0);
  if (late && viewer?.status === "committed" && args.locked) {
    notices.push({
      tone: "warn",
      text: `You're late on ${late.name}. The organizer can move you off. What you've already paid would be forfeited, and it only reduces the base pool.`,
    });
  }
  if (args.locked && args.payerCount < args.minPayerCount) {
    notices.push({
      tone: "info",
      text: "The crew is below the original minimum, but the trip already locked in. Shares were re-split. This is not a refund.",
    });
  }
  return notices;
}

export const loadTripView = cache(async (tripId: string, viewerUserId: string | null): Promise<TripView | null> => {
  await ensureDemoSeed();
  const raw = await loadTrip(tripId);
  if (!raw) return null;
  return buildView(raw, viewerUserId);
});

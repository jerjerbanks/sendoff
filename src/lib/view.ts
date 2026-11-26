import { cache } from "react";
import { money } from "./format";
import { DEMO_TRIP_ID } from "./constants";
import { LAKE_TRIP_ID } from "./constants";
import { formatDay } from "./format";
import { journey as journeyFor, nextStep as nextStepFor, type JourneyStep, type NextStep } from "./next-step";
import { fitForOption, medianWeight, privateFit, type BedOption } from "./budgets";
import {
  buyInTermsLocked,
  ensureDemoSeed,
  isPayerMember,
  listBudgets,
  listFlightQuotes,
  listSpotRequests,
  loadTrip,
  mathMembers,
  travelersOf,
  tripNow,
  type MemberRecord,
  type RawTrip,
  type ShareComfort,
  type SpotRecord,
} from "./store";
import {
  claimedWeight,
  forfeitedCents,
  projectClaims,
  type MathClaim,
  type AgeBand,
  type AgeWeights,
  type SplitMode,
  partySleeps,
  partySpotTravelers,
  isBooked,
  isCommittedPayer,
  isHonoree,
  isPotentialPayer,
  lodgingCents,
  milestoneSchedule,
  nextDue,
  billsFor,
  committedPayerIds,
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
  /** The payer of this member's party. Equal to userId for a payer. */
  partyUserId: string;
  isPayer: boolean;
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
  badge: string | null;
  countLabel: string | null;
  privateLine: string | null;
  hidden: boolean;
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
  agePrices: Partial<Record<AgeBand, number | null>> | null;
  optInTravelerIds: string[];
}

/** A traveler as another party may see them. needsNotes is filled only for the organizer. */
export interface TravelerView {
  id: string;
  name: string;
  ageBand: AgeBand;
  hasAccount: boolean;
  isPayer: boolean;
  isHonoree: boolean;
  honoreeRole: string | null;
  coSleepSpotId: string | null;
  needsNotes: string | null;
}

/** shareComfort* are filled only for the organizer. Budgets are never here. */
export interface PartyView {
  payerUserId: string;
  name: string;
  status: MemberRecord["status"];
  payerName: string;
  isHonoreeOnly: boolean;
  travelers: TravelerView[];
  ageWeight: number;
  bedsNeeded: number;
  shareComfort: ShareComfort | null;
  shareComfortNote: string | null;
  bill: PersonBill | null;
  /** Rooms this party holds, by name. */
  rooms: string[];
}

export interface Notice {
  tone: "info" | "warn" | "bad" | "good";
  text: string;
}

export interface TripView {
  id: string;
  name: string;
  tripType: string;
  preWeddingStyle: string | null;
  /** "Bachelor party for Alex", "Family trip", ... */
  subtitle: string;
  honoreeNames: string[];
  honoreeExcluded: boolean;
  splitMode: SplitMode;
  ageWeights: AgeWeights;
  parties: PartyView[];
  viewerParty: PartyView | null;
  travelerCount: number;
  bedsNeeded: number;
  /**
   * Live lodging price of each spot if a party held it at today's occupancy.
   * An open share slot is priced at half the spot. Null in even split modes.
   */
  spotPrices: Record<string, number> | null;
  lodgingTotalCents: number;
  /** Each paying party's all-in under every lodging split mode, for the before/after. */
  splitPreview: { payerUserId: string; name: string; byMode: Record<SplitMode, number> }[];
  pendingSplitMode: SplitMode | null;
  /** Organizer-facing agreement status. No dollar amounts. */
  splitAcks: { payerUserId: string; name: string; acknowledged: boolean }[];
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
  spots: SpotRecord[];
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
  /** For a party that hasn't committed: its all-in if it committed now. Unofficial below the minimum. */
  ifYouCommitCents: number | null;
  saveIfOneMoreCents: number | null;
  shareLowCents: number | null;
  shareHighCents: number | null;
  addIfSomeoneDropsCents: number | null;
  isDemo: boolean;
  /** Only the viewer's own party: whether it saved a budget. Never another party's. */
  viewerHasBudget: boolean;
  pendingApprovals: number;
  /** Locked destination, else the leading option, else the trip name. */
  place: string;
  nextStep: NextStep;
  journey: JourneyStep[];
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
  if (!isPayerMember(member)) {
    // Account-holders on someone else's party do not pay; their payer does.
    return {
      userId: member.userId,
      partyUserId: member.partyUserId,
      isPayer: false,
      name: member.name,
      contact: member.contact,
      role: member.role,
      status: member.status,
      committedAt: member.committedAt,
      bill: null,
      paidCents: 0,
      forfeitedCents: 0,
      refundedCents: 0,
      balanceCents: 0,
      lines: [],
    };
  }
  const priced = raw.trip.status === "booking_ready" || raw.trip.status === "booked" || raw.trip.status === "buy_in_open";
  if (!priced || member.status === "off_trip" || member.status === "invited") {
    base = historyLines(raw, member.userId);
  } else if (isCommittedPayer(member) && (raw.trip.status === "booking_ready" || raw.trip.status === "booked") && bill) {
    base = milestoneSchedule({
      totalCents: bill.totalCents,
      lodgingCents: bill.lodgingCents,
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
    partyUserId: member.partyUserId,
    isPayer: isPayerMember(member),
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

function buildView(
  raw: RawTrip,
  viewerUserId: string | null,
  budgets: { userId: string; maxAllIn: number; flexNote: string | null; mustHaves: string | null }[],
  quotes: { userId: string; optionId: string; highCents: number }[],
  options: { withSplitPreview?: boolean } = {},
): TripView {
  const now = tripNow(raw);
  const forecastOrder = ["user_taylor", "user_riley", "user_casey", "user_morgan"];
  const membersMath = mathMembers(raw).map((member) => ({
    ...member,
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
    splitMode: raw.trip.splitMode,
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
  const viewerPartyId = viewer?.partyUserId ?? null;
  const payerRecords = raw.members.filter(isPayerMember);
  const payerCount = payerRecords.filter(isCommittedPayer).length;
  const potential = payerRecords.filter(isPotentialPayer);
  const minPayerCount = raw.trip.minHeadcount;
  const viewerPayer = viewerPartyId ? raw.members.find((member) => member.userId === viewerPartyId) : null;
  const sense =
    viewerPayer && !isHonoree(viewerPayer)
      ? sensitivity({
          ...billArgs,
          userId: viewerPayer.userId,
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
        .map((option) => {
          const fit = optionFit(raw, option, budgets, quotes);
          // Private lines go only to the party's payer, the one person who set the budget.
          const line = viewer?.isPayer ? privateLine(raw, option, viewer.userId, budgets, quotes) : null;
          return {
            id: option.id,
            label: option.label,
            estCost: option.estCost,
            link: option.link,
            votes: raw.votes.filter((vote) => vote.pollOptionId === option.id).length,
            votedByMe: !!viewerUserId && raw.votes.some((vote) => vote.pollOptionId === option.id && vote.userId === viewerUserId),
            badge: fit?.label ?? null,
            countLabel: fit?.countLabel ?? null,
            privateLine: line,
            hidden: option.hidden,
          };
        });
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

  const travelerName = new Map(raw.travelers.map((traveler) => [traveler.id, traveler.name]));
  const costs: CostView[] = raw.costs.map((cost) => ({
    id: cost.id,
    label: raw.costLabels.find((item) => item.id === cost.id)?.label ?? "Cost",
    category: cost.category,
    splitType: cost.splitType,
    amountCents: cost.amountCents,
    memberId: cost.memberId,
    memberName: cost.memberId ? (nameOf.get(cost.memberId) ?? null) : null,
    participantIds: cost.participantIds,
    participantNames: cost.optInTravelerIds.map((id) => travelerName.get(id) ?? "Someone"),
    optedIn: !!viewerPartyId && cost.participantIds.includes(viewerPartyId),
    agePrices: cost.agePrices,
    optInTravelerIds: cost.optInTravelerIds,
  }));

  const isOrganizerViewer = viewer?.role === "organizer";
  const partyViews: PartyView[] = raw.parties.map((party) => {
    const payer = raw.members.find((member) => member.userId === party.payerUserId);
    const mine = travelersOf(raw, party.payerUserId);
    const math = membersMath.find((member) => member.userId === party.payerUserId);
    const rooms = [
      ...new Set(
        raw.claims
          .filter((claim) => claim.userId === party.payerUserId && claim.status === "approved")
          .map((claim) => raw.spots.find((spot) => spot.id === claim.spotId)?.roomName ?? "a bed"),
      ),
    ];
    return {
      payerUserId: party.payerUserId,
      name: party.name,
      status: payer?.status ?? "joined",
      payerName: payer?.name ?? party.name,
      isHonoreeOnly: payer?.role === "honoree",
      travelers: mine.map((traveler) => ({
        id: traveler.id,
        name: traveler.name,
        ageBand: traveler.ageBand,
        hasAccount: !!traveler.userId,
        isPayer: traveler.userId === party.payerUserId,
        isHonoree: traveler.isHonoree,
        honoreeRole: traveler.honoreeRole,
        coSleepSpotId: traveler.coSleepSpotId,
        // Organizer-only. A payer also sees their own party's notes; nobody else does.
        needsNotes: isOrganizerViewer || viewerPartyId === party.payerUserId ? traveler.needsNotes : null,
      })),
      ageWeight: math?.ageWeight ?? 1,
      bedsNeeded: partySpotTravelers(mine),
      shareComfort: isOrganizerViewer || viewerPartyId === party.payerUserId ? party.shareComfort : null,
      shareComfortNote: isOrganizerViewer || viewerPartyId === party.payerUserId ? party.shareComfortNote : null,
      bill: billOf.get(party.payerUserId) ?? null,
      rooms,
    };
  });
  const statusRank = { committed: 0, joined: 1, invited: 2, declined: 3, off_trip: 4 };
  partyViews.sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] ||
      Number(b.payerUserId === raw.trip.organizerId) - Number(a.payerUserId === raw.trip.organizerId) ||
      a.name.localeCompare(b.name),
  );
  const activeTravelers = raw.travelers.filter((traveler) => {
    const payer = raw.members.find((member) => member.userId === traveler.partyId);
    return payer && payer.status !== "off_trip" && payer.status !== "declined";
  });
  const honorees = raw.travelers.filter((traveler) => traveler.isHonoree);
  const honoreeNames = honorees.map((traveler) => traveler.name.split(" ")[0] ?? traveler.name);

  const underMinimum = raw.trip.status === "under_minimum";
  const locked = isBooked(raw.trip.status);
  const notices = buildNotices({ raw, viewer, underMinimum, payerCount, minPayerCount, locked });

  return {
    id: raw.trip.id,
    name: raw.trip.name,
    tripType: raw.trip.tripType,
    preWeddingStyle: raw.trip.preWeddingStyle,
    subtitle: tripSubtitle(raw.trip.tripType, raw.trip.preWeddingStyle, honoreeNames),
    honoreeNames,
    honoreeExcluded: raw.trip.honoreeExcluded && honorees.length > 0,
    splitMode: raw.trip.splitMode,
    ageWeights: raw.trip.ageWeights,
    parties: partyViews,
    viewerParty: partyViews.find((party) => party.payerUserId === viewerPartyId) ?? null,
    travelerCount: activeTravelers.length,
    bedsNeeded: partySpotTravelers(activeTravelers),
    spotPrices: raw.trip.splitMode === "weighted_by_spot" ? livePrices(raw) : null,
    splitPreview: (() => {
      // Privacy: a party only gets its own row, so there is nothing to compute without one.
      // Three full re-splits: only the Settings page asks for this.
      if (!viewerPartyId || !options.withSplitPreview) return [];
      const modes: SplitMode[] = ["weighted_by_spot", "even_per_traveler", "even_per_party"];
      const byMode = new Map(modes.map((mode) => [mode, settledBills({ ...billArgs, splitMode: mode })]));
      const rows = bills
        .filter((bill) => bill.payer)
        .map((bill) => ({
          payerUserId: bill.userId,
          name: raw.parties.find((party) => party.payerUserId === bill.userId)?.name ?? nameOf.get(bill.userId) ?? "Party",
          byMode: Object.fromEntries(
            modes.map((mode) => [mode, byMode.get(mode)?.find((item) => item.userId === bill.userId)?.totalCents ?? 0]),
          ) as Record<SplitMode, number>,
        }));
      // Privacy: a party only gets its own before/after in this payload.
      if (viewerPartyId) return rows.filter((row) => row.payerUserId === viewerPartyId);
      return [];
    })(),
    pendingSplitMode: raw.trip.pendingSplitMode,
    splitAcks: (() => {
      const pending = raw.trip.pendingSplitMode;
      const committed = raw.members.filter((member) => member.partyUserId === member.userId && isCommittedPayer(member));
      return committed.map((member) => ({
        payerUserId: member.userId,
        name: raw.parties.find((party) => party.payerUserId === member.userId)?.name ?? member.name,
        acknowledged: pending
          ? raw.splitAcks.some((ack) => ack.payerUserId === member.userId && ack.proposedMode === pending)
          : false,
      }));
    })(),
    lodgingTotalCents: raw.trip.actualLodgingTotal ?? lodgingCents(raw.costs),
    dateWindow: raw.trip.dateWindow,
    status: raw.trip.status,
    buyInAmountCents: raw.trip.buyInAmount,
    buyInDeadline: raw.trip.buyInDeadline,
    minHeadcount: raw.trip.minHeadcount,
    maxHeadcount: raw.trip.maxHeadcount,
    bedChangePolicy: raw.trip.bedChangePolicy,
    inviteToken: raw.trip.inviteToken,
    organizerName: raw.members.find((member) => member.role === "organizer")?.name ?? "Organizer",
    guestName: honoreeNames.length > 0 ? joinNames(honoreeNames) : (raw.members.find((member) => member.userId === raw.trip.guestOfHonorUserId)?.name ?? "the group"),
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
    sharedCents: sharedEvenCents(raw.costs, honoreeIdsOf(raw)),
    forfeitedPotCents: forfeitedCents(raw.payments),
    roundingCents: Math.max(
      0,
      bills.filter((bill) => bill.payer).reduce((sum, bill) => sum + bill.totalCents, 0) -
        vendorCents({
          ...billArgs,
          payerIds: payerRecords.filter(isCommittedPayer).map((member) => member.userId),
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
    // Today's number is the real bill (what /book and the payment schedule use), not the forecast's
    // projection, which assumes every committed party has already picked a bed.
    currentShareCents: (viewerPartyId ? billOf.get(viewerPartyId)?.payer : false)
      ? (billOf.get(viewerPartyId as string)?.totalCents ?? null)
      : (sense?.currentCents ?? null),
    ifYouCommitCents: (() => {
      if (!viewerPayer || isHonoree(viewerPayer) || viewerPayer.status !== "joined") return null;
      const ids = [...committedPayerIds(membersMath), viewerPayer.userId];
      const needs = new Map(membersMath.map((member) => [member.userId, member.spotTravelers ?? 1]));
      return (
        billsFor({ ...billArgs, payerIds: ids, claims: projectClaims(raw.spots, raw.claims, ids, needs) }).find(
          (bill) => bill.userId === viewerPayer.userId,
        )?.totalCents ?? null
      );
    })(),
    saveIfOneMoreCents: sense?.ifOneMoreSavesCents ?? null,
    shareLowCents: flightBand(raw, bills, viewerPartyId, "low"),
    shareHighCents: flightBand(raw, bills, viewerPartyId, "high"),
    addIfSomeoneDropsCents: sense?.ifSomeoneDropsAddsCents ?? null,
    isDemo: raw.trip.id === DEMO_TRIP_ID || raw.trip.id === LAKE_TRIP_ID,
    viewerHasBudget: !!viewerPartyId && budgets.some((budget) => budget.userId === viewerPartyId),
    pendingApprovals: 0,
    place: (() => {
      const destination = polls.find((poll) => poll.kind === "destination");
      if (destination?.lockedLabel) return destination.lockedLabel;
      const leader = destination?.options.filter((option) => !option.hidden).slice().sort((a, b) => b.votes - a.votes)[0];
      return leader && leader.votes > 0 ? leader.label : raw.trip.name;
    })(),
    // Filled in by withNextStep once the pending request count is known.
    nextStep: { eyebrow: "", title: "", body: "", cta: null, href: null, tone: "calm" },
    journey: [],
  };
}

function livePrices(raw: RawTrip): Record<string, number> {
  const lodge = raw.trip.actualLodgingTotal ?? lodgingCents(raw.costs);
  const honoreeParties = new Set(honoreeIdsOf(raw));
  const occupants = (spotId: string) =>
    raw.claims.filter((claim) => claim.spotId === spotId && claim.status === "approved" && !honoreeParties.has(claim.userId)).length;
  const occupied = raw.spots.filter((spot) => !spot.reservedForHonoree && occupants(spot.id) > 0);
  const base = occupied.reduce((sum, spot) => sum + spot.weight, 0);
  const prices: Record<string, number> = {};
  for (const spot of raw.spots) {
    if (spot.reservedForHonoree) continue;
    const taken = occupants(spot.id);
    if (taken === 0) prices[spot.id] = Math.round((lodge * spot.weight) / (base + spot.weight));
    else if (spot.sharingEnabled && taken < (spot.capacity || 2)) prices[spot.id] = Math.round((lodge * spot.weight) / 2 / base);
    else prices[spot.id] = Math.round((lodge * spot.weight) / taken / base);
  }
  return prices;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function honoreeIdsOf(raw: RawTrip): string[] {
  return raw.members.filter((member) => member.role === "honoree").map((member) => member.userId);
}

/** Gender-neutral by default. Only the organizer's chosen style names a bachelor or bachelorette. */
export function tripSubtitle(tripType: string, style: string | null, honorees: string[]): string {
  const who = honorees.length > 0 ? ` for ${joinNames(honorees)}` : "";
  if (tripType === "family") {
    const occasion = style === "bachelor" ? "Bachelor" : style === "bachelorette" ? "Bachelorette" : style === "joint" ? "Joint party" : null;
    if (occasion) return `Family trip · ${occasion}${who}`;
    return honorees.length > 0 ? `Family trip${who}` : "Family trip";
  }
  if (tripType === "pre_wedding" || tripType === "bachelor") {
    if (style === "bachelor") return `Bachelor party${who}`;
    if (style === "bachelorette") return `Bachelorette party${who}`;
    return `Pre-wedding trip${who}`;
  }
  return honorees.length > 0 ? `Group trip${who}` : "Group trip";
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
      text: `Under the minimum. ${args.payerCount} paying ${args.payerCount === 1 ? "party" : "parties"} committed and the trip needs ${args.minPayerCount}. Buy-ins are refunded in this test. Parties who missed the deadline can't rejoin.`,
    });
  }
  if (raw.trip.status === "buy_in_open") {
    notices.push({
      tone: "info",
      text: "The buy-in is part of your share, not a fee on top. It is refundable until the stay is booked, and forfeited only after that. If the group misses the minimum, or the trip is cancelled before booking, the test payment is refunded.",
    });
  }
  if (viewer?.status === "joined" && raw.trip.status === "buy_in_open") {
    notices.push({
      tone: "warn",
      text: viewer.isPayer
        ? "Your party hasn't committed. When the deadline passes, your party is off the trip and can't rejoin."
        : "Your party's payer hasn't bought in yet. When the deadline passes without it, your party is off the trip.",
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
      text: "The group is below the original minimum, but the stay is already booked. Shares were re-split. This is not a refund.",
    });
  }
  return notices;
}

/**
 * One database load per trip per request, shared by every view built from it
 * (the page, the layout, and link-preview metadata). Workers Free allows 10 ms
 * of CPU per request, so a page must not load and reconcile the trip twice.
 */
const loadTripData = cache(async (tripId: string) => {
  await ensureDemoSeed();
  const [raw, budgets, flights, requests] = await Promise.all([
    loadTrip(tripId),
    listBudgets(tripId),
    listFlightQuotes(tripId),
    listSpotRequests(tripId),
  ]);
  if (!raw) return null;
  return { raw, budgets, flights, pending: requests.filter((request) => request.status === "pending").length };
});

export const loadTripView = cache(async (tripId: string, viewerUserId: string | null, withSplitPreview = false): Promise<TripView | null> => {
  const data = await loadTripData(tripId);
  if (!data) return null;
  const view = buildView(data.raw, viewerUserId, data.budgets, data.flights, { withSplitPreview });
  return withNextStep(view, data.pending);
});

/**
 * The view a trip *page* may render: null for someone who isn't on a real trip.
 * The layout shows them "This trip is private", but pages render alongside it and
 * stream their output too, so each page must load through this, never loadTripView.
 */
export async function loadMemberView(tripId: string, viewerUserId: string | null, withSplitPreview = false): Promise<TripView | null> {
  const view = await loadTripView(tripId, viewerUserId, withSplitPreview);
  if (!view) return null;
  if (!view.viewer && view.id !== DEMO_TRIP_ID && view.id !== LAKE_TRIP_ID) return null;
  return view;
}

function optionFit(
  raw: RawTrip,
  option: RawTrip["options"][number],
  budgets: { userId: string; maxAllIn: number }[],
  quotes: { userId: string; optionId: string; highCents: number }[],
) {
  if (option.lodgingEstimate == null) return null;
  const basis = feasibilityBasis(raw);
  if (!basis) return null;
  return fitForOption({
    lodgingCents: option.lodgingEstimate,
    evenPoolCents: basis.even,
    headcount: raw.trip.minHeadcount,
    weightSum: basis.weightSum,
    medianWeight: basis.median,
    people: basis.people.map((person) => ({
      userId: person.userId,
      budgetCents: budgets.find((budget) => budget.userId === person.userId)?.maxAllIn ?? null,
      highFlightCents: highFlight(raw, quotes, person, option.id),
      evenShareCents: basis.evenShare(person.userId),
    })),
  });
}

/** No flights on the trip at all (a drive-in family trip): the flight term is 0. */
function highFlight(
  raw: RawTrip,
  quotes: { userId: string; optionId: string; highCents: number }[],
  person: { userId: string; tripHigh: number | null },
  optionId: string,
): number | null {
  const quoted = quotes.find((quote) => quote.userId === person.userId && quote.optionId === optionId)?.highCents;
  if (quoted != null) return quoted;
  if (person.tripHigh != null) return person.tripHigh;
  const anyFlights = raw.costs.some((cost) => cost.category === "flights" || cost.category === "flight");
  return anyFlights ? null : 0;
}

function privateLine(
  raw: RawTrip,
  option: RawTrip["options"][number],
  viewerId: string,
  budgets: { userId: string; maxAllIn: number; mustHaves: string | null }[],
  quotes: { userId: string; optionId: string; highCents: number }[],
) {
  if (option.lodgingEstimate == null) return null;
  const own = budgets.find((budget) => budget.userId === viewerId);
  const basis = feasibilityBasis(raw);
  const person = basis?.people.find((item) => item.userId === viewerId);
  if (!own || !basis || !person) return null;
  const high = highFlight(raw, quotes, person, option.id);
  if (high == null) return null;
  const need = partySpotTravelers(travelersOf(raw, viewerId));
  const bedOptions = need > 1 ? roomOptions(raw, viewerId, need) : undefined;
  const fit = privateFit({
    lodgingCents: option.lodgingEstimate,
    evenPoolCents: basis.even,
    headcount: raw.trip.minHeadcount,
    weightSum: basis.weightSum,
    medianWeight: basis.median,
    flightCents: high,
    budgetCents: own.maxAllIn,
    wantsOwnRoom: (own.mustHaves ?? "").includes("own_room"),
    evenShareCents: basis.evenShare(viewerId),
    bedOptions,
  });
  const moneyGap = `$${(fit.deltaCents / 100).toFixed(0)}`;
  // "You" is the party: the payer is reading on behalf of everyone they bring.
  const who = need > 1 ? "Your party is" : "You're";
  if (fit.direction === "under") return `${who} ${moneyGap} under`;
  const hints = fit.hints
    .map((hint) => {
      const label = hint.label === "couch" ? "A couch" : hint.label === "shared queen" ? "A shared queen" : `The ${hint.label}`;
      return `${label} gets you under by $${(hint.underByCents / 100).toFixed(0)}${hint.conflictsWithOwnRoom ? " (this gives up your own room)" : ""}`;
    })
    .join("; ");
  const none = need > 1 ? "Even the cheapest room that fits your party is still over." : "Even the cheapest bed is still over.";
  return hints ? `${who} ${moneyGap} over. ${hints}.` : `${who} ${moneyGap} over. ${none}`;
}

/** Rooms that sleep the whole party, as private suggestions. Held rooms for others are left out. */
function roomOptions(raw: RawTrip, partyId: string, need: number): BedOption[] {
  const rooms = new Map<string, SpotRecord[]>();
  for (const spot of raw.spots) {
    if (spot.reservedForHonoree) continue;
    if (spot.reservedForUserId && spot.reservedForUserId !== partyId) continue;
    const key = spot.roomName ?? spot.id;
    rooms.set(key, [...(rooms.get(key) ?? []), spot]);
  }
  return [...rooms.entries()]
    .filter(([, spots]) => spots.reduce((sum, spot) => sum + partySleeps(spot), 0) >= need)
    .map(([name, spots]) => ({ label: name, weight: spots.reduce((sum, spot) => sum + spot.weight, 0), ownRoom: true }))
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 2);
}

/**
 * 6.12 basis at N_ref = minPayers. Paying-eligible parties (not honoree-only,
 * not declined or dropped). Lodging uses forecast placement; the per-head pool
 * uses each party's age weight over W_age of the N_ref parties.
 */
const basisCache = new WeakMap<RawTrip, ReturnType<typeof computeFeasibilityBasis>>();

/** Same raw trip, same basis: computed once per page, not once per poll option. */
function feasibilityBasis(raw: RawTrip) {
  const hit = basisCache.get(raw);
  if (hit !== undefined) return hit;
  const basis = computeFeasibilityBasis(raw);
  basisCache.set(raw, basis);
  return basis;
}

function computeFeasibilityBasis(raw: RawTrip) {
  const honorees = honoreeIdsOf(raw);
  const math = mathMembers(raw);
  const people = raw.members
    .filter(isPayerMember)
    .filter((member) => member.role !== "honoree" && member.status !== "declined" && member.status !== "off_trip")
    .map((member) => ({
      userId: member.userId,
      committedAt: member.committedAt,
      tripHigh: raw.costs.find((cost) => cost.splitType === "individual" && cost.memberId === member.userId)?.highEstimate ?? null,
    }));
  const order = ["user_chris", "user_sam", "user_jordan", "user_drew", "user_taylor", "user_riley", "user_casey", "user_pat"];
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
  const ids = [...people]
    .sort((a, b) => rank(a.userId) - rank(b.userId) || (a.committedAt ?? "~").localeCompare(b.committedAt ?? "~"))
    .slice(0, raw.trip.minHeadcount)
    .map((person) => person.userId);
  if (ids.length < raw.trip.minHeadcount) return null;
  const needs = new Map(math.map((member) => [member.userId, member.spotTravelers ?? 1]));
  const claims = projectClaims(raw.spots, raw.claims, ids, needs);
  const weightSum = claimedWeight(raw.spots, claims, new Set(ids)).reduce((sum, claim) => sum + claim.weight, 0);
  const weights = raw.spots.filter((spot) => !spot.reservedForHonoree).map((spot) => spot.weight);
  const even = sharedEvenCents(raw.costs, honorees);
  const ageOf = (id: string) => math.find((member) => member.userId === id)?.ageWeight ?? 1;
  const ageSum = ids.reduce((sum, id) => sum + ageOf(id), 0);
  /** Per-head pool per unit of age weight at N_ref, times this party's weight. All adults: S_eq / N_ref. */
  const evenShare = (id: string) => (ageSum > 0 ? (even * ageOf(id)) / ageSum : 0);
  return { even, weightSum, median: medianWeight(weights), people, evenShare };
}

/**
 * The viewer's all-in at the low or high end of their flight estimate.
 * Flights are added after rounding, so this is the total plus the fare difference.
 */
function flightBand(raw: RawTrip, bills: PersonBill[], viewerId: string | null, end: "low" | "high") {
  if (!viewerId) return null;
  const flight = raw.costs.find((cost) => cost.splitType === "individual" && cost.memberId === viewerId && cost.lowEstimate && cost.highEstimate);
  if (!flight?.lowEstimate || !flight.highEstimate) return null;
  const bill = bills.find((item) => item.userId === viewerId && item.payer);
  if (!bill) return null;
  return bill.totalCents - flight.amountCents + (end === "low" ? flight.lowEstimate : flight.highEstimate);
}

/** Adds the viewer's next step and journey. Kept separate so the logic stays pure and testable. */
function withNextStep(view: TripView, pendingApprovals: number): TripView {
  const viewer = view.viewer;
  const unvotedPolls = view.polls
    .filter((poll) => !poll.closed && poll.options.some((option) => !option.hidden))
    .filter((poll) => !poll.options.some((option) => option.votedByMe))
    .map((poll) => (poll.kind === "destination" ? "Where" : poll.kind === "dates" ? "When" : "What we'll do"));
  const input = {
    viewer: viewer ? { isPayer: viewer.isPayer, role: viewer.role, status: viewer.status, forfeitedCents: viewer.forfeitedCents } : null,
    payerFirstName: view.viewerParty?.payerName.split(" ")[0] ?? null,
    partySize: view.viewerParty?.travelers.length ?? 1,
    tripStatus: view.status,
    hasBudget: view.viewerHasBudget,
    unvotedPolls: viewer && viewer.status !== "invited" ? unvotedPolls : [],
    hasRoom: (view.viewerParty?.rooms.length ?? 0) > 0,
    buyInLabel: money(view.buyInAmountCents).replace(/\.00$/, ""),
    deadlineLabel: view.buyInDeadline ? formatDay(view.buyInDeadline) : null,
    nextPayment: view.nextPayment
      ? { name: view.nextPayment.name, amountLabel: money(view.nextPayment.amountCents), dueLabel: formatDay(view.nextPayment.dueDate) }
      : null,
    isOrganizer: view.isOrganizer,
    pendingApprovals,
    payerCount: view.payerCount,
    minPayers: view.minPayerCount,
  };
  return { ...view, pendingApprovals, nextStep: nextStepFor(input), journey: journeyFor(input) };
}

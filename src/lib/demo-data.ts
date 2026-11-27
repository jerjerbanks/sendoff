import { DEMO_INVITE_TOKEN, DEMO_TRIP_ID, LAKE_INVITE_TOKEN, LAKE_TRIP_ID } from "./constants";

/**
 * Fixture A: "Scottsdale Golf Weekend" (Demo Narratives v1, Nov 27, 2026).
 * Eight guys, each his own party of one adult. Place, dates and course are locked,
 * so the buy-in is open. Seeded just before the climax: five of the six needed have
 * paid; Chris Delgado has joined and holds the couch but hasn't paid; Ben Walsh and
 * Kyle Brennan never claim a bed or pay, and the deadline moves them off the trip.
 *
 * Settled (6 paid): house $3,600 by bed weight ($600 per 1.0), every extra split
 * among who's in. Evan $1,350 · Jamal $925 · Chris $705 · Marcus $1,165 ·
 * Owen $1,170 · Theo $985 = $6,300 = every line item. All prices are demo estimates.
 */
export const BUY_IN_CENTS = 20_000;

export const demoUsers = [
  { id: "user_marcus", name: "Marcus Hale", contact: "marcus.hale@example.com" },
  { id: "user_evan", name: "Evan Brooks", contact: "evan.brooks@example.com" },
  { id: "user_owen", name: "Owen Park", contact: "owen.park@example.com" },
  { id: "user_jamal", name: "Jamal Wright", contact: "jamal.wright@example.com" },
  { id: "user_theo", name: "Theo Nguyen", contact: "theo.nguyen@example.com" },
  { id: "user_chrisd", name: "Chris Delgado", contact: "chris.delgado@example.com" },
  { id: "user_ben", name: "Ben Walsh", contact: "ben.walsh@example.com" },
  { id: "user_kyle", name: "Kyle Brennan", contact: "kyle.brennan@example.com" },
] as const;

export const demoTrip = {
  id: DEMO_TRIP_ID,
  name: "Scottsdale Golf Weekend",
  tripType: "adult",
  preWeddingStyle: null as string | null,
  organizerId: "user_marcus",
  guestOfHonorUserId: "",
  dateWindow: "Scottsdale, AZ · March 11–14, 2027 (3 nights)",
  status: "buy_in_open",
  buyInAmount: BUY_IN_CENTS,
  // Jan 15, 2027, 11:59 PM CT.
  buyInDeadline: "2027-01-16T05:59:00.000Z",
  minHeadcount: 6,
  maxHeadcount: 8,
  bedChangePolicy: "member_requests",
  honoreeExcludedFromSplit: 0,
  inviteToken: DEMO_INVITE_TOKEN,
  simulatedNow: null as string | null,
  theme: "golf",
};

export const demoMembers = [
  { userId: "user_marcus", role: "organizer", status: "committed", committedAt: "2026-11-18T18:00:00.000Z" },
  { userId: "user_evan", role: "member", status: "committed", committedAt: "2026-11-19T15:00:00.000Z" },
  { userId: "user_owen", role: "member", status: "committed", committedAt: "2026-11-19T20:00:00.000Z" },
  { userId: "user_jamal", role: "member", status: "committed", committedAt: "2026-11-20T16:00:00.000Z" },
  { userId: "user_theo", role: "member", status: "committed", committedAt: "2026-11-21T17:00:00.000Z" },
  { userId: "user_chrisd", role: "member", status: "joined", committedAt: null },
  { userId: "user_ben", role: "member", status: "joined", committedAt: null },
  { userId: "user_kyle", role: "member", status: "joined", committedAt: null },
] as const;

export const demoPolls = [
  { id: "golf_poll_destination", kind: "destination", deadline: "2026-11-20T05:59:00.000Z", lockedOptionId: "golf_opt_scottsdale" },
  { id: "golf_poll_dates", kind: "dates", deadline: "2026-11-20T05:59:00.000Z", lockedOptionId: "golf_opt_mar11" },
  { id: "golf_poll_activity", kind: "activity", deadline: "2026-11-22T05:59:00.000Z", lockedOptionId: "golf_opt_wekopa" },
] as const;

/** Courses carry a per-person green fee so voters see the price before they tap. */
export const demoOptions = [
  { id: "golf_opt_scottsdale", pollId: "golf_poll_destination", label: "Scottsdale, AZ", estCost: 360000, link: "", sortOrder: 0, lodgingEstimate: 360000, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "golf_opt_palm", pollId: "golf_poll_destination", label: "Palm Springs, CA", estCost: 420000, link: "", sortOrder: 1, lodgingEstimate: 420000, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "golf_opt_mar11", pollId: "golf_poll_dates", label: "March 11–14, 2027", estCost: 0, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "golf_opt_mar18", pollId: "golf_poll_dates", label: "March 18–21, 2027", estCost: 0, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "golf_opt_tpc", pollId: "golf_poll_activity", label: "TPC Scottsdale — Stadium Course", estCost: 0, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: 45_000 },
  { id: "golf_opt_wekopa", pollId: "golf_poll_activity", label: "We-Ko-Pa — Cholla Course, Fountain Hills", estCost: 0, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: 25_000 },
  { id: "golf_opt_grayhawk", pollId: "golf_poll_activity", label: "Grayhawk — Talon Course, Scottsdale", estCost: 0, link: "", sortOrder: 2, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: 19_000 },
  { id: "golf_opt_papago", pollId: "golf_poll_activity", label: "Papago Golf Club, Phoenix", estCost: 0, link: "", sortOrder: 3, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: 9_000 },
] as const;

const votePairs: [string, string][] = [
  ["golf_opt_scottsdale", "user_marcus"],
  ["golf_opt_scottsdale", "user_evan"],
  ["golf_opt_scottsdale", "user_owen"],
  ["golf_opt_scottsdale", "user_jamal"],
  ["golf_opt_scottsdale", "user_theo"],
  ["golf_opt_scottsdale", "user_chrisd"],
  ["golf_opt_scottsdale", "user_ben"],
  ["golf_opt_palm", "user_kyle"],
  ["golf_opt_mar11", "user_marcus"],
  ["golf_opt_mar11", "user_evan"],
  ["golf_opt_mar11", "user_owen"],
  ["golf_opt_mar11", "user_jamal"],
  ["golf_opt_mar11", "user_theo"],
  ["golf_opt_mar11", "user_chrisd"],
  ["golf_opt_mar18", "user_ben"],
  ["golf_opt_mar18", "user_kyle"],
  ["golf_opt_tpc", "user_evan"],
  ["golf_opt_tpc", "user_owen"],
  ["golf_opt_wekopa", "user_marcus"],
  ["golf_opt_wekopa", "user_jamal"],
  ["golf_opt_wekopa", "user_theo"],
  ["golf_opt_wekopa", "user_chrisd"],
  ["golf_opt_grayhawk", "user_ben"],
  ["golf_opt_papago", "user_kyle"],
];

export const demoVotes = votePairs.map(([optionId, userId]) => ({ optionId, userId }));

/** Flights stay with each person and are not in this split. */
export const demoCosts = [
  { id: "golf_cost_house", label: "Vista Ridge House — 3 nights", category: "lodging", splitType: "shared", amount: 360_000, memberId: null, isLodging: 1 },
  { id: "golf_cost_greens", label: "Green fees — We-Ko-Pa Cholla ($250 a person)", category: "activities", splitType: "shared", amount: 150_000, memberId: null, isLodging: 0 },
  { id: "golf_cost_topgolf", label: "Topgolf Scottsdale — range night", category: "activities", splitType: "optional", amount: 22_500, memberId: null, isLodging: 0 },
  { id: "golf_cost_steak", label: "Saturday steak dinner", category: "food", splitType: "optional", amount: 57_000, memberId: null, isLodging: 0 },
  { id: "golf_cost_cabana", label: "Pool day and cabana", category: "activities", splitType: "optional", amount: 24_000, memberId: null, isLodging: 0 },
  { id: "golf_cost_spring", label: "Cactus League Spring Training game", category: "activities", splitType: "optional", amount: 16_500, memberId: null, isLodging: 0 },
  { id: "golf_cost_hike", label: "Camelback Mountain hike", category: "activities", splitType: "optional", amount: 0, memberId: null, isLodging: 0 },
] as const;

const SIX = ["user_marcus", "user_evan", "user_owen", "user_jamal", "user_theo", "user_chrisd"];

/** Who is in on each extra, by payer. Every extra divides evenly among them. Everyone plays the locked course. */
export const demoParticipants: Record<string, readonly string[]> = {
  golf_cost_topgolf: ["user_marcus", "user_evan", "user_owen", "user_jamal", "user_theo"],
  golf_cost_steak: SIX,
  golf_cost_cabana: ["user_evan", "user_owen", "user_theo", "user_chrisd"],
  golf_cost_spring: ["user_marcus", "user_jamal", "user_theo"],
  golf_cost_hike: ["user_marcus", "user_jamal", "user_chrisd"],
};

/** Weights follow bed type: king with a private bath 1.5, queen 1.2, bunk 0.8, couch 0.5. */
export const demoSpots = [
  { id: "golf_spot_master", roomName: "Master suite", bedType: "king", privateBath: 1, privateRoom: 1, weight: 1500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 1 },
  { id: "golf_spot_bed2", roomName: "Bedroom 2", bedType: "queen", privateBath: 0, privateRoom: 1, weight: 1200, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 2 },
  { id: "golf_spot_bed3", roomName: "Bedroom 3", bedType: "queen", privateBath: 0, privateRoom: 1, weight: 1200, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 3 },
  { id: "golf_spot_bed4", roomName: "Bedroom 4", bedType: "queen", privateBath: 0, privateRoom: 1, weight: 1200, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 4 },
  { id: "golf_spot_bunk1", roomName: "Bunk room", bedType: "bunk", privateBath: 0, privateRoom: 0, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 5 },
  { id: "golf_spot_bunk2", roomName: "Bunk room", bedType: "bunk", privateBath: 0, privateRoom: 0, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 6 },
  { id: "golf_spot_bunk3", roomName: "Bunk room", bedType: "bunk", privateBath: 0, privateRoom: 0, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 7 },
  { id: "golf_spot_couch", roomName: "Den couch", bedType: "couch", privateBath: 0, privateRoom: 0, weight: 500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 8 },
] as const;

export const demoClaims = [
  { spotId: "golf_spot_master", userId: "user_evan", status: "approved" },
  { spotId: "golf_spot_bed2", userId: "user_marcus", status: "approved" },
  { spotId: "golf_spot_bed3", userId: "user_owen", status: "approved" },
  { spotId: "golf_spot_bunk1", userId: "user_jamal", status: "approved" },
  { spotId: "golf_spot_bunk2", userId: "user_theo", status: "approved" },
  { spotId: "golf_spot_couch", userId: "user_chrisd", status: "approved" },
] as const;

/** Lodging share is 50% of each person's house share only; the balance absorbs the rest. */
export const demoMilestones = [
  { id: "golf_ms_buyin", name: "Buy-in", dueDate: "2027-01-16T05:59:00.000Z", kind: "buy_in", amountRule: "fixed", amount: BUY_IN_CENTS, sortOrder: 0 },
  { id: "golf_ms_lodging", name: "Lodging share", dueDate: "2027-02-13T05:59:00.000Z", kind: "installment", amountRule: "pct_of_lodging", amount: 50, sortOrder: 1 },
  { id: "golf_ms_final", name: "Balance", dueDate: "2027-02-27T05:59:00.000Z", kind: "final", amountRule: "fixed", amount: 0, sortOrder: 2 },
] as const;

export const demoPayments = [
  { id: "golf_pay_marcus", milestoneId: "golf_ms_buyin", userId: "user_marcus", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-18T18:00:00.000Z" },
  { id: "golf_pay_evan", milestoneId: "golf_ms_buyin", userId: "user_evan", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T15:00:00.000Z" },
  { id: "golf_pay_owen", milestoneId: "golf_ms_buyin", userId: "user_owen", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T20:00:00.000Z" },
  { id: "golf_pay_jamal", milestoneId: "golf_ms_buyin", userId: "user_jamal", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-20T16:00:00.000Z" },
  { id: "golf_pay_theo", milestoneId: "golf_ms_buyin", userId: "user_theo", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-21T17:00:00.000Z" },
] as const;

/**
 * Private. Evan set $1,250 and his all-in is $1,350: only Evan ever sees "$100 over".
 * Marcus, the organizer, never sees it or Evan's $1,250.
 */
export const demoBudgets = [
  { userId: "user_marcus", maxAllIn: 150000, flexNote: null, mustHaves: "" },
  { userId: "user_evan", maxAllIn: 125000, flexNote: null, mustHaves: "" },
  { userId: "user_owen", maxAllIn: 140000, flexNote: null, mustHaves: "" },
  { userId: "user_jamal", maxAllIn: 110000, flexNote: null, mustHaves: "" },
  { userId: "user_theo", maxAllIn: 110000, flexNote: null, mustHaves: "" },
  { userId: "user_chrisd", maxAllIn: 90000, flexNote: null, mustHaves: "" },
] as const;

/**
 * Fixture B, spec 2.0.1 section 7.1.2: "Harper Lake House".
 * Four paying parties, ten travelers, zero honorees, everyone drives.
 * Official all-in: Harpers $1,922 / Chens $915 / Riveras $1,036 / Kim $639.
 */
export const LAKE_BUY_IN_CENTS = 10_000;

export const lakeUsers = [
  { id: "user_maya", name: "Maya Harper", contact: "maya@example.com" },
  { id: "user_alexh", name: "Alex Harper", contact: "alex.harper@example.com" },
  { id: "user_priya", name: "Priya Chen", contact: "priya@example.com" },
  { id: "user_luis", name: "Luis Chen", contact: "luis@example.com" },
  { id: "user_helen", name: "Helen Rivera", contact: "helen@example.com" },
  { id: "user_noah", name: "Noah Kim", contact: "noah@example.com" },
] as const;

export const lakeTrip = {
  id: LAKE_TRIP_ID,
  name: "Harper Lake House",
  tripType: "family",
  preWeddingStyle: null as string | null,
  organizerId: "user_maya",
  guestOfHonorUserId: "",
  dateWindow: "Lake Geneva, WI · July 1–5, 2027 (4 nights)",
  status: "booking_ready",
  buyInAmount: LAKE_BUY_IN_CENTS,
  buyInDeadline: "2027-04-16T04:59:00.000Z",
  minHeadcount: 3,
  maxHeadcount: 10,
  bedChangePolicy: "member_requests",
  honoreeExcludedFromSplit: 0,
  inviteToken: LAKE_INVITE_TOKEN,
  simulatedNow: null as string | null,
  /** Lake & cabin. Stored so no option title can ever turn this into a golf trip. */
  theme: "outdoors",
};

/** Payers have partyUserId null. Other account-holders point at their payer. */
export const lakeMembers = [
  { userId: "user_maya", role: "organizer", status: "committed", committedAt: "2026-11-10T18:00:00.000Z", partyUserId: null },
  { userId: "user_alexh", role: "member", status: "committed", committedAt: null, partyUserId: "user_maya" },
  { userId: "user_priya", role: "member", status: "committed", committedAt: "2026-11-12T18:00:00.000Z", partyUserId: null },
  { userId: "user_luis", role: "member", status: "committed", committedAt: null, partyUserId: "user_priya" },
  { userId: "user_helen", role: "member", status: "committed", committedAt: "2026-11-13T18:00:00.000Z", partyUserId: null },
  { userId: "user_noah", role: "member", status: "committed", committedAt: "2026-11-15T18:00:00.000Z", partyUserId: null },
] as const;

export const lakeParties = [
  { payerUserId: "user_maya", name: "Harpers", shareComfort: "no_share", shareComfortNote: null },
  { payerUserId: "user_priya", name: "Chens", shareComfort: "any", shareComfortNote: null },
  { payerUserId: "user_helen", name: "Riveras", shareComfort: "no_share", shareComfortNote: null },
  { payerUserId: "user_noah", name: "Kim", shareComfort: "any", shareComfortNote: null },
] as const;

export const lakeTravelers = [
  { id: "trav_maya", partyUserId: "user_maya", name: "Maya Harper", ageBand: "adult", userId: "user_maya", needsNotes: null, sortOrder: 0 },
  { id: "trav_alexh", partyUserId: "user_maya", name: "Alex Harper", ageBand: "adult", userId: "user_alexh", needsNotes: null, sortOrder: 1 },
  { id: "trav_rileyh", partyUserId: "user_maya", name: "Riley Harper", ageBand: "teen", userId: null, needsNotes: null, sortOrder: 2 },
  { id: "trav_quinn", partyUserId: "user_maya", name: "Quinn Harper", ageBand: "child", userId: null, needsNotes: null, sortOrder: 3 },
  { id: "trav_priya", partyUserId: "user_priya", name: "Priya Chen", ageBand: "adult", userId: "user_priya", needsNotes: null, sortOrder: 0 },
  { id: "trav_luis", partyUserId: "user_priya", name: "Luis Chen", ageBand: "adult", userId: "user_luis", needsNotes: null, sortOrder: 1 },
  { id: "trav_noor", partyUserId: "user_priya", name: "Noor Chen", ageBand: "infant", userId: null, needsNotes: "Sleeps in a travel crib.", sortOrder: 2 },
  { id: "trav_helen", partyUserId: "user_helen", name: "Helen Rivera", ageBand: "adult", userId: "user_helen", needsNotes: null, sortOrder: 0 },
  { id: "trav_george", partyUserId: "user_helen", name: "George Rivera", ageBand: "adult", userId: null, needsNotes: "Mobility — needs a ground-floor room, no stairs.", sortOrder: 1 },
  { id: "trav_noah", partyUserId: "user_noah", name: "Noah Kim", ageBand: "adult", userId: "user_noah", needsNotes: null, sortOrder: 0 },
] as const;

export const lakePolls = [
  { id: "lake_poll_destination", kind: "destination", deadline: "2026-11-20T05:59:00.000Z", lockedOptionId: "lake_opt_geneva" },
  { id: "lake_poll_dates", kind: "dates", deadline: "2026-11-20T05:59:00.000Z", lockedOptionId: "lake_opt_july1" },
  { id: "lake_poll_activity", kind: "activity", deadline: "2026-11-20T05:59:00.000Z", lockedOptionId: "lake_opt_boat" },
] as const;

export const lakeOptions = [
  { id: "lake_opt_geneva", pollId: "lake_poll_destination", label: "Lake Geneva, WI", estCost: 320000, link: "", sortOrder: 0, lodgingEstimate: 320000, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "lake_opt_door", pollId: "lake_poll_destination", label: "Door County, WI", estCost: 380000, link: "", sortOrder: 1, lodgingEstimate: 380000, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "lake_opt_july1", pollId: "lake_poll_dates", label: "July 1–5, 2027", estCost: 0, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "lake_opt_aug", pollId: "lake_poll_dates", label: "August 5–9, 2027", estCost: 0, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "lake_opt_boat", pollId: "lake_poll_activity", label: "Lake boat day", estCost: 51000, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
  { id: "lake_opt_icecream", pollId: "lake_poll_activity", label: "Town ice cream night", estCost: 12000, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0, perPersonCents: null },
] as const;

const lakeVotePairs: [string, string][] = [
  ["lake_opt_geneva", "user_maya"],
  ["lake_opt_geneva", "user_alexh"],
  ["lake_opt_geneva", "user_priya"],
  ["lake_opt_door", "user_luis"],
  ["lake_opt_geneva", "user_helen"],
  ["lake_opt_geneva", "user_noah"],
  ["lake_opt_july1", "user_maya"],
  ["lake_opt_july1", "user_priya"],
  ["lake_opt_july1", "user_helen"],
  ["lake_opt_aug", "user_noah"],
  ["lake_opt_boat", "user_maya"],
  ["lake_opt_boat", "user_priya"],
  ["lake_opt_boat", "user_helen"],
  ["lake_opt_icecream", "user_noah"],
];

export const lakeVotes = lakeVotePairs.map(([optionId, userId]) => ({ optionId, userId }));

/** Boat day amount is derived from age prices of opted-in travelers on read. */
export const lakeCosts = [
  { id: "lake_cost_house", label: "Lake house — 4 nights", category: "lodging", splitType: "shared", amount: 320_000, memberId: null, isLodging: 1, agePriceAdult: null, agePriceTeen: null, agePriceChild: null, agePriceInfant: null },
  { id: "lake_cost_fund", label: "House groceries and fund", category: "other", splitType: "shared", amount: 80_000, memberId: null, isLodging: 0, agePriceAdult: null, agePriceTeen: null, agePriceChild: null, agePriceInfant: null },
  { id: "lake_cost_boat", label: "Lake boat day", category: "activities", splitType: "optional", amount: 51_000, memberId: null, isLodging: 0, agePriceAdult: 6_000, agePriceTeen: 6_000, agePriceChild: 3_000, agePriceInfant: 0 },
] as const;

export const lakeBoatRiders = [
  "trav_maya",
  "trav_alexh",
  "trav_rileyh",
  "trav_quinn",
  "trav_priya",
  "trav_luis",
  "trav_helen",
  "trav_george",
  "trav_noah",
] as const;

export const lakeSpots = [
  { id: "lake_spot_suite", roomName: "Ground-floor suite", bedType: "king", privateBath: 1, privateRoom: 1, weight: 1500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 1, groundFloor: 1, noStairs: 1, accessibleBath: 1, cribSpace: 0, reservedForUserId: "user_helen" },
  { id: "lake_spot_lake", roomName: "Lake bedroom", bedType: "queen", privateBath: 1, privateRoom: 1, weight: 1250, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 2, groundFloor: 0, noStairs: 0, accessibleBath: 0, cribSpace: 1, reservedForUserId: null },
  { id: "lake_spot_fam_q", roomName: "Family bedroom", bedType: "queen", privateBath: 0, privateRoom: 1, weight: 1250, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 3, groundFloor: 0, noStairs: 0, accessibleBath: 0, cribSpace: 0, reservedForUserId: null },
  { id: "lake_spot_fam_t1", roomName: "Family bedroom", bedType: "twin", privateBath: 0, privateRoom: 1, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 4, groundFloor: 0, noStairs: 0, accessibleBath: 0, cribSpace: 0, reservedForUserId: null },
  { id: "lake_spot_fam_t2", roomName: "Family bedroom", bedType: "twin", privateBath: 0, privateRoom: 1, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 5, groundFloor: 0, noStairs: 0, accessibleBath: 0, cribSpace: 0, reservedForUserId: null },
  { id: "lake_spot_loft", roomName: "Loft", bedType: "queen", privateBath: 0, privateRoom: 0, weight: 1000, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 6, groundFloor: 0, noStairs: 0, accessibleBath: 0, cribSpace: 0, reservedForUserId: null },
] as const;

export const lakeClaims = [
  { spotId: "lake_spot_suite", userId: "user_helen", status: "approved" },
  { spotId: "lake_spot_lake", userId: "user_priya", status: "approved" },
  { spotId: "lake_spot_fam_q", userId: "user_maya", status: "approved" },
  { spotId: "lake_spot_fam_t1", userId: "user_maya", status: "approved" },
  { spotId: "lake_spot_fam_t2", userId: "user_maya", status: "approved" },
  { spotId: "lake_spot_loft", userId: "user_noah", status: "approved" },
] as const;

/** Lodging share is 50% of the party's lodging cost only; the balance absorbs the rest. */
export const lakeMilestones = [
  { id: "lake_ms_buyin", name: "Buy-in", dueDate: "2027-04-16T04:59:00.000Z", kind: "buy_in", amountRule: "fixed", amount: LAKE_BUY_IN_CENTS, sortOrder: 0 },
  { id: "lake_ms_lodging", name: "Lodging share", dueDate: "2027-05-16T04:59:00.000Z", kind: "installment", amountRule: "pct_of_lodging", amount: 50, sortOrder: 1 },
  { id: "lake_ms_final", name: "Balance", dueDate: "2027-06-16T04:59:00.000Z", kind: "final", amountRule: "fixed", amount: 0, sortOrder: 2 },
] as const;

export const lakePayments = [
  { id: "lake_pay_maya", milestoneId: "lake_ms_buyin", userId: "user_maya", amount: LAKE_BUY_IN_CENTS, status: "paid", paidAt: "2026-11-10T18:00:00.000Z" },
  { id: "lake_pay_priya", milestoneId: "lake_ms_buyin", userId: "user_priya", amount: LAKE_BUY_IN_CENTS, status: "paid", paidAt: "2026-11-12T18:00:00.000Z" },
  { id: "lake_pay_helen", milestoneId: "lake_ms_buyin", userId: "user_helen", amount: LAKE_BUY_IN_CENTS, status: "paid", paidAt: "2026-11-13T18:00:00.000Z" },
  { id: "lake_pay_noah", milestoneId: "lake_ms_buyin", userId: "user_noah", amount: LAKE_BUY_IN_CENTS, status: "paid", paidAt: "2026-11-15T18:00:00.000Z" },
] as const;

/** Private. Never sent to another party's browser, the organizer included. */
export const lakeBudgets = [
  { userId: "user_maya", maxAllIn: 240000, flexNote: null, mustHaves: "" },
  { userId: "user_priya", maxAllIn: 120000, flexNote: null, mustHaves: "crib_space" },
  { userId: "user_helen", maxAllIn: 140000, flexNote: null, mustHaves: "" },
  { userId: "user_noah", maxAllIn: 80000, flexNote: null, mustHaves: "" },
] as const;

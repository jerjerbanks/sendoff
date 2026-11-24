import { DEMO_INVITE_TOKEN, DEMO_TRIP_ID, LAKE_INVITE_TOKEN, LAKE_TRIP_ID } from "./constants";

/**
 * Fixture A, spec 2.0.1 section 7.1.1. Each single adult is their own party of
 * one adult traveler; travelers are read from the payer when no rows exist.
 * Seed from spec v1.2 section 7.1.
 * Lodging $2,400 by bed weight. Equal-shared pool $890 (activities $600 + Alex's
 * flight $290). Tee times $480 optional for Chris, Sam, Jordan, and Drew.
 * Flights are individual. min 5, max 8. Bedroom 3's queen can be shared.
 */
export const BUY_IN_CENTS = 15_000;
export const CHRIS_FLIGHT_CENTS = 28_000;
export const TEE_TIME_CENTS = 48_000;
export const BASE_POOL_CENTS = 329_000;

export const demoUsers = [
  { id: "user_chris", name: "Chris Hale", contact: "chris@example.com" },
  { id: "user_alex", name: "Alex Mora", contact: "alex@example.com" },
  { id: "user_sam", name: "Sam Okonkwo", contact: "sam@example.com" },
  { id: "user_jordan", name: "Jordan Ellis", contact: "jordan@example.com" },
  { id: "user_drew", name: "Drew Patel", contact: "drew@example.com" },
  { id: "user_taylor", name: "Taylor Nguyen", contact: "taylor@example.com" },
  { id: "user_riley", name: "Riley Chen", contact: "riley@example.com" },
  { id: "user_morgan", name: "Morgan Blake", contact: "morgan@example.com" },
  { id: "user_casey", name: "Casey Brooks", contact: "casey@example.com" },
  { id: "user_pat", name: "Pat Alvarez", contact: "pat@example.com" },
] as const;

export const demoTrip = {
  id: DEMO_TRIP_ID,
  name: "Alex's Bachelor Party",
  tripType: "pre_wedding",
  preWeddingStyle: "bachelor",
  organizerId: "user_chris",
  guestOfHonorUserId: "user_alex",
  dateWindow: "A long weekend in May 2027",
  status: "buy_in_open",
  buyInAmount: BUY_IN_CENTS,
  buyInDeadline: "2026-12-16T05:59:00.000Z",
  minHeadcount: 5,
  /** Travelers: 8 paying adults + 1 honoree. */
  maxHeadcount: 9,
  bedChangePolicy: "member_requests",
  honoreeExcludedFromSplit: 1,
  inviteToken: DEMO_INVITE_TOKEN,
  simulatedNow: null as string | null,
};

export const demoMembers = [
  { userId: "user_chris", role: "organizer", status: "committed", committedAt: "2026-11-18T18:00:00.000Z" },
  { userId: "user_alex", role: "honoree", status: "committed", committedAt: "2026-11-18T18:00:00.000Z" },
  { userId: "user_sam", role: "member", status: "committed", committedAt: "2026-11-19T15:00:00.000Z" },
  { userId: "user_jordan", role: "member", status: "committed", committedAt: "2026-11-19T20:00:00.000Z" },
  { userId: "user_drew", role: "member", status: "committed", committedAt: "2026-11-20T16:00:00.000Z" },
  { userId: "user_taylor", role: "member", status: "joined", committedAt: null },
  { userId: "user_riley", role: "member", status: "joined", committedAt: null },
  { userId: "user_casey", role: "member", status: "invited", committedAt: null },
  { userId: "user_morgan", role: "member", status: "declined", committedAt: null },
] as const;

export const demoPolls = [
  { id: "poll_destination", kind: "destination", deadline: "2026-12-09T05:59:00.000Z", lockedOptionId: null },
  { id: "poll_dates", kind: "dates", deadline: "2026-12-11T05:59:00.000Z", lockedOptionId: null },
  { id: "poll_activity", kind: "activity", deadline: "2026-12-13T05:59:00.000Z", lockedOptionId: null },
] as const;

export const demoOptions = [
  { id: "opt_nash", pollId: "poll_destination", label: "Nashville", estCost: 240000, link: "https://www.visitmusiccity.com", sortOrder: 0, lodgingEstimate: 240000, hiddenByOrganizer: 0 },
  { id: "opt_austin", pollId: "poll_destination", label: "Austin", estCost: 220000, link: "https://www.austintexas.org", sortOrder: 1, lodgingEstimate: 220000, hiddenByOrganizer: 0 },
  { id: "opt_scotts", pollId: "poll_destination", label: "Scottsdale", estCost: 200000, link: "https://www.experiencescottsdale.com", sortOrder: 2, lodgingEstimate: 200000, hiddenByOrganizer: 0 },
  { id: "opt_cabo", pollId: "poll_destination", label: "Cabo", estCost: 420000, link: "https://www.visitloscabos.travel", sortOrder: 3, lodgingEstimate: 420000, hiddenByOrganizer: 0 },
  { id: "opt_may14", pollId: "poll_dates", label: "May 14–17, 2027", estCost: 0, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "opt_may21", pollId: "poll_dates", label: "May 21–24, 2027", estCost: 0, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "opt_brew", pollId: "poll_activity", label: "Brewery day", estCost: 60000, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "opt_tee", pollId: "poll_activity", label: "Golf / tee times", estCost: 48000, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "opt_show", pollId: "poll_activity", label: "Dinner and a show", estCost: 80000, link: "", sortOrder: 2, lodgingEstimate: null, hiddenByOrganizer: 0 },
] as const;

export const demoBudgets = [
  { userId: "user_chris", maxAllIn: 200000, flexNote: null, mustHaves: "" },
  { userId: "user_sam", maxAllIn: 180000, flexNote: null, mustHaves: "" },
  { userId: "user_jordan", maxAllIn: 150000, flexNote: null, mustHaves: "golf" },
  { userId: "user_drew", maxAllIn: 140000, flexNote: null, mustHaves: "" },
  { userId: "user_taylor", maxAllIn: 130000, flexNote: null, mustHaves: "" },
  { userId: "user_riley", maxAllIn: 160000, flexNote: null, mustHaves: "" },
] as const;

/** Destination highs that differ from the Nashville trip-level high. */
export const demoQuotes = [
  ["user_chris", "opt_scotts", 31000],
  ["user_sam", "opt_scotts", 35000],
  ["user_jordan", "opt_scotts", 29000],
  ["user_drew", "opt_scotts", 32000],
  ["user_taylor", "opt_scotts", 28000],
  ["user_riley", "opt_scotts", 33000],
  ["user_casey", "opt_scotts", 32000],
  ["user_pat", "opt_scotts", 32000],
  ["user_alex", "opt_scotts", 33000],
  // Austin highs: spec 2.0 adds these (the v1.3 gap). Austin badge = Fits everyone.
  ["user_chris", "opt_austin", 33000],
  ["user_sam", "opt_austin", 28000],
  ["user_jordan", "opt_austin", 30000],
  ["user_drew", "opt_austin", 35000],
  ["user_taylor", "opt_austin", 20000],
  ["user_riley", "opt_austin", 34000],
  ["user_casey", "opt_austin", 33000],
  ["user_pat", "opt_austin", 36000],
  ["user_alex", "opt_austin", 34000],
  ["user_chris", "opt_cabo", 70000],
  ["user_sam", "opt_cabo", 72000],
  ["user_jordan", "opt_cabo", 58000],
  ["user_drew", "opt_cabo", 65000],
  ["user_taylor", "opt_cabo", 36000],
  ["user_riley", "opt_cabo", 64000],
  ["user_casey", "opt_cabo", 60000],
  ["user_pat", "opt_cabo", 62000],
  ["user_alex", "opt_cabo", 65000],
] as const;

export const demoAirports: Record<string, { airport: string; low: number; high: number }> = {
  user_chris: { airport: "ORD", low: 25000, high: 31000 },
  user_sam: { airport: "DEN", low: 27000, high: 35000 },
  user_jordan: { airport: "ATL", low: 21000, high: 29000 },
  user_drew: { airport: "DTW", low: 25000, high: 34000 },
  user_taylor: { airport: "IAH", low: 23000, high: 31000 },
  user_riley: { airport: "CLT", low: 26000, high: 34000 },
  user_casey: { airport: "MSP", low: 25000, high: 32000 },
  user_pat: { airport: "PHL", low: 24000, high: 32000 },
  user_alex: { airport: "", low: 25000, high: 33000 },
};

const votePairs: [string, string][] = [
  ["opt_nash", "user_chris"],
  ["opt_nash", "user_sam"],
  ["opt_nash", "user_jordan"],
  ["opt_austin", "user_drew"],
  ["opt_nash", "user_taylor"],
  ["opt_scotts", "user_riley"],
  ["opt_austin", "user_alex"],
  ["opt_may14", "user_chris"],
  ["opt_may14", "user_sam"],
  ["opt_may14", "user_jordan"],
  ["opt_may21", "user_drew"],
  ["opt_may14", "user_taylor"],
  ["opt_may21", "user_riley"],
  ["opt_may14", "user_alex"],
  ["opt_brew", "user_chris"],
  ["opt_tee", "user_sam"],
  ["opt_brew", "user_jordan"],
  ["opt_tee", "user_drew"],
  ["opt_show", "user_taylor"],
  ["opt_brew", "user_riley"],
  ["opt_brew", "user_alex"],
];

export const demoVotes = votePairs.map(([optionId, userId]) => ({ optionId, userId }));

export const demoCosts = [
  { id: "cost_lodge", label: "Airbnb — 4 nights", category: "lodging", splitType: "shared", amount: 240_000, memberId: null, isLodging: 1 },
  { id: "cost_activities", label: "House activities fund", category: "activities", splitType: "shared", amount: 60_000, memberId: null, isLodging: 0 },
  { id: "cost_alex_flight", label: "Alex's flight (group covers)", category: "flights", splitType: "individual", amount: 29_000, memberId: "user_alex", isLodging: 0 },
  { id: "cost_tee", label: "Tee times", category: "tee_times", splitType: "optional", amount: TEE_TIME_CENTS, memberId: null, isLodging: 0 },
  { id: "cost_chris_flight", label: "Chris's flight", category: "flights", splitType: "individual", amount: 28_000, memberId: "user_chris", isLodging: 0 },
  { id: "cost_sam_flight", label: "Sam's flight", category: "flights", splitType: "individual", amount: 31_000, memberId: "user_sam", isLodging: 0 },
  { id: "cost_jordan_flight", label: "Jordan's flight", category: "flights", splitType: "individual", amount: 25_000, memberId: "user_jordan", isLodging: 0 },
  { id: "cost_drew_flight", label: "Drew's flight", category: "flights", splitType: "individual", amount: 29_500, memberId: "user_drew", isLodging: 0 },
  { id: "cost_taylor_flight", label: "Taylor's flight", category: "flights", splitType: "individual", amount: 27_000, memberId: "user_taylor", isLodging: 0 },
  { id: "cost_riley_flight", label: "Riley's flight", category: "flights", splitType: "individual", amount: 30_000, memberId: "user_riley", isLodging: 0 },
  { id: "cost_casey_flight", label: "Casey's flight", category: "flights", splitType: "individual", amount: 28_500, memberId: "user_casey", isLodging: 0 },
  { id: "cost_pat_flight", label: "Pat's flight estimate", category: "flights", splitType: "individual", amount: 28_000, memberId: "user_pat", isLodging: 0 },
] as const;

export const demoSpots = [
  { id: "spot_master", roomName: "Master suite", bedType: "king", privateBath: 1, privateRoom: 1, weight: 1500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 1, sortOrder: 1 },
  { id: "spot_bed2", roomName: "Bedroom 2", bedType: "queen", privateBath: 1, privateRoom: 1, weight: 1500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 2 },
  { id: "spot_bed3", roomName: "Bedroom 3", bedType: "queen", privateBath: 0, privateRoom: 1, weight: 1250, capacity: 2, sharingEnabled: 1, reservedForHonoree: 0, sortOrder: 3 },
  { id: "spot_bed4", roomName: "Bedroom 4", bedType: "full", privateBath: 0, privateRoom: 1, weight: 1000, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 4 },
  { id: "spot_bunk", roomName: "Bunk room", bedType: "bunk", privateBath: 0, privateRoom: 0, weight: 800, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 5 },
  { id: "spot_loft", roomName: "Loft", bedType: "sofa_bed", privateBath: 0, privateRoom: 0, weight: 600, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 6 },
  { id: "spot_couch", roomName: "Living room couch", bedType: "couch", privateBath: 0, privateRoom: 0, weight: 500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 7 },
  { id: "spot_air", roomName: "Living room air mattress", bedType: "air_mattress", privateBath: 0, privateRoom: 0, weight: 500, capacity: 1, sharingEnabled: 0, reservedForHonoree: 0, sortOrder: 8 },
] as const;

export const demoClaims = [
  { spotId: "spot_master", userId: "user_alex", status: "approved" },
  { spotId: "spot_bed2", userId: "user_chris", status: "approved" },
  { spotId: "spot_bed3", userId: "user_sam", status: "approved" },
  { spotId: "spot_bed4", userId: "user_jordan", status: "approved" },
  { spotId: "spot_bunk", userId: "user_drew", status: "approved" },
] as const;

export const demoTeeParticipants = ["user_chris", "user_sam", "user_jordan", "user_drew"] as const;

export const demoMilestones = [
  { id: "ms_buyin", name: "Buy-in", dueDate: "2026-12-16T05:59:00.000Z", kind: "buy_in", amountRule: "fixed", amount: BUY_IN_CENTS, sortOrder: 0 },
  { id: "ms_second", name: "Lodging", dueDate: "2027-01-15T06:00:00.000Z", kind: "installment", amountRule: "fixed", amount: 40_000, sortOrder: 1 },
  { id: "ms_final", name: "Balance", dueDate: "2027-04-01T05:00:00.000Z", kind: "final", amountRule: "fixed", amount: 0, sortOrder: 2 },
] as const;

export const demoPayments = [
  { id: "pay_chris", milestoneId: "ms_buyin", userId: "user_chris", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-18T18:00:00.000Z" },
  { id: "pay_sam", milestoneId: "ms_buyin", userId: "user_sam", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T15:00:00.000Z" },
  { id: "pay_jordan", milestoneId: "ms_buyin", userId: "user_jordan", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T20:00:00.000Z" },
  { id: "pay_drew", milestoneId: "ms_buyin", userId: "user_drew", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-20T16:00:00.000Z" },
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
  { id: "lake_opt_geneva", pollId: "lake_poll_destination", label: "Lake Geneva, WI", estCost: 320000, link: "", sortOrder: 0, lodgingEstimate: 320000, hiddenByOrganizer: 0 },
  { id: "lake_opt_door", pollId: "lake_poll_destination", label: "Door County, WI", estCost: 380000, link: "", sortOrder: 1, lodgingEstimate: 380000, hiddenByOrganizer: 0 },
  { id: "lake_opt_july1", pollId: "lake_poll_dates", label: "July 1–5, 2027", estCost: 0, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "lake_opt_aug", pollId: "lake_poll_dates", label: "August 5–9, 2027", estCost: 0, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "lake_opt_boat", pollId: "lake_poll_activity", label: "Lake boat day", estCost: 51000, link: "", sortOrder: 0, lodgingEstimate: null, hiddenByOrganizer: 0 },
  { id: "lake_opt_golf", pollId: "lake_poll_activity", label: "Mini golf night", estCost: 12000, link: "", sortOrder: 1, lodgingEstimate: null, hiddenByOrganizer: 0 },
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
  ["lake_opt_golf", "user_noah"],
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

import { DEMO_INVITE_TOKEN, DEMO_TRIP_ID } from "./constants";

/**
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
  name: "Alex's bachelor party",
  tripType: "bachelor",
  organizerId: "user_chris",
  guestOfHonorUserId: "user_alex",
  dateWindow: "A long weekend in May 2027",
  status: "buy_in_open",
  buyInAmount: BUY_IN_CENTS,
  buyInDeadline: "2026-12-16T05:59:00.000Z",
  minHeadcount: 5,
  maxHeadcount: 8,
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
  { id: "opt_nash", pollId: "poll_destination", label: "Nashville", estCost: 240000, link: "https://www.visitmusiccity.com", sortOrder: 0 },
  { id: "opt_austin", pollId: "poll_destination", label: "Austin", estCost: 260000, link: "https://www.austintexas.org", sortOrder: 1 },
  { id: "opt_scotts", pollId: "poll_destination", label: "Scottsdale", estCost: 310000, link: "https://www.experiencescottsdale.com", sortOrder: 2 },
  { id: "opt_may14", pollId: "poll_dates", label: "May 14–17, 2027", estCost: 0, link: "", sortOrder: 0 },
  { id: "opt_may21", pollId: "poll_dates", label: "May 21–24, 2027", estCost: 0, link: "", sortOrder: 1 },
  { id: "opt_brew", pollId: "poll_activity", label: "Brewery day", estCost: 60000, link: "", sortOrder: 0 },
  { id: "opt_tee", pollId: "poll_activity", label: "Golf / tee times", estCost: 48000, link: "", sortOrder: 1 },
  { id: "opt_show", pollId: "poll_activity", label: "Dinner and a show", estCost: 80000, link: "", sortOrder: 2 },
] as const;

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

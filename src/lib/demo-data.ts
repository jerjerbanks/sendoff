import { DEMO_INVITE_TOKEN, DEMO_TRIP_ID } from "./constants";

/**
 * Seed crew for Alex's bachelor party.
 *
 * Base pool $3,290 = Airbnb $2,400 + activities $600 + Alex's flight $290.
 * Tee times $480 are optional, four ways, $120 each: Chris, Sam, Jordan, Drew.
 * Chris also has his own $280 flight. That is the only way his pre-deadline
 * range is $870 (all 7 payers) to $1,058 (minimum 5 payers).
 * Buy-in is $150. It is the only forfeit that turns a 5-payer base share of
 * $658 into a 4-payer base share of $785 after Taylor drops late.
 * Two more invitees (Riley, Morgan) bring the payer list to 7. They have not
 * committed, so running the deadline as seeded leaves P=4 and the trip under
 * the minimum.
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
] as const;

export const demoTrip = {
  id: DEMO_TRIP_ID,
  name: "Alex's bachelor party",
  tripType: "bachelor",
  organizerId: "user_chris",
  guestOfHonorUserId: "user_alex",
  dateWindow: "A long weekend, Apr 16 – May 24, 2027",
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
  { userId: "user_morgan", role: "member", status: "joined", committedAt: null },
] as const;

export const demoPolls = [
  { id: "poll_destination", kind: "destination", deadline: "2026-12-09T05:59:00.000Z", lockedOptionId: null },
  { id: "poll_dates", kind: "dates", deadline: "2026-12-11T05:59:00.000Z", lockedOptionId: null },
  { id: "poll_activity", kind: "activity", deadline: "2026-12-13T05:59:00.000Z", lockedOptionId: null },
] as const;

export const demoOptions = [
  { id: "opt_nash", pollId: "poll_destination", label: "Nashville", estCost: 329000, link: "https://www.visitmusiccity.com", sortOrder: 0 },
  { id: "opt_scotts", pollId: "poll_destination", label: "Scottsdale", estCost: 410000, link: "https://www.experiencescottsdale.com", sortOrder: 1 },
  { id: "opt_ozarks", pollId: "poll_destination", label: "Lake of the Ozarks", estCost: 280000, link: "https://www.funlake.com", sortOrder: 2 },
  { id: "opt_apr", pollId: "poll_dates", label: "Thu–Sun · Apr 16–19, 2027", estCost: 0, link: "", sortOrder: 0 },
  { id: "opt_may7", pollId: "poll_dates", label: "Thu–Sun · May 7–10, 2027", estCost: 0, link: "", sortOrder: 1 },
  { id: "opt_may21", pollId: "poll_dates", label: "Fri–Mon · May 21–24, 2027", estCost: 0, link: "", sortOrder: 2 },
  { id: "opt_honky", pollId: "poll_activity", label: "Honky-tonk crawl", estCost: 60000, link: "", sortOrder: 0 },
  { id: "opt_steak", pollId: "poll_activity", label: "Steakhouse night", estCost: 90000, link: "", sortOrder: 1 },
  { id: "opt_tee", pollId: "poll_activity", label: "Tee times", estCost: 48000, link: "", sortOrder: 2 },
  { id: "opt_boat", pollId: "poll_activity", label: "Party barge afternoon", estCost: 70000, link: "", sortOrder: 3 },
] as const;

const votePairs: [string, string][] = [
  ["opt_nash", "user_chris"],
  ["opt_nash", "user_sam"],
  ["opt_nash", "user_jordan"],
  ["opt_nash", "user_drew"],
  ["opt_nash", "user_taylor"],
  ["opt_scotts", "user_riley"],
  ["opt_scotts", "user_morgan"],
  ["opt_scotts", "user_alex"],
  ["opt_ozarks", "user_chris"],
  ["opt_ozarks", "user_sam"],
  ["opt_ozarks", "user_drew"],
  ["opt_ozarks", "user_morgan"],
  ["opt_apr", "user_chris"],
  ["opt_apr", "user_sam"],
  ["opt_apr", "user_drew"],
  ["opt_may7", "user_jordan"],
  ["opt_may7", "user_taylor"],
  ["opt_may7", "user_alex"],
  ["opt_may7", "user_riley"],
  ["opt_may21", "user_sam"],
  ["opt_may21", "user_morgan"],
  ["opt_honky", "user_chris"],
  ["opt_honky", "user_sam"],
  ["opt_honky", "user_jordan"],
  ["opt_honky", "user_drew"],
  ["opt_honky", "user_taylor"],
  ["opt_honky", "user_alex"],
  ["opt_steak", "user_chris"],
  ["opt_steak", "user_jordan"],
  ["opt_steak", "user_riley"],
  ["opt_tee", "user_chris"],
  ["opt_tee", "user_sam"],
  ["opt_tee", "user_jordan"],
  ["opt_tee", "user_drew"],
  ["opt_boat", "user_taylor"],
  ["opt_boat", "user_morgan"],
  ["opt_boat", "user_sam"],
];

export const demoVotes = votePairs.map(([optionId, userId]) => ({ optionId, userId }));

export const demoCosts = [
  { id: "cost_lodge", label: "Lodging estimate", category: "lodging", splitType: "shared", amount: 91_000, memberId: null, isLodging: 1 },
  { id: "cost_fund", label: "Food, rides, and the house fund", category: "other", splitType: "shared", amount: 183_000, memberId: null, isLodging: 0 },
  { id: "cost_activities", label: "Group activities", category: "activity", splitType: "shared", amount: 60_000, memberId: null, isLodging: 0 },
  { id: "cost_alex_flight", label: "Alex's flight", category: "flight", splitType: "shared", amount: 29_000, memberId: null, isLodging: 0 },
  { id: "cost_tee", label: "Tee times", category: "golf", splitType: "optional", amount: TEE_TIME_CENTS, memberId: null, isLodging: 0 },
  { id: "cost_chris_flight", label: "Chris's flight", category: "flight", splitType: "individual", amount: 31_400, memberId: "user_chris", isLodging: 0 },
  { id: "cost_sam_flight", label: "Sam's flight", category: "flight", splitType: "individual", amount: 26_200, memberId: "user_sam", isLodging: 0 },
  { id: "cost_jordan_flight", label: "Jordan's flight", category: "flight", splitType: "individual", amount: 12_100, memberId: "user_jordan", isLodging: 0 },
  { id: "cost_drew_flight", label: "Drew's flight", category: "flight", splitType: "individual", amount: 10_000, memberId: "user_drew", isLodging: 0 },
  { id: "cost_taylor_flight", label: "Taylor's flight", category: "flight", splitType: "individual", amount: 18_400, memberId: "user_taylor", isLodging: 0 },
] as const;

export const demoSpots = [
  { id: "spot_primary", roomName: "Primary bedroom", bedType: "King", privateBath: 1, privateRoom: 1, weight: 1500, sharingEnabled: 1, reservedForHonoree: 0 },
  { id: "spot_queen", roomName: "Queen bedroom", bedType: "Queen", privateBath: 0, privateRoom: 1, weight: 1250, sharingEnabled: 1, reservedForHonoree: 0 },
  { id: "spot_full", roomName: "Full bedroom", bedType: "Full", privateBath: 0, privateRoom: 1, weight: 1000, sharingEnabled: 0, reservedForHonoree: 0 },
  { id: "spot_bunk_a", roomName: "Bunk room A", bedType: "Bunk", privateBath: 0, privateRoom: 0, weight: 800, sharingEnabled: 0, reservedForHonoree: 0 },
  { id: "spot_bunk_b", roomName: "Bunk room B", bedType: "Bunk", privateBath: 0, privateRoom: 0, weight: 800, sharingEnabled: 0, reservedForHonoree: 0 },
  { id: "spot_sofa", roomName: "Living room", bedType: "Sofa bed", privateBath: 0, privateRoom: 0, weight: 600, sharingEnabled: 0, reservedForHonoree: 0 },
  { id: "spot_groom", roomName: "Groom's room", bedType: "King", privateBath: 1, privateRoom: 1, weight: 1500, sharingEnabled: 0, reservedForHonoree: 1 },
] as const;

export const demoClaims = [
  { spotId: "spot_primary", userId: "user_chris", status: "approved" },
  { spotId: "spot_queen", userId: "user_sam", status: "approved" },
  { spotId: "spot_full", userId: "user_jordan", status: "approved" },
  { spotId: "spot_bunk_a", userId: "user_drew", status: "approved" },
] as const;

export const demoTeeParticipants = ["user_chris", "user_sam", "user_jordan", "user_drew"] as const;

export const demoMilestones = [
  { id: "ms_buyin", name: "Buy-in", dueDate: "2026-12-16T05:59:00.000Z", kind: "buy_in", amountRule: "fixed", amount: BUY_IN_CENTS, sortOrder: 0 },
  { id: "ms_second", name: "Second payment", dueDate: "2027-01-21T05:59:00.000Z", kind: "installment", amountRule: "pct_of_share", amount: 40, sortOrder: 1 },
  { id: "ms_final", name: "Final payment", dueDate: "2027-03-02T05:59:00.000Z", kind: "final", amountRule: "pct_of_share", amount: 0, sortOrder: 2 },
] as const;

export const demoPayments = [
  { id: "pay_chris", milestoneId: "ms_buyin", userId: "user_chris", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-18T18:00:00.000Z" },
  { id: "pay_sam", milestoneId: "ms_buyin", userId: "user_sam", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T15:00:00.000Z" },
  { id: "pay_jordan", milestoneId: "ms_buyin", userId: "user_jordan", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-19T20:00:00.000Z" },
  { id: "pay_drew", milestoneId: "ms_buyin", userId: "user_drew", amount: BUY_IN_CENTS, status: "paid", paidAt: "2026-11-20T16:00:00.000Z" },
] as const;

"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import { demoResetAllowed } from "@/lib/demo-flag";
import { zonedToUtc } from "@/lib/format";
import { createSignInLink, endSession, getViewerId, redeemSignInLink, startSession } from "@/lib/session";
import { isDemoTrip } from "@/lib/demo-tour";
import { hashToken, isContact } from "@/lib/tokens";
import { countHit, RATE_LIMITS, type RateBucket } from "@/lib/rate-limit";
import {
  addCost,
  addPollOption,
  cancelTrip,
  clearPollLock,
  createTrip,
  deleteCost,
  extendDeadline,
  joinTrip,
  jumpPastSecondPayment,
  lockPollOption,
  payMilestone,
  removeLateMember,
  addSpot,
  bookStay,
  claimSpot,
  releaseSpot,
  requestSpot,
  resolveSpotRequest,
  setBedPolicy,
  resetDemoTrip,
  recordEvent,
  saveBudget,
  saveBuyIn,
  setOptionHidden,
  setClock,
  setPollDeadline,
  simulateDeadline,
  toggleOptional,
  toggleVote,
  isMemberOf,
  addTraveler,
  asAgeBand,
  asSplitMode,
  assignRoom,
  claimRoom,
  optInToShare,
  removeTraveler,
  saveParty,
  setAgeWeights,
  setCoSleep,
  setHeadcounts,
  setHonoreeExclusion,
  acknowledgeSplitMode,
  setSplitMode,
  toggleTravelerOptIn,
  updateRoom,
  updateTraveler,
  type HonoreeRole,
  type PreWeddingStyle,
} from "@/lib/store";
import { DEMO_TRIP_ID, LAKE_TRIP_ID, SIGN_IN_LINK_COOKIE } from "@/lib/constants";

/** The person acting is whoever this browser is signed in as. Never trust an id sent in the form. */
async function me(): Promise<string> {
  return (await getViewerId()) ?? "";
}

/**
 * Per-client-IP rate limit, checked before any other database work. Two
 * counters, and either one can refuse:
 * - Cloudflare's Workers Rate Limiting binding. On the live Worker it never
 *   refused anything (v1.17 logs), so it is kept only in case it starts working.
 * - A strict counter in D1 (rate_hits, migration 0008), in one-minute windows.
 * If either is missing or throws, that one lets the request through and logs a
 * warning: this guards against floods, and a broken limiter shouldn't lock
 * everyone out. Every check is logged for Workers Logs. The IP is never stored
 * or logged, only its SHA-256 hash (the first 8 characters in logs).
 */
async function withinLimit(binding: "JOIN_RATE_LIMITER" | "CREATE_TRIP_RATE_LIMITER"): Promise<boolean> {
  const bucket: RateBucket = binding === "JOIN_RATE_LIMITER" ? "join" : "create";
  const limit = RATE_LIMITS[bucket];
  const limiter = env[binding];
  const ip = (await headers()).get("cf-connecting-ip");
  const key = hashToken(ip ?? "unknown");
  const base = {
    event: "rate_limit",
    binding,
    bucket,
    joinBound: Boolean(env.JOIN_RATE_LIMITER),
    createBound: Boolean(env.CREATE_TRIP_RATE_LIMITER),
    limitIsFunction: typeof limiter?.limit === "function",
    hasIp: !!ip,
    keyHash: key.slice(0, 8),
  };

  let cf: "allowed" | "limited" | "binding_missing" | "threw" = "binding_missing";
  let cfResult: unknown;
  if (limiter && typeof limiter.limit === "function") {
    try {
      cfResult = await limiter.limit({ key: ip ?? "unknown" });
      cf = (cfResult as { success: boolean }).success ? "allowed" : "limited";
    } catch (error) {
      cf = "threw";
      cfResult = String(error);
    }
  }

  let d1: "allowed" | "limited" | "threw" = "allowed";
  let d1Count: number | null = null;
  try {
    d1Count = await countHit(env.DB, key, bucket, Date.now());
    d1 = d1Count > limit ? "limited" : "allowed";
  } catch (error) {
    d1 = "threw";
    cfResult = { cf: cfResult, d1Error: String(error) };
  }

  const allowed = cf !== "limited" && d1 !== "limited";
  const outcome = allowed ? "allowed" : "limited";
  const entry = { ...base, outcome, cf, d1, d1Count, limit, result: cfResult };
  if (cf === "binding_missing" || cf === "threw" || d1 === "threw") console.warn(entry);
  else console.log(entry);
  return allowed;
}

const TOO_MANY = "Too many tries. Wait a minute and try again.";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(tripId: string, result: { ok: boolean; error?: string }, path: string) {
  if (!result.ok) fail(path, result.error ?? "That didn't work.");
  revalidatePath(`/trip/${tripId}`, "layout");
}

/** A trimmed form field, capped so nobody can stuff the database. */
function text(formData: FormData, key: string, max = 300): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Names show up everywhere; keep them short. */
const NAME_MAX = 60;

/** Dollars to cents. Anything that isn't a plain amount up to $1,000,000 is refused. */
function dollars(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/[$,]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents <= 100_000_000 ? cents : null;
}

function honoreeRole(value: string): HonoreeRole {
  return value === "bride" || value === "groom" || value === "birthday" ? value : "other";
}

export async function createTripAction(formData: FormData) {
  if (!(await withinLimit("CREATE_TRIP_RATE_LIMITER"))) fail("/", TOO_MANY);
  const name = text(formData, "name", 80);
  const organizerName = text(formData, "organizerName", NAME_MAX);
  const organizerContact = text(formData, "organizerContact", 120);
  const dateWindow = text(formData, "dateWindow", 120);
  const tripType = text(formData, "tripType") === "family" ? "family" : "pre_wedding";
  const styleRaw = text(formData, "preWeddingStyle");
  const preWeddingStyle: PreWeddingStyle | null =
    tripType === "pre_wedding" ? (styleRaw === "bachelor" || styleRaw === "bachelorette" ? styleRaw : "joint") : null;
  if (!name || !organizerName || !organizerContact || !dateWindow) {
    fail("/", "Fill in the trip name, your name and contact, and a rough date window.");
  }
  if (!isContact(organizerContact)) fail("/", "Add a phone number or an email address you can be reached at.");
  // 0..n guests of honor. A row counts once it has a name.
  const honorees: { name: string; contact: string; contactGiven: boolean; role: HonoreeRole }[] = [];
  for (const index of [1, 2]) {
    const honoreeName = text(formData, `honoree${index}Name`, NAME_MAX);
    if (!honoreeName) continue;
    const given = text(formData, `honoree${index}Contact`, 120);
    if (given && !isContact(given)) fail("/", `${honoreeName}'s contact needs to be a phone number or an email address.`);
    honorees.push({
      name: honoreeName,
      // A made-up placeholder can never be used to sign in as the honoree.
      contact: given || `${honoreeName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      contactGiven: !!given,
      role: honoreeRole(text(formData, `honoree${index}Role`)),
    });
  }
  const created = await createTrip({ name, organizerName, organizerContact, tripType, preWeddingStyle, honorees, dateWindow });
  await startSession(created.organizerId);
  redirect(`/trip/${created.tripId}/party?welcome=1`);
}

export async function joinTripAction(formData: FormData) {
  const token = text(formData, "token", 40);
  if (!(await withinLimit("JOIN_RATE_LIMITER"))) fail(`/join/${token}`, TOO_MANY);
  const name = text(formData, "name", NAME_MAX);
  const contact = text(formData, "contact", 120);
  if (!name || !contact) fail(`/join/${token}`, "Add your name and a phone or email.");
  if (!isContact(contact)) fail(`/join/${token}`, "That doesn't look like a phone number or an email address.");
  const result = await joinTrip({ token, name, contact, viewerId: await getViewerId() });
  if (!result.ok || !result.userId || !result.tripId) {
    fail(`/join/${token}`, result.ok ? "Could not join." : result.error ?? "Could not join.");
  }
  await startSession(result.userId, { demo: isDemoTrip(result.tripId) });
  // S18 then S17: confirm the party and its travelers, then the private budget.
  redirect(result.isNew ? `/trip/${result.tripId}/party?welcome=1` : `/trip/${result.tripId}`);
}

export async function switchUserAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const target = text(formData, "userId");
  // Becoming someone else is a demo-only tool. A real trip has no person switcher.
  if (!isDemoTrip(tripId) || !(await isMemberOf(tripId, target))) {
    fail(`/trip/${tripId}`, "Switching people only works in the demo.");
  }
  await startSession(target, { demo: true });
  revalidatePath(`/trip/${tripId}`, "layout");
  // Demo stories land on the screen that tells the story.
  const next = text(formData, "next");
  if (formData.has("next") && /^\/[a-z]*$|^$/.test(next)) redirect(`/trip/${tripId}${next}`);
}

export async function voteAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const optionId = text(formData, "optionId");
  done(tripId, await toggleVote(tripId, userId, optionId), `/trip/${tripId}/vote`);
}

export async function addOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const pollId = text(formData, "pollId");
  const label = text(formData, "label", 80);
  const link = text(formData, "link", 500);
  const est = dollars(formData, "estCost") ?? 0;
  if (!label) fail(`/trip/${tripId}/vote`, "Name the option.");
  if (link && !/^https?:\/\//.test(link)) fail(`/trip/${tripId}/vote`, "Links need to start with http:// or https://.");
  done(tripId, await addPollOption({ tripId, userId, pollId, label, estCost: est, link }), `/trip/${tripId}/vote`);
}

export async function lockOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await lockPollOption(tripId, userId, text(formData, "optionId")), `/trip/${tripId}/vote`);
}

export async function clearLockAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await clearPollLock(tripId, userId, text(formData, "pollId")), `/trip/${tripId}/vote`);
}

export async function pollDeadlineAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const when = text(formData, "deadline");
  if (!when) fail(`/trip/${tripId}/vote`, "Pick a deadline.");
  done(tripId, await setPollDeadline(tripId, userId, text(formData, "pollId"), zonedToUtc(when)), `/trip/${tripId}/vote`);
}

export async function addCostAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const label = text(formData, "label", 80);
  const category = text(formData, "category", 20) || "other";
  const splitType = text(formData, "splitType");
  const amount = dollars(formData, "amount");
  if (!label || amount === null) fail(`/trip/${tripId}/costs`, "Add a name and a dollar amount.");
  if (splitType !== "shared" && splitType !== "individual" && splitType !== "optional") {
    fail(`/trip/${tripId}/costs`, "Pick how this cost splits.");
  }
  done(
    tripId,
    await addCost({
      tripId,
      userId,
      label,
      category,
      splitType,
      amountCents: amount,
      memberId: text(formData, "memberId") || null,
      agePrices: {
        adult: dollars(formData, "priceAdult"),
        teen: dollars(formData, "priceTeen"),
        child: dollars(formData, "priceChild"),
        infant: dollars(formData, "priceInfant"),
      },
    }),
    `/trip/${tripId}/costs`,
  );
}

export async function travelerOptAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await toggleTravelerOptIn(tripId, await me(), text(formData, "costId"), text(formData, "travelerId")),
    `/trip/${tripId}/costs`,
  );
}

export async function deleteCostAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await deleteCost(tripId, userId, text(formData, "costId")), `/trip/${tripId}/costs`);
}

export async function optAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await toggleOptional(tripId, userId, text(formData, "costId")), `/trip/${tripId}/costs`);
}

export async function openBuyInAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const amount = dollars(formData, "amount");
  const minHeadcount = Number(text(formData, "minHeadcount"));
  const when = text(formData, "deadline");
  if (amount === null || !when || !Number.isFinite(minHeadcount)) {
    fail(`/trip/${tripId}/pay`, "Set an amount, a minimum crew, and a deadline.");
  }
  done(
    tripId,
    await saveBuyIn({ tripId, userId, amountCents: amount, minHeadcount, deadlineIso: zonedToUtc(when) }),
    `/trip/${tripId}/pay`,
  );
}

export async function payAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const milestoneId = text(formData, "milestoneId");
  const ack = text(formData, "ack");
  const kind = text(formData, "kind");
  if (kind === "buy_in" && ack !== "yes") {
    fail(`/trip/${tripId}/pay`, "Check the box. The buy-in is refundable until the stay is booked, and forfeited after.");
  }
  done(tripId, await payMilestone(tripId, userId, milestoneId), `/trip/${tripId}/pay`);
  // S9: after the buy-in, the payer goes straight to the room picker (S14).
  if (kind === "buy_in") redirect(`/trip/${tripId}/spots?committed=1`);
}

export async function removeMemberAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const target = text(formData, "userId");
  done(tripId, await removeLateMember(tripId, await me(), target), `/trip/${tripId}/pay`);
}

export async function extendAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const when = text(formData, "deadline");
  if (!when) fail(`/trip/${tripId}`, "Pick a new deadline.");
  done(tripId, await extendDeadline(tripId, userId, zonedToUtc(when)), `/trip/${tripId}`);
}

export async function cancelAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await cancelTrip(tripId, userId), `/trip/${tripId}`);
}

export async function simulateDeadlineAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  if (!isDemoTrip(tripId)) fail(`/trip/${tripId}`, "The clock only moves in the demo. Real trips run on real time.");
  done(tripId, await simulateDeadline(tripId), `/trip/${tripId}`);
}

export async function jumpSecondAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  if (!isDemoTrip(tripId)) fail(`/trip/${tripId}`, "The clock only moves in the demo. Real trips run on real time.");
  done(tripId, await jumpPastSecondPayment(tripId), `/trip/${tripId}`);
}

export async function resetClockAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  if (!isDemoTrip(tripId)) fail(`/trip/${tripId}`, "The clock only moves in the demo. Real trips run on real time.");
  done(tripId, await setClock(tripId, null), `/trip/${tripId}`);
}

export async function claimSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await claimSpot(tripId, userId, text(formData, "spotId"), text(formData, "acceptShare") === "yes"), `/trip/${tripId}/spots`);
}

export async function claimRoomAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await claimRoom(tripId, await me(), text(formData, "roomName")), `/trip/${tripId}/spots`);
}

export async function coSleepAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const spotId = text(formData, "spotId") || null;
  done(tripId, await setCoSleep(tripId, await me(), text(formData, "travelerId"), spotId), `/trip/${tripId}/spots`);
}

export async function optInShareAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await optInToShare(tripId, await me(), text(formData, "requestId")), `/trip/${tripId}/spots`);
}

export async function updateRoomAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const yes = (key: string) => text(formData, key) === "yes";
  done(
    tripId,
    await updateRoom({
      tripId,
      userId: await me(),
      roomName: text(formData, "roomName"),
      groundFloor: yes("groundFloor"),
      noStairs: yes("noStairs"),
      accessibleBath: yes("accessibleBath"),
      cribSpace: yes("cribSpace"),
      reservedForUserId: text(formData, "reservedFor") || null,
      coSleepAllowed: yes("coSleepAllowed"),
      maxCoSleepers: Number(text(formData, "maxCoSleepers") || "1"),
    }),
    `/trip/${tripId}/sleep`,
  );
}

export async function assignRoomAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await assignRoom(tripId, await me(), text(formData, "roomName"), text(formData, "partyUserId")),
    `/trip/${tripId}/sleep`,
  );
}

export async function releaseSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  done(tripId, await releaseSpot(tripId, userId, text(formData, "spotId")), `/trip/${tripId}/spots`);
}

export async function addSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const weight = Number(text(formData, "weight"));
  if (!text(formData, "roomName") || !Number.isFinite(weight) || weight <= 0 || weight > 10) {
    fail(`/trip/${tripId}/sleep`, "Name the room and give it a weight between 0 and 10.");
  }
  done(
    tripId,
    await addSpot({
      tripId,
      userId,
      roomName: text(formData, "roomName", 60),
      bedType: text(formData, "bedType", 30) || "Bed",
      privateBath: text(formData, "privateBath") === "yes",
      privateRoom: text(formData, "privateRoom") === "yes",
      weight,
      reservedForHonoree: text(formData, "reserved") === "yes",
      allowSharing: text(formData, "allowSharing") === "yes",
      groundFloor: text(formData, "groundFloor") === "yes",
      noStairs: text(formData, "noStairs") === "yes",
      accessibleBath: text(formData, "accessibleBath") === "yes",
      cribSpace: text(formData, "cribSpace") === "yes",
    }),
    `/trip/${tripId}/sleep`,
  );
}

export async function bookStayAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  const amount = dollars(formData, "actual");
  const confirmation = text(formData, "confirmation", 60);
  if (amount === null || !confirmation) fail(`/trip/${tripId}/book`, "Add a confirmation number and the actual lodging total.");
  done(tripId, await bookStay(tripId, userId, confirmation, amount), `/trip/${tripId}/book`);
}

export async function requestSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const type = text(formData, "type") === "share" ? "share" : "switch";
  done(
    tripId,
    await requestSpot({ tripId, userId: await me(), toSpotId: text(formData, "spotId"), type }),
    `/trip/${tripId}/spots`,
  );
}

export async function resolveRequestAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await resolveSpotRequest(tripId, await me(), text(formData, "requestId"), text(formData, "decision") === "approve"),
    `/trip/${tripId}/approvals`,
  );
}

export async function bedPolicyAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const policy = text(formData, "policy") === "locked" ? "locked" : "member_requests";
  done(tripId, await setBedPolicy(tripId, await me(), policy), `/trip/${tripId}/settings`);
}

export async function saveBudgetAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const amount = dollars(formData, "maxAllIn");
  if (amount === null) fail(`/trip/${tripId}/budget`, "Enter an all-in number.");
  const musts = ["golf", "own_room", "nightlife", "ground_floor", "crib_space", "other"].filter((item) => formData.get(item) === "yes");
  done(
    tripId,
    await saveBudget({
      tripId,
      userId: await me(),
      maxAllInCents: amount,
      flexNote: text(formData, "flexNote", 500),
      mustHaves: musts,
    }),
    `/trip/${tripId}/budget`,
  );
  if (text(formData, "welcome") === "1") redirect(`/trip/${tripId}/vote`);
}

export async function outOfPocketAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  if (!(await isMemberOf(tripId, userId))) fail(`/trip/${tripId}`, "Join the trip first.");
  await recordEvent(tripId, userId, "out_of_pocket", `previous=${text(formData, "previous", 20)};current=${text(formData, "current", 20)}`);
  redirect(`/trip/${tripId}/metrics`);
}

export async function hideOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setOptionHidden(tripId, await me(), text(formData, "optionId"), text(formData, "hidden") === "yes"),
    `/trip/${tripId}/vote`,
  );
}

export async function resetDemoAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  if (!demoResetAllowed() || (tripId !== DEMO_TRIP_ID && tripId !== LAKE_TRIP_ID)) {
    fail(`/trip/${tripId}`, "Demo reset is only for the seeded trips.");
  }
  done(tripId, await resetDemoTrip(), `/trip/${tripId}`);
}

export async function savePartyAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const comfort = text(formData, "shareComfort");
  const result = await saveParty({
    tripId,
    actorId: await me(),
    partyUserId: text(formData, "partyUserId"),
    name: text(formData, "name", NAME_MAX),
    shareComfort: comfort === "no_share" || comfort === "note_only" ? comfort : "any",
    shareComfortNote: text(formData, "shareComfortNote", 500),
  });
  done(tripId, result, `/trip/${tripId}/party`);
  if (text(formData, "next") === "budget") redirect(`/trip/${tripId}/budget?welcome=1`);
}

export async function addTravelerAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await addTraveler({
      tripId,
      actorId: await me(),
      partyUserId: text(formData, "partyUserId"),
      name: text(formData, "name", NAME_MAX),
      ageBand: asAgeBand(text(formData, "ageBand")),
      needsNotes: text(formData, "needsNotes", 500),
    }),
    `/trip/${tripId}/party`,
  );
}

export async function updateTravelerAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await updateTraveler({
      tripId,
      actorId: await me(),
      travelerId: text(formData, "travelerId"),
      name: text(formData, "name", NAME_MAX),
      ageBand: asAgeBand(text(formData, "ageBand")),
      needsNotes: text(formData, "needsNotes", 500),
    }),
    `/trip/${tripId}/party`,
  );
}

export async function removeTravelerAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await removeTraveler(tripId, await me(), text(formData, "travelerId")), `/trip/${tripId}/party`);
}

export async function splitModeAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setSplitMode(tripId, await me(), asSplitMode(text(formData, "splitMode"))),
    `/trip/${tripId}/settings`,
  );
}

export async function ackSplitModeAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await acknowledgeSplitMode(tripId, await me()), `/trip/${tripId}/settings`);
}

export async function ageWeightsAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const num = (key: string) => Number(text(formData, key));
  done(
    tripId,
    await setAgeWeights(tripId, await me(), {
      adult: num("adult"),
      teen: num("teen"),
      child: num("child"),
      infant: num("infant"),
    }),
    `/trip/${tripId}/settings`,
  );
}

export async function honoreeExclusionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await setHonoreeExclusion(tripId, await me(), text(formData, "excluded") === "yes"), `/trip/${tripId}/settings`);
}

export async function headcountsAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setHeadcounts(tripId, await me(), Number(text(formData, "minPayers")), Number(text(formData, "maxTravelers"))),
    `/trip/${tripId}/settings`,
  );
}

/** Sign this phone out. Other phones the person signed in on stay signed in. */
export async function signOutAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  await endSession();
  redirect(isDemoTrip(tripId) ? "/" : `/trip/${tripId}`);
}

/**
 * Make a one-time link to sign in on another phone. Only the signed-in person can
 * make one for themselves; nobody can make one for someone else.
 */
export async function signInLinkAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = await me();
  if (!(await isMemberOf(tripId, userId))) fail(`/trip/${tripId}`, "Join the trip first.");
  const { token } = await createSignInLink(userId, tripId);
  // Hand the link to the party page in a short-lived cookie, not the URL, so it
  // never sits in browser history. It dies with the link, 15 minutes from now.
  (await cookies()).set(SIGN_IN_LINK_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: `/trip/${tripId}/party`,
    maxAge: 15 * 60,
  });
  redirect(`/trip/${tripId}/party#this-phone`);
}

/** The other phone confirms. Using the link signs it in and spends the link. */
export async function redeemSignInLinkAction(formData: FormData) {
  const token = text(formData, "token", 64);
  const result = await redeemSignInLink(token);
  if (!result) redirect(`/signin/${encodeURIComponent(token)}?expired=1`);
  await startSession(result.userId);
  redirect(`/trip/${result.tripId}`);
}

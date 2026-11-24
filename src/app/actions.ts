"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { demoResetAllowed } from "@/lib/demo-flag";
import { zonedToUtc } from "@/lib/format";
import { setViewerCookie } from "@/lib/session";
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
import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "@/lib/constants";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function done(tripId: string, result: { ok: boolean; error?: string }, path: string) {
  if (!result.ok) fail(path, result.error ?? "That didn't work.");
  revalidatePath(`/trip/${tripId}`, "layout");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function dollars(formData: FormData, key: string): number | null {
  const raw = text(formData, key);
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function honoreeRole(value: string): HonoreeRole {
  return value === "bride" || value === "groom" || value === "birthday" ? value : "other";
}

export async function createTripAction(formData: FormData) {
  const name = text(formData, "name");
  const organizerName = text(formData, "organizerName");
  const organizerContact = text(formData, "organizerContact");
  const dateWindow = text(formData, "dateWindow");
  const tripType = text(formData, "tripType") === "family" ? "family" : "pre_wedding";
  const styleRaw = text(formData, "preWeddingStyle");
  const preWeddingStyle: PreWeddingStyle | null =
    tripType === "pre_wedding" ? (styleRaw === "bachelor" || styleRaw === "bachelorette" ? styleRaw : "joint") : null;
  if (!name || !organizerName || !organizerContact || !dateWindow) {
    fail("/", "Fill in the trip name, your name and contact, and a rough date window.");
  }
  // 0..n guests of honor. A row counts once it has a name.
  const honorees: { name: string; contact: string; role: HonoreeRole }[] = [];
  for (const index of [1, 2]) {
    const honoreeName = text(formData, `honoree${index}Name`);
    if (!honoreeName) continue;
    honorees.push({
      name: honoreeName,
      contact: text(formData, `honoree${index}Contact`) || `${honoreeName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      role: honoreeRole(text(formData, `honoree${index}Role`)),
    });
  }
  const created = await createTrip({ name, organizerName, organizerContact, tripType, preWeddingStyle, honorees, dateWindow });
  await setViewerCookie(created.organizerId);
  redirect(`/trip/${created.tripId}/party?welcome=1`);
}

export async function joinTripAction(formData: FormData) {
  const token = text(formData, "token");
  const name = text(formData, "name");
  const contact = text(formData, "contact");
  if (!name || !contact) fail(`/join/${token}`, "Add your name and a phone or email.");
  const result = await joinTrip({ token, name, contact });
  if (!result.ok || !result.userId || !result.tripId) {
    fail(`/join/${token}`, result.ok ? "Could not join." : result.error ?? "Could not join.");
  }
  await setViewerCookie(result.userId);
  // S18 then S17: confirm the party and its travelers, then the private budget.
  redirect(result.isNew ? `/trip/${result.tripId}/party?welcome=1` : `/trip/${result.tripId}`);
}

export async function switchUserAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  await setViewerCookie(userId);
  revalidatePath(`/trip/${tripId}`, "layout");
  // Demo stories land on the screen that tells the story.
  const next = text(formData, "next");
  if (/^\/[a-z]*$/.test(next) || next === "") {
    if (formData.has("next")) redirect(`/trip/${tripId}${next}`);
  }
}

export async function voteAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const optionId = text(formData, "optionId");
  done(tripId, await toggleVote(tripId, userId, optionId), `/trip/${tripId}/vote`);
}

export async function addOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const pollId = text(formData, "pollId");
  const label = text(formData, "label");
  const link = text(formData, "link");
  const est = dollars(formData, "estCost") ?? 0;
  if (!label) fail(`/trip/${tripId}/vote`, "Name the option.");
  if (link && !/^https?:\/\//.test(link)) fail(`/trip/${tripId}/vote`, "Links need to start with http:// or https://.");
  done(tripId, await addPollOption({ tripId, userId, pollId, label, estCost: est, link }), `/trip/${tripId}/vote`);
}

export async function lockOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await lockPollOption(tripId, userId, text(formData, "optionId")), `/trip/${tripId}/vote`);
}

export async function clearLockAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await clearPollLock(tripId, userId, text(formData, "pollId")), `/trip/${tripId}/vote`);
}

export async function pollDeadlineAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const when = text(formData, "deadline");
  if (!when) fail(`/trip/${tripId}/vote`, "Pick a deadline.");
  done(tripId, await setPollDeadline(tripId, userId, text(formData, "pollId"), zonedToUtc(when)), `/trip/${tripId}/vote`);
}

export async function addCostAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const label = text(formData, "label");
  const category = text(formData, "category") || "other";
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
    await toggleTravelerOptIn(tripId, text(formData, "userId"), text(formData, "costId"), text(formData, "travelerId")),
    `/trip/${tripId}/costs`,
  );
}

export async function deleteCostAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await deleteCost(tripId, userId, text(formData, "costId")), `/trip/${tripId}/costs`);
}

export async function optAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await toggleOptional(tripId, userId, text(formData, "costId")), `/trip/${tripId}/costs`);
}

export async function openBuyInAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
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
  const userId = text(formData, "userId");
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
  const actorId = text(formData, "actorId");
  const userId = text(formData, "userId");
  done(tripId, await removeLateMember(tripId, actorId, userId), `/trip/${tripId}/pay`);
}

export async function extendAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const when = text(formData, "deadline");
  if (!when) fail(`/trip/${tripId}`, "Pick a new deadline.");
  done(tripId, await extendDeadline(tripId, userId, zonedToUtc(when)), `/trip/${tripId}`);
}

export async function cancelAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await cancelTrip(tripId, userId), `/trip/${tripId}`);
}

export async function simulateDeadlineAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await simulateDeadline(tripId), `/trip/${tripId}`);
}

export async function jumpSecondAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await jumpPastSecondPayment(tripId), `/trip/${tripId}`);
}

export async function resetClockAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await setClock(tripId, null), `/trip/${tripId}`);
}

export async function claimSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await claimSpot(tripId, userId, text(formData, "spotId"), text(formData, "acceptShare") === "yes"), `/trip/${tripId}/spots`);
}

export async function claimRoomAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await claimRoom(tripId, text(formData, "userId"), text(formData, "roomName")), `/trip/${tripId}/spots`);
}

export async function coSleepAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const spotId = text(formData, "spotId") || null;
  done(tripId, await setCoSleep(tripId, text(formData, "userId"), text(formData, "travelerId"), spotId), `/trip/${tripId}/spots`);
}

export async function optInShareAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await optInToShare(tripId, text(formData, "userId"), text(formData, "requestId")), `/trip/${tripId}/spots`);
}

export async function updateRoomAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const yes = (key: string) => text(formData, key) === "yes";
  done(
    tripId,
    await updateRoom({
      tripId,
      userId: text(formData, "userId"),
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
    await assignRoom(tripId, text(formData, "userId"), text(formData, "roomName"), text(formData, "partyUserId")),
    `/trip/${tripId}/sleep`,
  );
}

export async function releaseSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  done(tripId, await releaseSpot(tripId, userId, text(formData, "spotId")), `/trip/${tripId}/spots`);
}

export async function addSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  const weight = Number(text(formData, "weight"));
  if (!text(formData, "roomName") || !Number.isFinite(weight)) fail(`/trip/${tripId}/sleep`, "Name the room and its weight.");
  done(
    tripId,
    await addSpot({
      tripId,
      userId,
      roomName: text(formData, "roomName"),
      bedType: text(formData, "bedType") || "Bed",
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
  const userId = text(formData, "userId");
  const amount = dollars(formData, "actual");
  const confirmation = text(formData, "confirmation");
  if (amount === null || !confirmation) fail(`/trip/${tripId}/book`, "Add a confirmation number and the actual lodging total.");
  done(tripId, await bookStay(tripId, userId, confirmation, amount), `/trip/${tripId}/book`);
}

export async function requestSpotAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const type = text(formData, "type") === "share" ? "share" : "switch";
  done(
    tripId,
    await requestSpot({ tripId, userId: text(formData, "userId"), toSpotId: text(formData, "spotId"), type }),
    `/trip/${tripId}/spots`,
  );
}

export async function resolveRequestAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await resolveSpotRequest(tripId, text(formData, "userId"), text(formData, "requestId"), text(formData, "decision") === "approve"),
    `/trip/${tripId}/approvals`,
  );
}

export async function bedPolicyAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const policy = text(formData, "policy") === "locked" ? "locked" : "member_requests";
  done(tripId, await setBedPolicy(tripId, text(formData, "userId"), policy), `/trip/${tripId}/settings`);
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
      userId: text(formData, "userId"),
      maxAllInCents: amount,
      flexNote: text(formData, "flexNote"),
      mustHaves: musts,
    }),
    `/trip/${tripId}/budget`,
  );
  if (text(formData, "welcome") === "1") redirect(`/trip/${tripId}/vote`);
}

export async function outOfPocketAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  await recordEvent(tripId, text(formData, "userId"), "out_of_pocket", `previous=${text(formData, "previous")};current=${text(formData, "current")}`);
  redirect(`/trip/${tripId}/metrics`);
}

export async function hideOptionAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setOptionHidden(tripId, text(formData, "userId"), text(formData, "optionId"), text(formData, "hidden") === "yes"),
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
    actorId: text(formData, "userId"),
    partyUserId: text(formData, "partyUserId"),
    name: text(formData, "name"),
    shareComfort: comfort === "no_share" || comfort === "note_only" ? comfort : "any",
    shareComfortNote: text(formData, "shareComfortNote"),
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
      actorId: text(formData, "userId"),
      partyUserId: text(formData, "partyUserId"),
      name: text(formData, "name"),
      ageBand: asAgeBand(text(formData, "ageBand")),
      needsNotes: text(formData, "needsNotes"),
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
      actorId: text(formData, "userId"),
      travelerId: text(formData, "travelerId"),
      name: text(formData, "name"),
      ageBand: asAgeBand(text(formData, "ageBand")),
      needsNotes: text(formData, "needsNotes"),
    }),
    `/trip/${tripId}/party`,
  );
}

export async function removeTravelerAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await removeTraveler(tripId, text(formData, "userId"), text(formData, "travelerId")), `/trip/${tripId}/party`);
}

export async function splitModeAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setSplitMode(tripId, text(formData, "userId"), asSplitMode(text(formData, "splitMode"))),
    `/trip/${tripId}/settings`,
  );
}

export async function ackSplitModeAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await acknowledgeSplitMode(tripId, text(formData, "userId")), `/trip/${tripId}/settings`);
}

export async function ageWeightsAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const num = (key: string) => Number(text(formData, key));
  done(
    tripId,
    await setAgeWeights(tripId, text(formData, "userId"), {
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
  done(tripId, await setHonoreeExclusion(tripId, text(formData, "userId"), text(formData, "excluded") === "yes"), `/trip/${tripId}/settings`);
}

export async function headcountsAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(
    tripId,
    await setHeadcounts(tripId, text(formData, "userId"), Number(text(formData, "minPayers")), Number(text(formData, "maxTravelers"))),
    `/trip/${tripId}/settings`,
  );
}

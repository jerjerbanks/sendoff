"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  resetDemoTrip,
  saveBuyIn,
  setClock,
  setPollDeadline,
  simulateDeadline,
  toggleOptional,
  toggleVote,
} from "@/lib/store";

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

export async function createTripAction(formData: FormData) {
  const name = text(formData, "name");
  const organizerName = text(formData, "organizerName");
  const organizerContact = text(formData, "organizerContact");
  const honoreeName = text(formData, "honoreeName");
  const honoreeContact = text(formData, "honoreeContact");
  const dateWindow = text(formData, "dateWindow");
  if (!name || !organizerName || !organizerContact || !honoreeName || !honoreeContact || !dateWindow) {
    fail("/", "Fill in the trip, both people, and a rough date window.");
  }
  const created = await createTrip({ name, organizerName, organizerContact, honoreeName, honoreeContact, dateWindow });
  await setViewerCookie(created.organizerId);
  redirect(`/trip/${created.tripId}`);
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
  redirect(`/trip/${result.tripId}`);
}

export async function switchUserAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  const userId = text(formData, "userId");
  await setViewerCookie(userId);
  revalidatePath(`/trip/${tripId}`, "layout");
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
    }),
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
    fail(`/trip/${tripId}/pay`, "Check the box. The buy-in is non-refundable once the trip locks in.");
  }
  done(tripId, await payMilestone(tripId, userId, milestoneId), `/trip/${tripId}/pay`);
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
  done(tripId, await claimSpot(tripId, userId, text(formData, "spotId")), `/trip/${tripId}/spots`);
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

export async function resetDemoAction(formData: FormData) {
  const tripId = text(formData, "tripId");
  done(tripId, await resetDemoTrip(), `/trip/${tripId}`);
}

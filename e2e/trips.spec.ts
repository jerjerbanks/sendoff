import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTrip, letIn, uniqueSuffix } from "./helpers";

/**
 * Your trips and invite codes: one sign-in holds every trip it starts or joins, an invite
 * code or link finds its trip, and nobody sees a trip they aren't on. Writes data, so it
 * runs on staging and locally, never on live (no @smoke tag). Three trips are created here
 * and one by real-trip.spec.ts, under the create limit of 5 a minute.
 */

// Room to wait out the trip-creation limit once (see createTrip).
test.describe.configure({ mode: "serial", timeout: 180_000 });

const PRIVATE = /this trip\s*is private/i;

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function inviteLink(page: Page, tripId: string): Promise<string> {
  await page.goto(`/trip/${tripId}`);
  const match = (await page.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/);
  expect(match, "trip home shows its invite").not.toBeNull();
  return match![1]!;
}

test("one phone keeps every trip it starts and joins, listed under Your trips", async ({ browser }) => {
  const id = uniqueSuffix();
  const erin = await freshPage(browser);
  const first = await createTrip(erin, `Trips A ${id}`, { name: "Erin Two-Trips", contact: `e2e-erin-${id}@example.com` });

  // Someone else's trip, with an invite code Erin will paste.
  const sam = await freshPage(browser);
  const samTrip = await createTrip(sam, `Trips B ${id}`, { name: "Sam Host", contact: `e2e-sam-${id}@example.com` });
  const code = await inviteLink(sam, samTrip);

  // Signed in, Erin finds Sam's trip by its code and joins as herself in one tap.
  await erin.goto("/trips");
  await erin.getByLabel("Invite code or link").fill(`https://example.com/join/${code}?who=1`);
  await erin.getByRole("button", { name: /find the trip/i }).click();
  await expect(erin).toHaveURL(new RegExp(`/join/${code}`));
  await erin.getByRole("button", { name: /join as erin two-trips/i }).click();
  // Sam's new trip asks him first; once he lets Erin in, she's on it.
  await expect(erin.getByRole("heading", { name: /waiting for sam to let you in/i })).toBeVisible();
  await letIn(sam, samTrip, "Erin Two-Trips");
  await erin.goto(`/join/${code}`);
  await expect(erin.getByRole("link", { name: /you're on this trip/i })).toBeVisible();

  // Starting another trip while signed in organizes it as Erin, without signing her out of the others.
  await erin.goto("/new");
  await expect(erin.getByText(/organize this as/i)).toContainText("Erin Two-Trips");
  await expect(erin.getByLabel("Your name")).toHaveCount(0);
  const third = await createTrip(erin, `Trips C ${id}`);

  // All three are listed and all still open on this phone.
  await erin.goto("/trips");
  const list = erin.getByRole("list", { name: "Your trips" });
  await expect(list).toContainText(`Trips A ${id}`);
  await expect(list).toContainText(`Trips B ${id}`);
  await expect(list).toContainText(`Trips C ${id}`);
  await expect(list).toContainText("You're organizing");
  for (const tripId of [first, samTrip, third]) {
    await erin.goto(`/trip/${tripId}`);
    await expect(erin.getByRole("heading", { name: PRIVATE })).toHaveCount(0);
    expect((await erin.request.get(`/api/trip/${tripId}`)).status()).toBe(200);
  }

  // Sam's list shows only Sam's trip.
  await sam.goto("/trips");
  await expect(sam.getByRole("list", { name: "Your trips" })).toContainText(`Trips B ${id}`);
  await expect(sam.getByRole("list", { name: "Your trips" })).not.toContainText(`Trips A ${id}`);

  // A stranger sees no trips, a wrong code goes nowhere, and Erin's trip stays private.
  const stranger = await freshPage(browser);
  await stranger.goto("/trips");
  await expect(stranger.getByRole("list", { name: "Your trips" })).toHaveCount(0);
  await expect(stranger.getByRole("main")).not.toContainText(`Trips A ${id}`);
  await stranger.getByLabel("Invite code or link").fill("zzzzzzzzzzzz");
  await stranger.getByRole("button", { name: /find the trip/i }).click();
  await expect(stranger.getByText(/doesn't match a trip/i)).toBeVisible();
  await stranger.goto(`/trip/${first}`);
  await expect(stranger.getByRole("heading", { name: PRIVATE })).toBeVisible();
  expect((await stranger.request.get(`/api/trip/${first}`)).status()).toBe(404);

  for (const page of [erin, sam, stranger]) await page.context().close();
});

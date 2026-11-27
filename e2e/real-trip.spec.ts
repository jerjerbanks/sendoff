import { expect, test, type Browser, type Page } from "@playwright/test";
import { humanCheckDone, uniqueSuffix } from "./helpers";

/**
 * A real (non-demo) trip, created fresh: members-only access, sessions, and the
 * duplicate-contact refusal. These write data, so they run on staging and locally,
 * never on live (no @smoke tag). They create one trip and make two join attempts,
 * well under the create (5/min) and join (10/min) limits.
 */

const SESSION_COOKIE = "__Host-ft_session";

test.describe.configure({ mode: "serial" });

let organizer: { page: Page; tripId: string; invitePath: string; contact: string };

async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

test.beforeAll(async ({ browser }) => {
  const page = await freshPage(browser);
  const id = uniqueSuffix();
  const contact = `e2e-organizer-${id}@example.com`;
  await page.goto("/new");
  await page.getByLabel("Trip name").fill(`E2E trip ${id}`);
  await page.getByLabel("Your name").fill("Erin Organizer");
  await page.getByLabel("Your phone or email").fill(contact);
  await page.getByLabel("Rough date window").fill("A long weekend in May 2027");
  await humanCheckDone(page);
  await page.getByRole("button", { name: /create the trip/i }).click();
  await expect(page).toHaveURL(/\/trip\/[^/]+\/party\?welcome=1/);
  const tripId = new URL(page.url()).pathname.split("/")[2]!;

  await page.goto(`/trip/${tripId}`);
  await expect(page.getByRole("main").first()).toBeVisible();
  const invite = (await page.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/);
  expect(invite, "trip home links its invite").not.toBeNull();
  organizer = { page, tripId, invitePath: `/join/${invite![1]}`, contact };
});

test.afterAll(async () => {
  await organizer?.page.context().close();
});

test("an outsider sees \"This trip is private\" and the API answers 404", async ({ browser }) => {
  const outsider = await freshPage(browser);
  for (const path of ["", "/costs", "/vote", "/pay", "/party"]) {
    await outsider.goto(`/trip/${organizer.tripId}${path}`);
    await expect(outsider.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
    // Nothing about the trip shows on the page. (The tab title and link-preview
    // tags still carry the trip name for chat unfurls; see the handoff note.)
    await expect(outsider.getByRole("main")).not.toContainText("E2E trip");
  }
  const api = await outsider.request.get(`/api/trip/${organizer.tripId}`);
  expect(api.status()).toBe(404);
  await outsider.context().close();
});

test("the organizer can read their own trip through the API", async () => {
  const api = await organizer.page.request.get(`/api/trip/${organizer.tripId}`);
  expect(api.status()).toBe(200);
  expect((await api.json()).id).toBe(organizer.tripId);
});

test("the session cookie is an opaque, httpOnly random token", async () => {
  const cookies = await organizer.page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE);
  expect(session, `${SESSION_COOKIE} is set`).toBeTruthy();
  expect(session!.httpOnly).toBe(true);
  expect(session!.secure).toBe(true);
  expect(session!.value.length).toBeGreaterThanOrEqual(32);
  expect(session!.value).not.toContain(organizer.tripId);
  expect(session!.value).not.toContain("@");
});

test("joining with a contact that already signed in is refused; a new contact joins and stays signed in", async ({ browser }) => {
  const stranger = await freshPage(browser);
  await stranger.goto(organizer.invitePath);
  await stranger.getByLabel("Your name").fill("Mallory Imposter");
  await stranger.getByLabel("Phone or email").fill(organizer.contact);
  await humanCheckDone(stranger);
  await stranger.getByRole("button", { name: /join the trip/i }).click();
  await expect(stranger.getByText(/already joined with that phone or email/i)).toBeVisible();
  // Refused: no session, and the trip stays private to this browser.
  expect((await stranger.context().cookies()).some((cookie) => cookie.name === SESSION_COOKIE)).toBe(false);
  await stranger.goto(`/trip/${organizer.tripId}`);
  await expect(stranger.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
  await stranger.context().close();

  const friend = await freshPage(browser);
  await friend.goto(organizer.invitePath);
  await friend.getByLabel("Your name").fill("Frankie Friend");
  await friend.getByLabel("Phone or email").fill(`e2e-friend-${uniqueSuffix()}@example.com`);
  await humanCheckDone(friend);
  await friend.getByRole("button", { name: /join the trip/i }).click();
  await expect(friend).toHaveURL(new RegExp(`/trip/${organizer.tripId}/party\\?welcome=1`));
  await friend.goto(`/trip/${organizer.tripId}`);
  await expect(friend.getByRole("heading", { name: /this trip\s*is private/i })).toHaveCount(0);
  await friend.reload();
  await expect(friend.getByRole("heading", { name: /this trip\s*is private/i })).toHaveCount(0);
  expect((await friend.request.get(`/api/trip/${organizer.tripId}`)).status()).toBe(200);
  await friend.context().close();
});

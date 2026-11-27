import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTrip, humanCheckDone, uniqueSuffix } from "./helpers";

/**
 * Organizer approval of new joiners: someone turned away never sees the trip, and an
 * organizer who switches approval off lets the next person straight in. Writes data, so
 * it runs on staging and locally, never on live (no @smoke tag).
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function ask(page: Page, invite: string, name: string, contact: string, button: RegExp) {
  await page.goto(`/join/${invite}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Phone or email").fill(contact);
  await humanCheckDone(page);
  await page.getByRole("button", { name: button }).click();
}

test("the organizer turns someone away, then lets the next person straight in", async ({ browser }) => {
  const id = uniqueSuffix();
  const gail = await freshPage(browser);
  const tripId = await createTrip(gail, `Gate trip ${id}`, { name: "Gail Gatekeeper", contact: `e2e-gail-${id}@example.com` });
  await gail.goto(`/trip/${tripId}`);
  const invite = (await gail.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/)![1]!;

  // Ned asks. Gail sees his name and contact, and turns him away.
  const ned = await freshPage(browser);
  await ask(ned, invite, "Ned Nobody", `e2e-ned-${id}@example.com`, /^ask to join$/i);
  await expect(ned.getByRole("heading", { name: /waiting for gail to let you in/i })).toBeVisible();
  await gail.goto(`/trip/${tripId}/joiners`);
  const waiting = gail.getByRole("list", { name: "People waiting to join" });
  await expect(waiting).toContainText("Ned Nobody");
  await expect(waiting).toContainText(`e2e-ned-${id}@example.com`);
  await gail.getByRole("button", { name: "Not this trip" }).click();
  await expect(waiting).not.toContainText("Ned Nobody");

  // Ned is told, still sees nothing of the trip, and can't ask again from another phone.
  await ned.goto(`/join/${invite}`);
  await expect(ned.getByText(/gail didn't add you to this trip/i)).toBeVisible();
  await ned.goto(`/trip/${tripId}`);
  await expect(ned.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
  expect((await ned.request.get(`/api/trip/${tripId}`)).status()).toBe(404);
  const nedAgain = await freshPage(browser);
  await ask(nedAgain, invite, "Ned Again", `e2e-ned-${id}@example.com`, /^ask to join$/i);
  await expect(nedAgain.getByText(/already asked to join with that phone or email/i)).toBeVisible();

  // Gail switches approval off: the next person joins straight away.
  await gail.goto(`/trip/${tripId}/joiners`);
  await gail.getByLabel(/anyone with the link joins straight away/i).check();
  await gail.getByRole("button", { name: "Save" }).click();
  await expect(gail.getByText(/anyone with the invite link joins straight away/i)).toBeVisible();
  const pia = await freshPage(browser);
  await ask(pia, invite, "Pia Prompt", `e2e-pia-${id}@example.com`, /^join the trip$/i);
  await expect(pia).toHaveURL(new RegExp(`/trip/${tripId}/party\\?welcome=1`));

  for (const page of [gail, ned, nedAgain, pia]) await page.context().close();
});

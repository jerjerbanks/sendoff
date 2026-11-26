import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTrip, humanCheckDone, uniqueSuffix } from "./helpers";

/**
 * Leaving and deleting a trip from Your trips, and "/" no longer jumping into a trip.
 * Writes data, so it runs on staging and locally, never on live (no @smoke tag).
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

test("a member leaves, then the organizer deletes the trip for everyone", async ({ browser }) => {
  const id = uniqueSuffix();
  const NAME = `Exit trip ${id}`;
  const olivia = await freshPage(browser);
  const tripId = await createTrip(olivia, NAME, { name: "Olivia Organizer", contact: `e2e-olivia-${id}@example.com` });
  await olivia.goto(`/trip/${tripId}`);
  const invite = (await olivia.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/)![1]!;

  const mo = await freshPage(browser);
  await mo.goto(`/join/${invite}`);
  await mo.getByLabel("Your name").fill("Mo Member");
  await mo.getByLabel("Phone or email").fill(`e2e-mo-${id}@example.com`);
  await humanCheckDone(mo);
  await mo.getByRole("button", { name: /join the trip/i }).click();
  await expect(mo).toHaveURL(new RegExp(`/trip/${tripId}/party\\?welcome=1`));

  // "/" shows the landing page to a signed-in person, with a way to their trips.
  await olivia.goto("/");
  await expect(olivia).toHaveURL(/\/$/);
  await olivia.getByRole("link", { name: "Your trips" }).click();
  await expect(olivia).toHaveURL(/\/trips$/);

  // Mo commits a buy-in first, so leaving has money to hand back. A bed has to exist first.
  for (const room of ["Room one", "Room two"]) {
    await olivia.goto(`/trip/${tripId}/sleep`);
    await olivia.getByLabel("Room name").fill(room);
    await olivia.getByRole("button", { name: "Add bed" }).click();
    await expect(olivia.getByText(room).first()).toBeVisible();
  }
  await olivia.goto(`/trip/${tripId}/pay`);
  await olivia.getByLabel("Buy-in per party").fill("50");
  await olivia.getByLabel("Paying parties needed to book").fill("3");
  await olivia.getByLabel("Deadline (US Central)").fill("2027-05-01T12:00");
  await olivia.getByRole("button", { name: "Open buy-in" }).click();
  await expect(olivia).toHaveURL(/opened=1/);
  await mo.goto(`/trip/${tripId}/pay`);
  await mo.getByLabel(/refundable only until the stay is booked/i).check();
  await mo.getByRole("button", { name: /^Commit/ }).click();
  await expect(mo).toHaveURL(/committed=1/);
  await olivia.goto(`/trip/${tripId}/pay`);
  await expect(olivia.getByRole("main")).not.toContainText("Nobody's in yet");

  // The confirm box is required.
  await mo.goto("/trips");
  await mo.getByText("Leave this trip").click();
  await mo.getByRole("button", { name: "Leave trip" }).click();
  await expect(mo).toHaveURL(/\/trips$/);
  await mo.getByLabel(`Yes, leave ${NAME}`).check();
  await mo.getByRole("button", { name: "Leave trip" }).click();
  await expect(mo.getByRole("status")).toContainText(/you left the trip/i);
  await expect(mo.getByRole("list", { name: "Your trips" })).toContainText("You're off this trip");
  await expect(mo.getByText("Leave this trip")).toHaveCount(0);

  // Mo's buy-in is handed back: the trip is back to nobody committed.
  await olivia.goto(`/trip/${tripId}/pay`);
  await expect(olivia.getByRole("main")).toContainText("Nobody's in yet");

  // The organizer can't leave, only delete.
  await olivia.goto("/trips");
  await expect(olivia.getByText("Leave this trip")).toHaveCount(0);
  await olivia.getByText("Delete this trip").click();
  await olivia.getByLabel(`Yes, delete ${NAME}`).check();
  await olivia.getByRole("button", { name: "Delete trip" }).click();
  await expect(olivia.getByRole("status")).toContainText(/trip deleted/i);
  await expect(olivia.getByText(NAME)).toHaveCount(0);

  // Gone for everyone: pages, API and invite link.
  for (const page of [olivia, mo]) {
    await page.goto(`/trip/${tripId}`);
    await expect(page.getByRole("heading", { name: /nothing at this address|no trip here/i })).toBeVisible();
    expect((await page.request.get(`/api/trip/${tripId}`)).status()).toBe(404);
    await page.goto("/trips");
    await expect(page.getByText(NAME)).toHaveCount(0);
  }
  const stranger = await freshPage(browser);
  await stranger.goto(`/join/${invite}`);
  await expect(stranger.getByRole("button", { name: /join the trip/i })).toHaveCount(0);
});

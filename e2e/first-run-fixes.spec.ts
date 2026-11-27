import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTrip, humanCheckDone, JOIN_BUTTON, letIn, settled, uniqueSuffix } from "./helpers";

/**
 * Two first-run bugs: a create-form error used to wipe everything typed, and "Set a private
 * budget" kept coming back after someone chose not to say. Writes data, so it runs on staging
 * and locally, never on live (no @smoke tag).
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

test("a create-form error keeps what was typed", async ({ browser }) => {
  const page = await freshPage(browser);
  await page.goto("/new");
  await settled(page);
  await page.getByLabel("Trip name").fill("Typed and kept");
  await page.getByLabel("Family").check();
  await page.getByLabel("Type").selectOption("bachelorette");
  await page.getByLabel("Your name").fill("Kim Keeper");
  await page.getByLabel("Your phone or email").fill("not a contact");
  await page.getByLabel("Guest of honor 1", { exact: true }).fill("Casey");
  await page.getByLabel("Rough date window").fill("June 2027");
  await humanCheckDone(page);
  await page.getByRole("button", { name: /create the trip/i }).click();
  await page.waitForURL(/\/new\?error=/);
  await expect(page.getByText(/add a phone number or an email address/i)).toBeVisible();
  await expect(page.getByLabel("Trip name")).toHaveValue("Typed and kept");
  await expect(page.getByLabel("Family")).toBeChecked();
  await expect(page.getByLabel("Type")).toHaveValue("bachelorette");
  await expect(page.getByLabel("Your name")).toHaveValue("Kim Keeper");
  await expect(page.getByLabel("Your phone or email")).toHaveValue("not a contact");
  await expect(page.getByLabel("Guest of honor 1", { exact: true })).toHaveValue("Casey");
  await expect(page.getByLabel("Rough date window")).toHaveValue("June 2027");
});

test("a skipped budget stops coming back as the next step", async ({ browser }) => {
  const id = uniqueSuffix();
  const org = await freshPage(browser);
  const tripId = await createTrip(org, `Skip trip ${id}`, { name: "Olga Organizer", contact: `e2e-olga-${id}@example.com` });
  await org.goto(`/trip/${tripId}/vote?q=destination`);
  await org.getByLabel("A place").fill("Lake Geneva, WI");
  await org.getByRole("button", { name: "Add option" }).click();
  await expect(org.getByText("Lake Geneva, WI").first()).toBeVisible();
  await org.goto(`/trip/${tripId}`);
  const invite = (await org.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/)![1]!;

  const sam = await freshPage(browser);
  await sam.goto(`/join/${invite}`);
  await sam.getByLabel("Your name").fill("Sam Skipper");
  await sam.getByLabel("Phone or email").fill(`e2e-sam-${id}@example.com`);
  await humanCheckDone(sam);
  await sam.getByRole("button", { name: JOIN_BUTTON }).click();
  await letIn(org, tripId, "Sam Skipper");

  await sam.goto(`/trip/${tripId}`);
  await expect(sam.getByText("Set a private budget")).toBeVisible();
  await sam.goto(`/trip/${tripId}/budget`);
  await sam.getByRole("button", { name: /rather not say/i }).click();
  await expect(sam).toHaveURL(new RegExp(`/trip/${tripId}/vote`));
  await sam.goto(`/trip/${tripId}`);
  await expect(sam.getByText("Vote on where")).toBeVisible();
  await expect(sam.getByText("Set a private budget")).toHaveCount(0);
});

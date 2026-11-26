import { expect, test } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

/**
 * Someone who isn't on a real trip learns nothing from its URL: not on the page,
 * not in the tab title or link preview, not in the code the page streams (which
 * once carried the whole trip, invite link included). Writes one trip: staging
 * and local only.
 */
test("an outsider gets nothing about a real trip from its URL", async ({ browser }) => {
  const id = uniqueSuffix();
  const name = `Hidden Cabin ${id}`;
  const organizerName = `Orla ${id}`;
  const organizer = await (await browser.newContext()).newPage();
  await organizer.goto("/new");
  await organizer.waitForLoadState("networkidle");
  await organizer.getByLabel("Trip name").fill(name);
  await organizer.getByLabel("Your name").fill(organizerName);
  await organizer.getByLabel("Your phone or email").fill(`e2e-preview-${id}@example.com`);
  await organizer.getByLabel("Rough date window").fill("A long weekend in May 2027");
  await organizer.getByRole("button", { name: /create the trip/i }).click();
  await expect(organizer).toHaveURL(/\/trip\/[^/]+\/party\?welcome=1/);
  const tripId = new URL(organizer.url()).pathname.split("/")[2]!;
  await organizer.goto(`/trip/${tripId}`);
  await expect(organizer).toHaveTitle(new RegExp(name.split(" ")[0]!));
  const token = (await organizer.content()).match(/\/join\/([A-Za-z0-9_-]{6,})/)![1]!;

  const outsider = await (await browser.newContext()).newPage();
  const paths = ["", "/costs", "/vote", "/pay", "/party", "/budget", "/spots", "/sleep", "/organize", "/settings", "/book", "/metrics", "/approvals"];
  for (const path of paths) {
    await outsider.goto(`/trip/${tripId}${path}`);
    await expect(outsider.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
    await expect(outsider).toHaveTitle(/^Private trip/);
    await outsider.waitForLoadState("networkidle");
    const html = await outsider.content();
    for (const secret of [name, organizerName, token]) {
      expect(html, `${path || "/"} must not carry "${secret}"`).not.toContain(secret);
    }
    await expect(outsider.locator('meta[property="og:title"]')).toHaveAttribute("content", /You're invited to a trip/);
  }
  await organizer.context().close();
  await outsider.context().close();
});

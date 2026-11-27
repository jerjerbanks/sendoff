import { expect, test } from "@playwright/test";
import { freshDemo, tourStep, settled } from "./helpers";

/** Public pages and behavior from past handoff checks. All read-only (@smoke). */

test("landing page offers a way to start and a sample trip @smoke", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("link", { name: /start a trip/i }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sample trip/i }).first()).toBeAttached();
});

test("/new: Adult or Family, an occasion for Adult only, and guests of honor only for wedding occasions @smoke", async ({ page }) => {
  await page.goto("/new");
  // Let the form hydrate first: a pick made before then is reset by hydration.
  await settled(page);
  const adult = page.getByRole("radio", { name: "Adult" });
  const family = page.getByRole("radio", { name: "Family" });
  await expect(adult).toBeChecked();
  await expect(family).not.toBeChecked();
  const occasion = page.getByRole("combobox", { name: /^occasion/i });
  const honoree = page.getByLabel("Guest of honor 1", { exact: true });
  await expect(honoree).toBeHidden();
  for (const wedding of ["Bachelor party", "Bachelorette party", "Joint bach party"]) {
    await occasion.selectOption({ label: wedding });
    await expect(honoree, `guests of honor show for ${wedding}`).toBeVisible();
  }
  // A family trip has no bachelor or bachelorette: the occasion and guests of honor go away.
  await family.check();
  await expect(occasion).toBeHidden();
  await expect(honoree).toBeHidden();
  await adult.check();
  await expect(occasion).toBeVisible();
  await occasion.selectOption({ label: "No special occasion" });
  await expect(honoree).toBeHidden();
});

test("the buy-in says no real money moves before you commit @smoke", async ({ page }) => {
  await freshDemo(page);
  await tourStep(page, 4);
  await expect(page.getByText(/test mode: no real money moves/i).filter({ visible: true }).first()).toBeVisible();
});

test("an unknown trip id answers 404 from the API @smoke", async ({ request }) => {
  const response = await request.get("/api/trip/e2e-no-such-trip");
  expect(response.status()).toBe(404);
});

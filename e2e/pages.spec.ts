import { expect, test } from "@playwright/test";
import { freshDemo, tourStep, settled } from "./helpers";

/** Public pages and behavior from past handoff checks. All read-only (@smoke). */

test("landing page offers a way to start and a sample trip @smoke", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("link", { name: /start a trip/i }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sample trip/i }).first()).toBeAttached();
});

test("/new: Adult or Family, a Type, and guests of honor only for wedding types @smoke", async ({ page }) => {
  await page.goto("/new");
  // Let the form hydrate first: a pick made before then is reset by hydration.
  await settled(page);
  const adult = page.getByRole("radio", { name: "Adult" });
  const family = page.getByRole("radio", { name: "Family" });
  await expect(adult).toBeChecked();
  await expect(family).not.toBeChecked();
  const type = page.getByRole("combobox", { name: /^type/i });
  const honoree = page.getByLabel("Guest of honor 1", { exact: true });
  await expect(honoree).toBeHidden();
  for (const wedding of ["Bachelor", "Bachelorette", "Joint"]) {
    await type.selectOption({ label: wedding });
    await expect(honoree, `guests of honor show for ${wedding}`).toBeVisible();
  }
  await type.selectOption({ label: "None / other" });
  await expect(honoree).toBeHidden();
  await family.check();
  await type.selectOption({ label: "Joint" });
  await expect(honoree).toBeVisible();
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

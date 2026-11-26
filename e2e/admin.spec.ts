import { expect, test } from "@playwright/test";

/**
 * The operator usage page shows nothing without the admin key: a 404 where ADMIN_KEY
 * isn't set, otherwise only the key form. Read-only, so it runs on live too.
 */
test("/admin shows no usage without the admin key @smoke", async ({ page }) => {
  const response = await page.goto("/admin");
  if (response?.status() === 404) return;
  await expect(page.getByLabel("Admin key")).toBeVisible();
  await expect(page.getByText(/at a glance/i)).toHaveCount(0);
  await expect(page.getByText(/trips in all/i)).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

/**
 * The operator usage page shows nothing without the admin key: a 404 where ADMIN_KEY
 * isn't set, otherwise only the key form, and a wrong key gets nothing either. The usage
 * ping endpoint answers every caller with an empty 204. Read-only, so it runs on live too.
 */
test("/admin shows no usage without the admin key @smoke", async ({ page }) => {
  const response = await page.goto("/admin");
  if (response?.status() === 404) return;
  await expect(page.getByLabel("Admin key")).toBeVisible();
  await expect(page.getByText(/at a glance/i)).toHaveCount(0);
  await expect(page.getByText(/trips in all/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "People" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Trips and invites/i })).toHaveCount(0);
});

test("/admin refuses a wrong key @smoke", async ({ page }) => {
  const response = await page.goto("/admin");
  if (response?.status() === 404) return;
  await page.getByLabel("Admin key").fill("not-the-admin-key-not-the-admin-key");
  await page.getByRole("button", { name: "Open" }).click();
  await expect(page.getByText(/That key isn't right|Too many tries/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "People" })).toHaveCount(0);
  await expect(page.getByText(/Invite link opened/i)).toHaveCount(0);
});

test("usage pings tell a caller nothing @smoke", async ({ request }) => {
  for (const data of [{ s: 30, path: "/trips" }, { invite: "no-such-invite-token" }, { s: "lots" }, {}]) {
    const response = await request.post("/api/ping", { data });
    expect(response.status()).toBe(204);
    expect(await response.text()).toBe("");
  }
});

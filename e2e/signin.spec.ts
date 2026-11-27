import { expect, test } from "@playwright/test";
import { humanCheckDone } from "./helpers";

/**
 * Email sign-in codes. CI can't read an inbox, so this checks the parts that never send:
 * the page, the neutral "check your email" step (an example.com address is never mailed),
 * and that a wrong code is refused. The real send is a manual live check.
 */
test("sign in with email: asks for an email, then a code, and refuses a wrong code", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await page.getByLabel("Email").fill("nobody.here@example.com");
  await humanCheckDone(page);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  await page.getByLabel("Sign-in code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("That code didn't work");
  // Still signed out: Your trips offers the way back in.
  await page.goto("/trips");
  await expect(page.getByRole("link", { name: "Sign in with email" })).toBeVisible();
});

test("the sign-in page loads and only redirects to our own pages @smoke", async ({ page }) => {
  const response = await page.goto("/signin?next=https://evil.example/");
  expect(response?.status()).toBe(200);
  await expect(page.locator('input[name="next"]')).toHaveValue("/trips");
});

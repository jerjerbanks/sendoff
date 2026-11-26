import { expect, type Page } from "@playwright/test";
import { TOUR } from "../src/lib/demo-tour";

export { TOUR };

/** Start the guided demo at step `n`. Step 1 also restores the demo trips to their seed. */
export async function tourStep(page: Page, n: number) {
  const step = TOUR.find((item) => item.n === n);
  if (!step) throw new Error(`No tour step ${n}`);
  await page.goto(`/demo/${n}`);
  await expect(page).toHaveURL(urlFor(step.path));
}

/** Every tour starts clean: step 1 reseeds the demo and lake trips. */
export async function freshDemo(page: Page) {
  await tourStep(page, 1);
}

/** Matches a path (with any query) on whatever host the suite runs against. */
export function urlFor(path: string): RegExp {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^https?://[^/]+${escaped}(?:[?#].*)?$`);
}

/**
 * The full HTML the server sent, including the streamed React payload. Privacy
 * checks run against this rather than the visible text, so a value that is merely
 * hidden on screen still fails them.
 */
export async function served(page: Page): Promise<string> {
  await page.waitForLoadState("networkidle");
  return page.content();
}

/** Assert none of `needles` reach this browser, visible or not. */
export async function expectNotServed(page: Page, needles: string[]) {
  const html = await served(page);
  for (const needle of needles) {
    expect(html, `"${needle}" must not reach this viewer on ${page.url()}`).not.toContain(needle);
  }
}

/**
 * The demo's "viewing as" switcher: become another member of a demo trip.
 * It sits behind a disclosure in the demo bar.
 */
export async function becomeDemoPerson(page: Page, fullName: string) {
  const person = page.getByRole("button", { name: new RegExp(`^${fullName}\\b`) });
  if (!(await person.isVisible())) {
    await page.getByLabel(/who you're viewing as/i).first().click();
  }
  await person.click();
  // The switch is a server action; wait until the page says we're this person.
  await expect(page.getByRole("button", { name: new RegExp(`^${fullName}\\b.*You$`) })).toBeAttached();
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const TOO_MANY = /too many tries/i;

/**
 * Start a real trip from /new and return its id. Trip creation is limited to 5 a minute
 * per address, and several specs create trips, so a refusal waits out the window once.
 */
export async function createTrip(page: Page, name: string, who?: { name: string; contact: string }): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.goto("/new");
    await page.getByLabel("Trip name").fill(name);
    if (who) {
      await page.getByLabel("Your name").fill(who.name);
      await page.getByLabel("Your phone or email").fill(who.contact);
    }
    await page.getByLabel("Rough date window").fill("A long weekend in June 2027");
    await page.getByRole("button", { name: /create the trip/i }).click();
    await page.waitForURL(/\/trip\/[^/]+\/party\?welcome=1|\/new\?error=/);
    if (/\/trip\//.test(page.url())) return new URL(page.url()).pathname.split("/")[2]!;
    expect(decodeURIComponent(page.url()), "only the rate limit may refuse a valid trip").toMatch(TOO_MANY);
    // Fixed one-minute windows: wait until the next one starts.
    await page.waitForTimeout(61_000 - (Date.now() % 60_000));
  }
  throw new Error("Trip creation stayed rate limited");
}

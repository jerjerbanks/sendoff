import { expect, test } from "@playwright/test";
import { TOUR, becomeDemoPerson, expectNotServed, freshDemo, tourStep, urlFor } from "./helpers";

/**
 * The seeded demo trips: the numbers in the project invariants, budget privacy,
 * and the tour. Tests tagged @smoke are safe on live: they only open demo pages,
 * which any visitor's "See a sample trip" does too.
 */

test.describe("demo numbers", () => {
  test("Chris pays $1,414 at 4 parties @smoke", async ({ page }) => {
    await freshDemo(page);
    await expect(page.getByText("$1,414").filter({ visible: true }).first()).toBeVisible();
    await page.goto("/trip/trip_demo/costs");
    await expect(page.getByText(/if 4 parties go/i)).toBeVisible();
    await expect(page.getByText("$1,414").filter({ visible: true }).first()).toBeVisible();
  });

  test("Taylor's commit totals $728 @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 4);
    await expect(page.getByText("$728").filter({ visible: true }).first()).toBeVisible();
    await page.goto("/trip/trip_demo/costs");
    await expect(page.getByText("$728").filter({ visible: true }).first()).toBeVisible();
  });

  test("Lake shares: Harpers $1,922, Chens $915, Riveras $1,036, Kim $639, $2 pot @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 7);
    const parties: [string, string, RegExp][] = [
      ["Maya Harper", "$1,922", /harpers/i],
      ["Priya Chen", "$915", /chens/i],
      ["Helen Rivera", "$1,036", /riveras/i],
      ["Noah Kim", "$639", /kim/i],
    ];
    for (const [person, amount, party] of parties) {
      await page.goto("/trip/trip_lake/costs");
      if (person !== "Maya Harper") await becomeDemoPerson(page, person);
      await page.goto("/trip/trip_lake/costs");
      await expect(page.getByText(party).filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText(amount).filter({ visible: true }).first(), `${person}'s party share`).toBeVisible();
      await expect(page.getByText(/\$2\.00 in the trip pot/)).toBeVisible();
    }
  });
});

test.describe("budget privacy", () => {
  test("Drew sees his own $81 over on Cabo @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 3);
    await expect(page.getByText(/you're \$81 over/i).filter({ visible: true }).first()).toBeVisible();
    // The group tag never names anyone.
    await expect(page.getByText(/fits most/i).filter({ visible: true }).first()).toBeVisible();
  });

  test("Chris never sees Drew's $81 over or Drew's $1,400 budget @smoke", async ({ page }) => {
    await freshDemo(page);
    for (const path of ["", "/vote", "/costs", "/pay", "/spots", "/party", "/budget", "/organize", "/settings", "/metrics"]) {
      await page.goto(`/trip/trip_demo${path}`);
      await expect(page.getByRole("navigation").or(page.getByRole("main")).filter({ visible: true }).first()).toBeVisible();
      await expectNotServed(page, ["$81 over", "$1,400", "140000"]);
    }
  });

  test("Noah never sees George's Mobility note @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 7);
    await becomeDemoPerson(page, "Noah Kim");
    for (const path of ["", "/vote", "/costs", "/pay", "/sleep", "/spots", "/party", "/budget"]) {
      await page.goto(`/trip/trip_lake${path}`);
      await expect(page.getByRole("main").filter({ visible: true }).first()).toBeVisible();
      await expectNotServed(page, ["Mobility"]);
    }
  });

  test("the trip API never carries another member's budget line @smoke", async ({ page }) => {
    await freshDemo(page);
    const response = await page.request.get("/api/trip/trip_demo");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).not.toContain("$81 over");
    expect(body).not.toContain("140000");
    expect(body).not.toContain("$1,400");
  });
});

test.describe("demo tour", () => {
  test("Next walks steps 1 to 7 and Back walks home @smoke", async ({ page }) => {
    await freshDemo(page);
    for (const step of TOUR.slice(1)) {
      await page.getByRole("link", { name: /^next/i }).first().click();
      await expect(page, `Next to step ${step.n}`).toHaveURL(urlFor(step.path));
    }
    for (const step of [...TOUR].reverse().slice(1)) {
      await page.getByRole("link", { name: /^back/i }).first().click();
      await expect(page, `Back to step ${step.n}`).toHaveURL(urlFor(step.path));
    }
    // The last step hands off to starting a real trip.
    await tourStep(page, 7);
    await expect(page.getByRole("link", { name: /start your/i }).filter({ visible: true }).first()).toBeVisible();
  });

  test("POST /demo/reset restores the seeded numbers", async ({ page }) => {
    await freshDemo(page);
    // Step 6 commits Taylor and runs the deadline, which re-splits Chris's share.
    await tourStep(page, 6);
    await page.goto("/trip/trip_demo/costs");
    await expect(page.getByText(/if 5 parties go/i)).toBeVisible();
    await expect(page.getByText("$1,414")).toHaveCount(0);

    const reset = await page.request.post("/demo/reset");
    expect(reset.status()).toBeLessThan(400);

    await page.goto("/trip/trip_demo/costs");
    await expect(page.getByText(/if 4 parties go/i)).toBeVisible();
    await expect(page.getByText("$1,414").filter({ visible: true }).first()).toBeVisible();
  });
});

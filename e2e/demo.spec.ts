import { expect, test } from "@playwright/test";
import { TOUR, becomeDemoPerson, expectNotServed, freshDemo, tourStep, urlFor } from "./helpers";

/**
 * The seeded demo trips (Demo Narratives v1): the numbers in the project invariants, budget
 * privacy, and the tour. Tests tagged @smoke are safe on live: they only open demo pages,
 * which any visitor's "See a sample trip" does too.
 */

test.describe("demo numbers", () => {
  test("golf at 6 parties: Evan $1,350, Jamal $925, Chris $705 @smoke", async ({ page }) => {
    await freshDemo(page);
    // Step 6: Chris Delgado has paid, so six of the six needed are in.
    await tourStep(page, 6);
    await expect(page.getByText(/if 6 parties go/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("$1,350").filter({ visible: true }).first(), "Evan's all-in").toBeVisible();
    for (const [person, amount] of [
      ["Jamal Wright", "$925"],
      ["Chris Delgado", "$705"],
      ["Marcus Hale", "$1,165"],
    ] as const) {
      await becomeDemoPerson(page, person);
      await page.goto("/trip/trip_golf/costs");
      await expect(page.getByText(amount).filter({ visible: true }).first(), `${person}'s all-in`).toBeVisible();
    }
  });

  test("golf before the climax: 5 of 6 in, Chris pays $705 with a $200 buy-in @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 5);
    await expect(page.getByText(/you make six/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("$705").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("$200").filter({ visible: true }).first()).toBeVisible();
  });

  test("voters see each course's green fee and each extra's price @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 3);
    for (const price of ["$450 a person", "$250 a person", "$190 a person", "$90 a person", "$45 a person", "$95 a person"]) {
      await expect(page.getByText(price).filter({ visible: true }).first(), price).toBeVisible();
    }
  });

  test("Lake shares: Harpers $1,922, Chens $915, Riveras $1,036, Kim $639, $2 pot @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 10);
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

  test("the lake trip reads as Lake & cabin, never golf @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 10);
    await expect(page.getByText(/lake & cabin · 10 people/i).filter({ visible: true }).first()).toBeVisible();
    for (const path of ["", "/vote", "/pay"]) {
      await page.goto(`/trip/trip_lake${path}`);
      await expectNotServed(page, ["Golf trip", "Tee times", "Mini golf"]);
    }
  });
});

test.describe("budget privacy", () => {
  test("Evan sees his own $100 over @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 6);
    await expect(page.getByText(/you're \$100 over your budget/i).filter({ visible: true }).first()).toBeVisible();
  });

  test("Marcus never sees Evan's $100 over or Evan's $1,250 budget @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 6);
    await becomeDemoPerson(page, "Marcus Hale");
    for (const path of ["", "/vote", "/costs", "/pay", "/spots", "/party", "/budget", "/organize", "/settings", "/metrics"]) {
      await page.goto(`/trip/trip_golf${path}`);
      await expect(page.getByRole("navigation").or(page.getByRole("main")).filter({ visible: true }).first()).toBeVisible();
      await expectNotServed(page, ["$100 over", "$1,250", "125000"]);
    }
  });

  test("Noah never sees George's Mobility note @smoke", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 10);
    await becomeDemoPerson(page, "Noah Kim");
    for (const path of ["", "/vote", "/costs", "/pay", "/sleep", "/spots", "/party", "/budget"]) {
      await page.goto(`/trip/trip_lake${path}`);
      await expect(page.getByRole("main").filter({ visible: true }).first()).toBeVisible();
      await expectNotServed(page, ["Mobility"]);
    }
  });

  test("the trip API never carries another member's budget line @smoke", async ({ page }) => {
    await freshDemo(page);
    const response = await page.request.get("/api/trip/trip_golf");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).not.toContain("$100 over");
    expect(body).not.toContain("125000");
    expect(body).not.toContain("$1,250");
  });
});

test.describe("demo tour", () => {
  test("/demo picks a sample trip, golf first @smoke", async ({ page }) => {
    await page.goto("/demo");
    const golf = page.getByRole("link", { name: /scottsdale golf weekend/i });
    await expect(golf).toHaveAttribute("href", "/demo/1");
    await expect(page.getByRole("link", { name: /harper lake house/i })).toHaveAttribute("href", "/demo/10");
    await page.goto("/demo?trip=trip_lake");
    await expect(page).toHaveURL(urlFor("/trip/trip_lake"));
  });

  test("Next walks every step and Back walks home @smoke", async ({ page }) => {
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
    await tourStep(page, TOUR.length);
    await expect(page.getByRole("link", { name: /start your/i }).filter({ visible: true }).first()).toBeVisible();
  });

  test("the deadline moves Ben Walsh and Kyle Brennan off and the house is ready to book", async ({ page }) => {
    await freshDemo(page);
    await tourStep(page, 7);
    await page.getByRole("button", { name: /^run (the )?deadline$/i }).filter({ visible: true }).first().click();
    await expect(page.getByText(/2 parties are off the trip/i).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/ready to book/i).filter({ visible: true }).first()).toBeVisible();
  });

  test("POST /demo/reset restores the seeded numbers", async ({ page }) => {
    await freshDemo(page);
    // Step 8 commits Chris Delgado and runs the deadline.
    await tourStep(page, 8);
    await page.goto("/trip/trip_golf/costs");
    await expect(page.getByText(/if 6 parties go/i)).toBeVisible();

    const reset = await page.request.post("/demo/reset");
    expect(reset.status()).toBeLessThan(400);

    await page.goto("/trip/trip_golf/costs");
    await expect(page.getByText(/if 5 parties go/i)).toBeVisible();
  });

  test("the retired bachelor demo is gone @smoke", async ({ page }) => {
    await freshDemo(page);
    const response = await page.request.get("/api/trip/trip_demo");
    expect(response.status()).toBe(404);
  });
});

test("visitors starting the tour at the same moment all get in", async ({ playwright, baseURL }) => {
  // Each /demo/1 reseeds the shared demo trips; overlapping reseeds once collided (500).
  const contexts = await Promise.all([1, 2, 3, 4].map(() => playwright.request.newContext({ baseURL })));
  const responses = await Promise.all(contexts.map((context) => context.get("/demo/1", { maxRedirects: 0 })));
  for (const response of responses) expect(response.status(), "every /demo/1 redirects into the tour").toBeLessThan(400);
  await Promise.all(contexts.map((context) => context.dispose()));
});

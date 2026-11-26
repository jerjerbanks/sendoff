import { expect, test, type Browser, type Page } from "@playwright/test";
import { createTrip, expectNotServed, uniqueSuffix } from "./helpers";

/**
 * Data isolation: someone who edits the ids in their own forms can't read or change a trip
 * they aren't on. Alice organizes trip A, Bob organizes trip B. Alice rewrites the hidden
 * fields of forms on her own pages to point at Bob's trip, or at Bob's costs, poll, buy-in,
 * party and travelers, and submits them. Bob's trip must come through untouched.
 *
 * Writes data, so it runs on staging and locally, never on live (no @smoke tag).
 */

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function freshPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

/** The value of the first field called `name` on the page. */
async function fieldValue(page: Page, name: string): Promise<string> {
  const value = await page.locator(`[name="${name}"]`).first().getAttribute("value");
  expect(value, `${name} on ${page.url()}`).toBeTruthy();
  return value!;
}

/**
 * Submit the form on `path` that holds a field named `anchor`, with `values` swapped in for
 * (or added to) its fields, the way someone with dev tools could. Browser validation is off
 * and selects are replaced by plain values, so the server sees exactly what is sent here.
 * Waits for the server action's response.
 */
async function forge(page: Page, path: string, anchor: string, values: Record<string, string>) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  const posted = page.waitForResponse((r) => r.request().method() === "POST", { timeout: 20_000 });
  await page.evaluate(
    ({ anchor, values }) => {
      const form = document.querySelector(`form [name="${anchor}"]`)?.closest("form");
      if (!form) throw new Error(`No form with a ${anchor} field on ${location.pathname}`);
      for (const [name, value] of Object.entries(values)) {
        form.querySelectorAll(`[name="${name}"]`).forEach((el) => el.removeAttribute("name"));
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      form.noValidate = true;
      form.requestSubmit();
    },
    { anchor, values },
  );
  await posted;
  await page.waitForLoadState("networkidle");
}

test("hand-edited ids can't read or change someone else's trip", async ({ browser }) => {
  const id = uniqueSuffix();
  const MARK = `Alice was here ${id}`;
  const ALICE = `Alice Isolation ${id}`;
  const BOB_COST = `Bob's cabin ${id}`;

  const alice = await freshPage(browser);
  const tripA = await createTrip(alice, `Iso A ${id}`, { name: ALICE, contact: `e2e-alice-${id}@example.com` });
  const bob = await freshPage(browser);
  const tripB = await createTrip(bob, `Iso B ${id}`, { name: `Bob Isolation ${id}`, contact: `e2e-bob-${id}@example.com` });

  // Each organizer sets up a cost and a buy-in on their own trip. These go through the same
  // form-editing helper, so they also prove the helper reaches the server.
  const setUp = async (page: Page, trip: string, label: string) => {
    await forge(page, `/trip/${trip}/costs`, "splitType", {
      tripId: trip,
      label,
      amount: "400",
      category: "lodging",
      splitType: "shared",
    });
    await page.goto(`/trip/${trip}/costs`);
    await expect(page.getByText(label).first()).toBeVisible();
    await forge(page, `/trip/${trip}/pay`, "minHeadcount", {
      tripId: trip,
      amount: "50",
      minHeadcount: "1",
      deadline: "2027-05-01T12:00",
    });
    await page.goto(`/trip/${trip}/pay`);
    await expect(page.locator('[name="milestoneId"]').first()).toBeAttached();
  };
  await setUp(bob, tripB, BOB_COST);
  await setUp(alice, tripA, `Alice's cabin ${id}`);

  // Bob's ids, as Alice could learn them from a shared screenshot or a guess.
  await bob.goto(`/trip/${tripB}/costs`);
  const bobCost = await fieldValue(bob, "costId");
  await bob.goto(`/trip/${tripB}/vote`);
  const bobPoll = await fieldValue(bob, "pollId");
  await bob.goto(`/trip/${tripB}/pay`);
  const bobMilestone = await fieldValue(bob, "milestoneId");
  await bob.goto(`/trip/${tripB}/party`);
  const bobParty = await fieldValue(bob, "partyUserId");
  const bobTraveler = await fieldValue(bob, "travelerId");
  await bob.goto(`/trip/${tripB}/settings`);
  const bobMinPayers = await bob.locator('[name="minPayers"]').first().inputValue();

  // Reading: Bob's trip is private to Alice, on every page and through the API.
  for (const path of ["", "/costs", "/vote", "/pay", "/party", "/settings", "/sleep"]) {
    await alice.goto(`/trip/${tripB}${path}`);
    await expect(alice.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
    await expectNotServed(alice, [BOB_COST]);
  }
  expect((await alice.request.get(`/api/trip/${tripB}`)).status()).toBe(404);
  expect((await alice.request.get(`/api/trip/${tripA}`)).status()).toBe(200);

  // Writing: Bob's trip id, or Bob's child ids under Alice's own trip id.
  const A = `/trip/${tripA}`;
  for (const tripId of [tripB, tripA]) {
    await forge(alice, `${A}/costs`, "splitType", { tripId, label: MARK, amount: "13", category: "other", splitType: "shared" });
    await forge(alice, `${A}/costs`, "costId", { tripId, costId: bobCost });
    await forge(alice, `${A}/vote`, "estCost", { tripId, pollId: bobPoll, label: MARK, estCost: "1", link: "" });
    await forge(alice, `${A}/pay`, "milestoneId", { tripId, milestoneId: bobMilestone, kind: "buy_in", ack: "yes" });
    await forge(alice, `${A}/party`, "shareComfort", { tripId, partyUserId: bobParty, name: MARK, shareComfort: "any" });
    await forge(alice, `${A}/party`, "travelerId", { tripId, travelerId: bobTraveler, name: MARK, ageBand: "adult" });
    await forge(alice, `${A}/party`, "ageBand", { tripId, partyUserId: bobParty, name: MARK, ageBand: "adult" });
  }
  await forge(alice, `${A}/settings`, "minPayers", { tripId: tripB, minPayers: "77", maxTravelers: "78" });
  await forge(alice, `${A}/sleep`, "roomName", { tripId: tripB, roomName: MARK, bedType: "Bed", weight: "1" });

  // Bob's trip is exactly as he left it.
  for (const path of ["", "/costs", "/vote", "/pay", "/party", "/settings", "/sleep", "/budget"]) {
    await bob.goto(`/trip/${tripB}${path}`);
    await expectNotServed(bob, [MARK, ALICE]);
  }
  await bob.goto(`/trip/${tripB}/costs`);
  await expect(bob.getByText(BOB_COST).first()).toBeVisible();
  await bob.goto(`/trip/${tripB}/settings`);
  await expect(bob.locator('[name="minPayers"]').first()).toHaveValue(bobMinPayers);
  await bob.goto(`/trip/${tripB}/party`);
  expect(await fieldValue(bob, "partyUserId")).toBe(bobParty);

  // Alice is still not a member of Bob's trip.
  await alice.goto(`/trip/${tripB}`);
  await expect(alice.getByRole("heading", { name: /this trip\s*is private/i })).toBeVisible();
});

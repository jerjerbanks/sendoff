import { describe, expect, it } from "vitest";
import { journey, nextStep, type NextStepInput } from "./next-step";

const base: NextStepInput = {
  viewer: { isPayer: true, role: "member", status: "joined", forfeitedCents: 0 },
  payerFirstName: null,
  partySize: 1,
  tripStatus: "buy_in_open",
  hasBudget: true,
  unvotedPolls: [],
  hasRoom: false,
  buyInLabel: "$150",
  deadlineLabel: "Dec 15",
  nextPayment: null,
  isOrganizer: false,
  pendingApprovals: 0,
  payerCount: 4,
  minPayers: 5,
};

describe("next step", () => {
  it("asks for a budget before the first vote, then the vote, then the buy-in", () => {
    expect(nextStep({ ...base, hasBudget: false, unvotedPolls: ["Where"] }).href).toBe("/budget");
    expect(nextStep({ ...base, unvotedPolls: ["Where"] }).title).toBe("Vote on where");
    const commit = nextStep(base);
    expect(commit.title).toBe("Commit: $150");
    expect(commit.href).toBe("/pay");
  });

  it("a skipped budget never blocks the buy-in once voting is done", () => {
    expect(nextStep({ ...base, hasBudget: false }).href).toBe("/pay");
  });

  it("a household commits as a party, then picks a room", () => {
    expect(nextStep({ ...base, partySize: 4 }).title).toBe("Commit your party: $150");
    expect(nextStep({ ...base, viewer: { ...base.viewer!, status: "committed" } }).href).toBe("/spots");
  });

  it("the organizer is sent to book once the trip is ready, after their own room", () => {
    const org = { ...base, isOrganizer: true, viewer: { ...base.viewer!, role: "organizer" as const, status: "committed" as const }, tripStatus: "booking_ready" };
    expect(nextStep(org).href).toBe("/spots");
    expect(nextStep({ ...org, hasRoom: true }).href).toBe("/book");
    expect(nextStep({ ...org, hasRoom: true, tripStatus: "under_minimum" }).href).toBe("/organize");
  });

  it("someone on another person's party votes but never pays", () => {
    const linked = { ...base, payerFirstName: "Maya", viewer: { ...base.viewer!, isPayer: false } };
    expect(nextStep({ ...linked, unvotedPolls: ["When"] }).href).toBe("/vote");
    expect(nextStep(linked).title).toBe("Maya handles your party");
  });

  it("the guest of honor is never asked to pay", () => {
    const honoree = { ...base, viewer: { ...base.viewer!, role: "honoree" as const, status: "committed" as const } };
    expect(nextStep(honoree).cta).toBeNull();
    expect(journey(honoree)).toEqual([]);
  });

  it("an off-trip member gets no call to action", () => {
    expect(nextStep({ ...base, viewer: { ...base.viewer!, status: "off_trip" } }).cta).toBeNull();
  });
});

describe("journey strip", () => {
  it("marks the first unfinished step current", () => {
    const steps = journey({ ...base, hasBudget: false, unvotedPolls: ["Where"] });
    expect(steps.map((step) => step.state)).toEqual(["done", "current", "todo", "todo", "todo"]);
  });

  it("shows a skipped budget once the party commits without one", () => {
    const steps = journey({ ...base, hasBudget: false, viewer: { ...base.viewer!, status: "committed" } });
    expect(steps.map((step) => step.state)).toEqual(["done", "skipped", "done", "done", "current"]);
  });
});

describe("organizer first run", () => {
  const fresh: NextStepInput = {
    ...base,
    viewer: { isPayer: true, role: "organizer", status: "joined", forfeitedCents: 0 },
    isOrganizer: true,
    tripStatus: "planning",
    hasBudget: false,
    payerCount: 0,
    setup: { emptyPolls: ["Where", "When", "What we'll do"], votablePolls: 0, otherParties: 0, hasCosts: false },
  };

  it("walks a brand-new organizer through places, dates, invite, costs, beds, then the buy-in", () => {
    expect(nextStep(fresh)).toMatchObject({ title: "Add places and dates to vote on", href: "/vote?q=destination" });
    const placesIn = { ...fresh, setup: { ...fresh.setup!, emptyPolls: ["When", "What we'll do"], votablePolls: 1 } };
    expect(nextStep(placesIn)).toMatchObject({ title: "Add dates to vote on", href: "/vote?q=dates" });
    const optionsIn = { ...placesIn, setup: { ...placesIn.setup!, emptyPolls: ["What we'll do"], votablePolls: 2 } };
    expect(nextStep(optionsIn)).toMatchObject({ title: "Invite your group", href: "#invite" });
    // Once someone joined, the organizer's own budget and votes come before the rest of setup.
    const joined = { ...optionsIn, unvotedPolls: ["Where"], setup: { ...optionsIn.setup!, otherParties: 1 } };
    expect(nextStep(joined).href).toBe("/budget");
    const voted = { ...joined, unvotedPolls: [], hasBudget: true };
    expect(nextStep(voted)).toMatchObject({ title: "Add the house and shared costs", href: "/costs" });
    const costed = { ...voted, setup: { ...voted.setup!, hasCosts: true, needsBeds: true } };
    expect(nextStep(costed)).toMatchObject({ title: "Add the rooms and beds", href: "/sleep" });
    expect(nextStep({ ...costed, setup: { ...costed.setup!, needsBeds: false } }).href).toBe("/pay");
  });

  it("an activities poll with no options never blocks setup", () => {
    const step = nextStep({ ...fresh, setup: { ...fresh.setup!, emptyPolls: ["What we'll do"], votablePolls: 2, otherParties: 2, hasCosts: true } });
    expect(step.href).toBe("/pay");
  });

  it("setup steps stop once the buy-in is open", () => {
    expect(nextStep({ ...fresh, tripStatus: "buy_in_open", hasBudget: true }).href).toBe("/pay");
  });

  it("a member of a trip with nothing to vote on is told the organizer is setting up, and Vote isn't ticked", () => {
    const member = { ...fresh, isOrganizer: false, viewer: { ...fresh.viewer!, role: "member" as const }, hasBudget: true };
    expect(nextStep(member).body).toMatch(/still adding places and dates/);
    expect(journey(member).find((step) => step.key === "vote")?.state).not.toBe("done");
  });
});

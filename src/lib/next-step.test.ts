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

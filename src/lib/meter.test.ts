import { describe, expect, it } from "vitest";
import { buildCells, meterState, meterSub, restScheduleNote } from "./meter";

describe("meterState: capped at the minimum to book", () => {
  it("below the minimum shows committed/need and how many are left", () => {
    const state = meterState(2, 3);
    expect(state).toMatchObject({ shown: 2, met: false, remaining: 1 });
    expect(meterSub(state, "parties")).toBe("1 more to book · minimum 3");
  });

  it("at the minimum switches to the met state with nothing 'needed'", () => {
    const state = meterState(3, 3);
    expect(state).toMatchObject({ shown: 3, met: true, remaining: 0 });
    expect(meterSub(state, "parties")).toBe("3 parties committed · minimum 3");
    expect(meterSub(state, "parties")).not.toMatch(/needed|more to book/);
  });

  it("past the minimum never reads 4/3: the numerator caps and nothing is 'needed'", () => {
    const state = meterState(4, 3);
    expect(state).toMatchObject({ shown: 3, met: true, remaining: 0 });
    expect(meterSub(state, "households", "10 people")).toBe("4 households committed · minimum 3 · 10 people");
  });

  it("every party in (the maximum) stays in the met state", () => {
    expect(meterState(12, 8)).toMatchObject({ shown: 8, met: true, remaining: 0 });
  });

  it("an organizer lowering the minimum below the committed count never goes negative", () => {
    const state = meterState(5, 2);
    expect(state.remaining).toBe(0);
    expect(state.met).toBe(true);
    expect(meterSub(state, "parties")).not.toMatch(/-\d/);
  });
});

describe("buildCells", () => {
  it("below the minimum: lake cells, the viewer pending, open cells up to the minimum", () => {
    expect(buildCells({ committed: 2, need: 4, total: 3, youPending: true, booked: false })).toEqual(["in", "in", "you", "open"]);
  });

  it("at the minimum the committed cells turn pine", () => {
    expect(buildCells({ committed: 3, need: 3, total: 4, youPending: false, booked: false })).toEqual(["booked", "booked", "booked", "open"]);
  });

  it("extra commitments fill cells past the threshold", () => {
    const cells = buildCells({ committed: 4, need: 3, total: 4, youPending: false, booked: false });
    expect(cells).toHaveLength(4);
    expect(cells.every((cell) => cell === "booked")).toBe(true);
  });

  it("at the maximum every cell is filled", () => {
    expect(buildCells({ committed: 6, need: 4, total: 6, youPending: false, booked: true })).toEqual(Array(6).fill("booked"));
  });

  it("a minimum edited below the committed count keeps every committed cell", () => {
    expect(buildCells({ committed: 5, need: 2, total: 5, youPending: false, booked: false })).toEqual(Array(5).fill("booked"));
  });
});

describe("restScheduleNote (pay page)", () => {
  const base = { lockedIn: false, minPayers: 3, organizerFirstName: "Maya" };

  it("says 'scheduled once N parties commit' only while under the minimum", () => {
    expect(restScheduleNote({ ...base, payerCount: 2 })).toBe("The rest of your share is scheduled once 3 parties commit.");
  });

  it("hides that line once payerCount >= minPayers", () => {
    for (const payerCount of [3, 4]) {
      const note = restScheduleNote({ ...base, payerCount });
      expect(note).not.toMatch(/scheduled once/);
      expect(note).toBe("The minimum is met. The rest of your share is scheduled when Maya books the stay.");
    }
  });

  it("speaks to the organizer as 'you'", () => {
    expect(restScheduleNote({ ...base, payerCount: 4, viewerIsOrganizer: true })).toBe(
      "The minimum is met. The rest of your share is scheduled when you book the stay.",
    );
  });

  it("after booking, talks about each party paying its own share", () => {
    expect(restScheduleNote({ ...base, lockedIn: true, payerCount: 4 })).toBe("Each party pays its own share, so nobody fronts the bill.");
  });
});

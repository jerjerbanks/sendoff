import { describe, expect, it } from "vitest";
import { bedNames, personInitials, sleepersByBed, type SleeperTraveler } from "./bed-sleepers";

const t = (id: string, name: string, extra: Partial<SleeperTraveler> = {}): SleeperTraveler => ({
  id,
  name,
  ageBand: "adult",
  coSleepSpotId: null,
  bedSpotId: null,
  ...extra,
});

describe("sleepersByBed", () => {
  it("fills a party's beds in traveler order when nobody has picked", () => {
    const map = sleepersByBed([{ payerUserId: "p", travelers: [t("a", "Jeremy Cmiel"), t("b", "Megan Cmiel")] }], () => ["q1", "q2"]);
    expect(map.get("q1")?.map((s) => s.name)).toEqual(["Jeremy Cmiel"]);
    expect(map.get("q2")?.map((s) => s.name)).toEqual(["Megan Cmiel"]);
  });

  it("puts a picked bed first and fills the rest around it", () => {
    const map = sleepersByBed([{ payerUserId: "p", travelers: [t("a", "Jeremy"), t("b", "Megan", { bedSpotId: "q1" })] }], () => ["q1", "q2"]);
    expect(map.get("q1")?.[0]).toMatchObject({ name: "Megan", chosen: true });
    expect(map.get("q2")?.[0]).toMatchObject({ name: "Jeremy", chosen: false });
  });

  it("ignores a pick for a bed the party no longer holds", () => {
    const map = sleepersByBed([{ payerUserId: "p", travelers: [t("a", "Jeremy", { bedSpotId: "gone" })] }], () => ["q1"]);
    expect(map.get("q1")?.[0]?.name).toBe("Jeremy");
    expect(map.has("gone")).toBe(false);
  });

  it("adds co-sleepers to their bed and skips infants", () => {
    const map = sleepersByBed(
      [{ payerUserId: "p", travelers: [t("a", "Jeremy"), t("k", "Kid", { ageBand: "child", coSleepSpotId: "q1" }), t("i", "Baby", { ageBand: "infant" })] }],
      () => ["q1"],
    );
    expect(map.get("q1")?.map((s) => [s.name, s.coSleeping])).toEqual([
      ["Jeremy", false],
      ["Kid", true],
    ]);
  });

  it("leaves a bed unnamed when a party holds more beds than sleepers, and skips parties with no beds", () => {
    const map = sleepersByBed(
      [
        { payerUserId: "p", travelers: [t("a", "Jeremy")] },
        { payerUserId: "x", travelers: [t("z", "Zoe")] },
      ],
      (id) => (id === "p" ? ["q1", "q2"] : []),
    );
    expect(map.get("q2")).toBeUndefined();
    expect([...map.values()].flat().some((s) => s.name === "Zoe")).toBe(false);
  });
});

describe("personInitials", () => {
  it.each([
    ["Jeremy Cmiel", "JC"],
    ["Ava", "A"],
    ["  mary-kate  o'neil ", "MO"],
    ["", ""],
  ])("%s → %s", (name, out) => expect(personInitials(name)).toBe(out));
});

describe("bedNames", () => {
  it("numbers only repeated bed types in a room", () => {
    const names = bedNames([
      { id: "a", bedType: "queen" },
      { id: "b", bedType: "queen" },
      { id: "c", bedType: "twin" },
    ]);
    expect([...names.values()]).toEqual(["Queen 1", "Queen 2", "Twin"]);
  });
});

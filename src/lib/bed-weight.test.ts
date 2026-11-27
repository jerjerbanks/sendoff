import { describe, expect, it } from "vitest";
import { defaultBedWeight } from "./bed-weight";

describe("defaultBedWeight", () => {
  it("follows the defaults printed on Rooms and beds", () => {
    expect(defaultBedWeight("king", { privateBath: true })).toBe(1.5);
    expect(defaultBedWeight("queen", { privateBath: true, privateRoom: true })).toBe(1.5);
    expect(defaultBedWeight("queen", { privateRoom: true })).toBe(1.25);
    expect(defaultBedWeight("king")).toBe(1);
    expect(defaultBedWeight("full")).toBe(1);
    expect(defaultBedWeight("full", { privateRoom: true })).toBe(1.25);
    expect(defaultBedWeight("twin")).toBe(0.8);
    expect(defaultBedWeight("bunk", { privateRoom: true })).toBe(0.8);
    expect(defaultBedWeight("sofa_bed")).toBe(0.6);
    expect(defaultBedWeight("couch")).toBe(0.5);
    expect(defaultBedWeight("air_mattress")).toBe(0.5);
  });
});

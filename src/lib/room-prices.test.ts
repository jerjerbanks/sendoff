import { describe, expect, it } from "vitest";
import { livePriceTable, roomEstimates, type PricedSpot } from "./room-prices";

const bed = (id: string, roomName: string, weight = 1, extra: Partial<PricedSpot> = {}): PricedSpot => ({
  id,
  roomName,
  weight,
  reservedForHonoree: false,
  sharingEnabled: false,
  capacity: 1,
  ...extra,
});

// The audit house: $2,400, Bunk Room (2 beds), Den (2 beds), Master (1 bed), every bed weight 1.
const house = [bed("b1", "Bunk Room"), bed("b2", "Bunk Room"), bed("d1", "Den"), bed("d2", "Den"), bed("m", "Master")];
const LODGE = 2400_00;

describe("livePriceTable", () => {
  it("never prices an empty room above the house when nothing is claimed", () => {
    const { rooms, spots } = livePriceTable(LODGE, house, () => 0);
    expect(rooms["Bunk Room"]).toBe(LODGE);
    expect(rooms["Den"]).toBe(LODGE);
    expect(rooms["Master"]).toBe(LODGE);
    // One bed on its own is still the whole house to the first party.
    expect(spots.b1).toBe(LODGE);
  });

  it("prices an empty room as one unit once another party holds beds", () => {
    const held = new Set(["m"]);
    const { rooms, spots } = livePriceTable(LODGE, house, (id) => (held.has(id) ? 1 : 0));
    expect(spots.m).toBe(LODGE);
    expect(rooms["Master"]).toBe(LODGE);
    // 2 / (1 + 2) of $2,400, not 2 x $1,200 added up per bed.
    expect(rooms["Bunk Room"]).toBe(1600_00);
    expect(spots.b1).toBe(1200_00);
  });

  it("held rooms add up to the house", () => {
    const held = new Set(["m", "b1", "b2"]);
    const { rooms } = livePriceTable(LODGE, house, (id) => (held.has(id) ? 1 : 0));
    expect((rooms["Master"] ?? 0) + (rooms["Bunk Room"] ?? 0)).toBe(LODGE);
    expect(rooms["Bunk Room"]).toBe(1600_00);
  });

  it("leaves guest-of-honor beds out", () => {
    const withHonoree = [...house, bed("h", "Suite", 1.5, { reservedForHonoree: true })];
    const { rooms, spots } = livePriceTable(LODGE, withHonoree, () => 0);
    expect(rooms["Suite"]).toBeUndefined();
    expect(spots.h).toBeUndefined();
  });

  it("prices an open share slot at half the bed", () => {
    const shared = [bed("q", "Queen room", 1.25, { sharingEnabled: true, capacity: 2 }), bed("t", "Twin room", 0.8)];
    const { spots } = livePriceTable(1000_00, shared, (id) => (id === "q" ? 1 : 0));
    expect(spots.q).toBe(500_00);
  });
});

describe("roomEstimates", () => {
  const empty = () => 0;
  it("estimates each empty room at the minimum party count", () => {
    // Nothing claimed, minimum 2 parties: Master (1) against one typical other room (median of 2, 2 = 2).
    const est = roomEstimates(LODGE, house, empty, 0, 2);
    expect(est["Master"]).toEqual({ estimate: 800_00, parties: 2 });
    // Bunk Room (2) against a typical other room: others are Den (2) and Master (1), median index 0 → 1.
    expect(est["Bunk Room"]).toEqual({ estimate: 1600_00, parties: 2 });
  });

  it("gives nothing once the minimum is already reached or in a one-party trip", () => {
    expect(roomEstimates(LODGE, house, empty, 0, 1)).toEqual({});
    const held = new Set(["m"]);
    expect(roomEstimates(LODGE, house, (id) => (held.has(id) ? 1 : 0), 1, 2)).toEqual({});
  });

  it("never assumes more parties than there are other empty rooms", () => {
    const two = [bed("a", "A"), bed("b", "B")];
    expect(roomEstimates(1000_00, two, empty, 0, 5)).toEqual({ A: { estimate: 500_00, parties: 2 }, B: { estimate: 500_00, parties: 2 } });
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  airbnbListingId,
  canonicalListingUrl,
  cleanImportRooms,
  countBedrooms,
  floorFromCaptions,
  importedRoomSpots,
  isGroundFloor,
  parseBedLine,
  parseListingHtml,
  parseSleepText,
} from "./listing-import";

/** Raw listing HTML saved from www.airbnb.com on 2026-11-25 (gzipped). Tests never fetch live. */
function fixture(id: string): string {
  return gunzipSync(readFileSync(path.join(__dirname, "fixtures/airbnb", `rooms-${id}.html.gz`))).toString("utf8");
}

describe("airbnbListingId", () => {
  it("takes airbnb.com/rooms/{id} and drops the query", () => {
    expect(airbnbListingId("https://www.airbnb.com/rooms/40357255?adults=4&check_in=2027-01-02#photos")).toBe("40357255");
    expect(airbnbListingId("airbnb.com/rooms/201621")).toBe("201621");
    expect(airbnbListingId("  https://m.airbnb.com/rooms/1414758053826125060/ ")).toBe("1414758053826125060");
    expect(canonicalListingUrl("201621")).toBe("https://www.airbnb.com/rooms/201621");
  });

  it("refuses everything else", () => {
    for (const url of [
      "https://www.vrbo.com/1234567",
      "https://www.airbnb.ca/rooms/201621",
      "https://www.airbnb.com/s/Lake-Tahoe/homes",
      "https://www.airbnb.com/rooms/plus/201621",
      "https://evil.example/airbnb.com/rooms/1",
      "https://airbnb.com.evil.example/rooms/1",
      "https://user@www.airbnb.com/rooms/1",
      "https://www.airbnb.com:8443/rooms/1",
      "javascript:alert(1)",
      "",
    ]) {
      expect(airbnbListingId(url), url).toBeNull();
    }
  });
});

describe("parseBedLine", () => {
  it("normalizes Airbnb's bed phrases", () => {
    expect(parseBedLine("1 king bed")).toEqual([{ type: "king", count: 1 }]);
    expect(parseBedLine("2 single beds")).toEqual([{ type: "single", count: 2 }]);
    expect(parseBedLine("2 double beds")).toEqual([{ type: "double", count: 2 }]);
    expect(parseBedLine("1 queen bed, 1 bunk bed")).toEqual([
      { type: "queen", count: 1 },
      { type: "bunk", count: 1 },
    ]);
    expect(parseBedLine("1 sofa bed, 1 air mattress, 1 crib")).toEqual([
      { type: "sofa", count: 1 },
      { type: "air_mattress", count: 1 },
      { type: "crib", count: 1 },
    ]);
    expect(parseBedLine("1 couch")).toEqual([{ type: "sofa", count: 1 }]);
    expect(parseBedLine("1 floor mattress")).toEqual([{ type: "air_mattress", count: 1 }]);
    expect(parseBedLine("1 small double bed")).toEqual([{ type: "double", count: 1 }]);
    expect(parseBedLine("1 hammock bed")).toEqual([{ type: "other", count: 1 }]);
  });

  it("rejects lines that aren't beds", () => {
    expect(parseBedLine("Bedroom 1")).toBeNull();
    expect(parseBedLine("4 bedrooms")).toBeNull();
    expect(parseBedLine("2.5 baths")).toBeNull();
    expect(parseBedLine("1 king bed, lake view")).toBeNull();
  });
});

describe("floors", () => {
  it("reads a floor from captions", () => {
    expect(floorFromCaptions(["Primary suite on the Main Level with a king bed"])).toBe("Main level");
    expect(floorFromCaptions(["The warm and roomy upstairs Master Bedroom with king size bed."])).toBe("Upstairs");
    expect(floorFromCaptions(["Lower level bunk room"])).toBe("Lower level");
    expect(floorFromCaptions(["Wall of lake-view windows wrapping the king bedroom."])).toBeNull();
    expect(floorFromCaptions([])).toBeNull();
  });

  it("knows which floors are the ground floor", () => {
    expect(isGroundFloor("Main level")).toBe(true);
    expect(isGroundFloor("1st floor")).toBe(true);
    expect(isGroundFloor("Upstairs")).toBe(false);
    expect(isGroundFloor(null)).toBe(false);
  });
});

describe("parseListingHtml on saved listings", () => {
  it("201621: four bedrooms, no captions", () => {
    const result = parseListingHtml(fixture("201621"));
    expect(result).toEqual({
      ok: true,
      bedrooms: 4,
      rooms: [
        { room: "Bedroom 1", floor: null, beds: [{ type: "queen", count: 1 }] },
        { room: "Bedroom 2", floor: null, beds: [{ type: "king", count: 1 }] },
        { room: "Bedroom 3", floor: null, beds: [{ type: "queen", count: 1 }] },
        { room: "Bedroom 4", floor: null, beds: [{ type: "king", count: 1 }] },
      ],
    });
  });

  it("40357255: floor from an 'upstairs' caption, two bunk beds", () => {
    const result = parseListingHtml(fixture("40357255"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bedrooms).toBe(4);
    expect(result.rooms[0]).toEqual({ room: "Bedroom 1", floor: "Upstairs", beds: [{ type: "king", count: 1 }] });
    expect(result.rooms[3]).toEqual({ room: "Bedroom 4", floor: null, beds: [{ type: "bunk", count: 2 }] });
    expect(countBedrooms(result.rooms)).toBe(4);
  });

  it("1414758053826125060: a room with two description lines", () => {
    const result = parseListingHtml(fixture("1414758053826125060"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rooms.map((room) => room.room)).toEqual(["Bedroom 1", "Bedroom 2", "Bedroom 3", "Bedroom 4"]);
    expect(result.rooms[1].beds).toEqual([
      { type: "single", count: 2 },
      { type: "bunk", count: 1 },
    ]);
  });

  it("1484210462831355881: double beds", () => {
    const result = parseListingHtml(fixture("1484210462831355881"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bedrooms).toBe(4);
    expect(result.rooms[3].beds).toEqual([
      { type: "double", count: 2 },
      { type: "single", count: 2 },
    ]);
  });

  it("stays well inside the CPU budget", () => {
    const html = fixture("40357255");
    const started = performance.now();
    for (let i = 0; i < 20; i++) parseListingHtml(html);
    // Generous for CI; locally this is ~1 ms a parse.
    expect((performance.now() - started) / 20).toBeLessThan(15);
  });

  it("reports why a page can't be read", () => {
    // A block or challenge page has no embedded state at all.
    expect(parseListingHtml("<html><body>Please verify you are a human</body></html>")).toEqual({
      ok: false,
      reason: "no_state",
      bedrooms: null,
    });
    // A real page with the sleeping arrangements removed.
    const html = fixture("201621").replace('"sleepingArrangements":{', '"sleepingArrangementsGone":{');
    expect(parseListingHtml(html)).toEqual({ ok: false, reason: "no_stops", bedrooms: 4 });
    // Empty stops.
    const empty = fixture("201621").replace(/"sleepingArrangements":\{"__typename":"MediaTour","stops":\[/, '"sleepingArrangements":{"__typename":"MediaTour","stops":[],"x":[');
    expect(parseListingHtml(empty).ok).toBe(false);
    // Truncated mid-object.
    const cut = fixture("201621");
    expect(parseListingHtml(cut.slice(0, cut.indexOf('"sleepingArrangements"') + 200)).ok).toBe(false);
  });
});

describe("parseSleepText", () => {
  it("reads the section as copied, one item per line", () => {
    const text = `Where you'll sleep
1 / 2
Bedroom 1
1 king bed
Bedroom 2
1 queen bed, 1 bunk bed
Living room
1 sofa bed
Show all`;
    expect(parseSleepText(text)).toEqual([
      { room: "Bedroom 1", floor: null, beds: [{ type: "king", count: 1 }] },
      {
        room: "Bedroom 2",
        floor: null,
        beds: [
          { type: "queen", count: 1 },
          { type: "bunk", count: 1 },
        ],
      },
      { room: "Living room", floor: null, beds: [{ type: "sofa", count: 1 }] },
    ]);
  });

  it("splits a room name glued to its beds", () => {
    expect(parseSleepText("Where you’ll sleep\nBedroom 11 king bed\nBedroom 22 single beds\nLiving room1 sofa bed")).toEqual([
      { room: "Bedroom 1", floor: null, beds: [{ type: "king", count: 1 }] },
      { room: "Bedroom 2", floor: null, beds: [{ type: "single", count: 2 }] },
      { room: "Living room", floor: null, beds: [{ type: "sofa", count: 1 }] },
    ]);
  });

  it("carries a floor heading to the rooms below it", () => {
    const rooms = parseSleepText("Main level\nPrimary suite\n1 king bed\nUpper level\nBunk room\n2 bunk beds, 1 crib");
    expect(rooms).toEqual([
      { room: "Primary suite", floor: "Main level", beds: [{ type: "king", count: 1 }] },
      {
        room: "Bunk room",
        floor: "Upper level",
        beds: [
          { type: "bunk", count: 2 },
          { type: "crib", count: 1 },
        ],
      },
    ]);
  });

  it("returns nothing for text without beds", () => {
    expect(parseSleepText("A lovely cabin by the lake.\nHot tub\n4 bedrooms")).toEqual([]);
  });
});

describe("countBedrooms", () => {
  it("leaves out rooms that only have optional beds", () => {
    expect(
      countBedrooms([
        { room: "Bedroom 1", floor: null, beds: [{ type: "king", count: 1 }] },
        { room: "Living room", floor: null, beds: [{ type: "sofa", count: 1 }] },
      ]),
    ).toBe(1);
  });
});

describe("cleanImportRooms", () => {
  it("trims, merges and keeps good rooms", () => {
    expect(
      cleanImportRooms([
        {
          room: "  Bunk   room ",
          floor: " Lower level ",
          beds: [
            { type: "bunk", count: 1 },
            { type: "bunk", count: 1 },
          ],
        },
      ]),
    ).toEqual({ ok: true, rooms: [{ room: "Bunk room", floor: "Lower level", beds: [{ type: "bunk", count: 2 }] }] });
  });

  it("refuses bad input", () => {
    expect(cleanImportRooms([]).ok).toBe(false);
    expect(cleanImportRooms("nope").ok).toBe(false);
    expect(cleanImportRooms([{ room: "", floor: null, beds: [{ type: "king", count: 1 }] }]).ok).toBe(false);
    expect(cleanImportRooms([{ room: "A", floor: null, beds: [] }]).ok).toBe(false);
    expect(cleanImportRooms([{ room: "A", floor: null, beds: [{ type: "waterbed", count: 1 }] }]).ok).toBe(false);
    expect(cleanImportRooms([{ room: "A", floor: null, beds: [{ type: "king", count: 0 }] }]).ok).toBe(false);
    expect(cleanImportRooms([{ room: "A", floor: null, beds: [{ type: "king", count: 1.5 }] }]).ok).toBe(false);
    expect(
      cleanImportRooms([
        { room: "Den", floor: null, beds: [{ type: "king", count: 1 }] },
        { room: "den", floor: null, beds: [{ type: "king", count: 1 }] },
      ]),
    ).toEqual({ ok: false, error: 'Two rooms are named "den". Rename one.' });
    const tooMany = Array.from({ length: 8 }, (_, i) => ({ room: `R${i}`, floor: null, beds: [{ type: "bunk", count: 12 }] }));
    expect(cleanImportRooms(tooMany).ok).toBe(false);
  });
});

describe("importedRoomSpots", () => {
  it("turns a lone king into one private-room spot", () => {
    expect(importedRoomSpots({ room: "Bedroom 1", floor: "Main level", beds: [{ type: "king", count: 1 }] })).toEqual({
      spots: [{ bedType: "king", weight: 1.25, privateRoom: true, optional: false }],
      cribSpace: false,
      groundFloor: true,
    });
  });

  it("makes two spots per bunk, skips cribs, flags optional beds", () => {
    const result = importedRoomSpots({
      room: "Bunk room",
      floor: "Upstairs",
      beds: [
        { type: "bunk", count: 2 },
        { type: "sofa", count: 1 },
        { type: "crib", count: 1 },
      ],
    });
    expect(result.cribSpace).toBe(true);
    expect(result.groundFloor).toBe(false);
    expect(result.spots.map((spot) => spot.bedType)).toEqual(["bunk", "bunk", "bunk", "bunk", "sofa_bed"]);
    expect(result.spots.filter((spot) => spot.optional)).toHaveLength(1);
    expect(result.spots.every((spot) => !spot.privateRoom)).toBe(true);
  });

  it("maps doubles to full and singles to twin", () => {
    const { spots } = importedRoomSpots({ room: "Bedroom 4", floor: null, beds: [{ type: "double", count: 2 }, { type: "single", count: 1 }] });
    expect(spots).toEqual([
      { bedType: "full", weight: 1, privateRoom: false, optional: false },
      { bedType: "full", weight: 1, privateRoom: false, optional: false },
      { bedType: "twin", weight: 0.8, privateRoom: false, optional: false },
    ]);
  });
});

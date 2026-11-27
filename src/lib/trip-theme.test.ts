import { describe, expect, it } from "vitest";
import { deriveTripTheme, isTripTheme, themeChipLabel, vibeOrder } from "./trip-theme";

describe("deriveTripTheme", () => {
  it("gives each theme from its keywords", () => {
    expect(deriveTripTheme({ type: "adult", name: "Lake Geneva cabin weekend" })).toBe("outdoors");
    expect(deriveTripTheme({ type: "adult", name: "Kohler golf" })).toBe("golf");
    expect(deriveTripTheme({ type: "adult", destination: "Outer Banks, NC" })).toBe("beach");
    expect(deriveTripTheme({ type: "adult", subType: "bachelorette", name: "Sam's weekend" })).toBe("party");
    expect(deriveTripTheme({ type: "adult", name: "Nashville long weekend" })).toBe("city");
    expect(deriveTripTheme({ type: "adult", destination: "Breckenridge, CO" })).toBe("ski");
  });

  it("puts golf ahead of a bachelor sub-type", () => {
    expect(deriveTripTheme({ type: "adult", subType: "bachelor", name: "Mike's bach", activities: ["Tee time at Whistling Straits"] })).toBe("golf");
  });

  it("makes a bach with no keywords a party", () => {
    expect(deriveTripTheme({ type: "adult", subType: "bachelor", name: "Mike's weekend" })).toBe("party");
    expect(deriveTripTheme({ type: "family", subType: "joint", name: "Taylor + Jordan" })).toBe("party");
  });

  it("keeps ski ahead of the party sub-type", () => {
    expect(deriveTripTheme({ type: "adult", subType: "bachelorette", destination: "Park City" })).toBe("ski");
  });

  it("sends a family to the beach only on a beach keyword", () => {
    expect(deriveTripTheme({ type: "family", destination: "Outer Banks" })).toBe("beach");
    expect(deriveTripTheme({ type: "family", name: "Summer with the cousins" })).toBe("outdoors");
  });

  it("falls back to outdoors on nothing, null and empty input", () => {
    expect(deriveTripTheme({ type: "adult", name: "Weekend away" })).toBe("outdoors");
    expect(deriveTripTheme({})).toBe("outdoors");
    expect(deriveTripTheme({ type: null, subType: null, destination: null, activities: null, name: null })).toBe("outdoors");
    expect(deriveTripTheme({ type: "", subType: "", destination: "", activities: [], name: "   " })).toBe("outdoors");
    expect(deriveTripTheme({ subType: "none" })).toBe("outdoors");
  });

  it("matches whole words, any case", () => {
    expect(deriveTripTheme({ name: "GOLF BUDDIES" })).toBe("golf");
    expect(deriveTripTheme({ name: "Linksys office offsite" })).toBe("outdoors");
    expect(deriveTripTheme({ name: "Campfire stories" })).toBe("outdoors");
    expect(deriveTripTheme({ name: "Skillet cook-off" })).toBe("outdoors");
  });

  it("only reads Tahoe as ski in winter, when the month is known", () => {
    expect(deriveTripTheme({ destination: "Lake Tahoe", month: 1 })).toBe("ski");
    expect(deriveTripTheme({ destination: "Lake Tahoe", month: 7 })).toBe("outdoors");
    expect(deriveTripTheme({ destination: "Lake Tahoe" })).toBe("outdoors");
  });
});

describe("theme helpers", () => {
  it("recognizes theme names", () => {
    expect(isTripTheme("golf")).toBe(true);
    expect(isTripTheme("space")).toBe(false);
    expect(isTripTheme(undefined)).toBe(false);
  });

  it("labels the chip from the theme and the trip's size", () => {
    expect(themeChipLabel("golf", { tripType: "adult", preWeddingStyle: null, travelerCount: 8 })).toBe("Golf trip · 8 people");
    expect(themeChipLabel("party", { tripType: "pre_wedding", preWeddingStyle: "bachelorette", travelerCount: 6 })).toBe("Bachelorette · 6 people");
    expect(themeChipLabel("beach", { tripType: "family", preWeddingStyle: null, travelerCount: 1 })).toBe("Family beach · 1 person");
  });

  it("orders vibe tiles by trip kind", () => {
    expect(vibeOrder("adult", "none")).toEqual(["outdoors", "golf", "city", "ski", "beach", "party"]);
    expect(vibeOrder("family", "none")).toEqual(["beach", "outdoors", "ski", "city"]);
    expect(vibeOrder("adult", "bachelor")[0]).toBe("party");
  });
});

describe("activeTripTheme", () => {
  it("lets ?ft-theme= override only with the flag on", async () => {
    const { activeTripTheme } = await import("./trip-theme");
    expect(activeTripTheme("outdoors", "golf", true)).toBe("golf");
    expect(activeTripTheme("outdoors", "golf", false)).toBe("outdoors");
    expect(activeTripTheme("outdoors", "space", true)).toBe("outdoors");
    expect(activeTripTheme("ski", ["city"], true)).toBe("city");
    expect(activeTripTheme("ski", null, true)).toBe("ski");
  });
});

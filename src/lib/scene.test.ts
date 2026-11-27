import { describe, expect, it } from "vitest";
import { optionScenes, sceneFor, sceneSrc } from "./scene";

describe("sceneFor", () => {
  it.each([
    ["Harper Lake House weekend", "Lake Geneva, WI", "lake"],
    ["Bachelor golf weekend", "Scottsdale, AZ", "golf"],
    ["Pebble Beach 2027", null, "golf"],
    ["Spring break", "Cabo San Lucas", "beach"],
    ["Smokies cabin", "Gatlinburg, TN", "cabin"],
    ["Ski week", "Park City, UT", "cabin"],
    ["Mom's 60th", "Chicago, IL", "lake"],
    ["", undefined, "lake"],
  ])("%s / %s", (name, place, scene) => {
    expect(sceneFor(name, place)).toBe(scene);
  });

  it("maps every scene to a WebP under /illustrations", () => {
    for (const scene of ["lake", "cabin", "beach", "golf", "campfire"] as const) {
      const src = sceneSrc(scene);
      expect(src.day).toMatch(/^\/illustrations\/[a-z-]+\.webp$/);
      expect(src.night).toBe("/illustrations/lake-night.webp");
    }
  });
});

describe("optionScenes", () => {
  it("uses each option's own words first", () => {
    expect(optionScenes(["Fairway Lodge golf villa", "Harper Lake House", "Cabo beach house"])).toEqual(["golf", "lake", "beach"]);
  });

  it("gives plain places scenes no other option is using, and never golf", () => {
    expect(optionScenes(["Lake Geneva, WI", "Door County, WI"])).toEqual(["lake", "cabin"]);
    const picks = optionScenes(["Austin", "Nashville", "Denver"]);
    expect(new Set(picks).size).toBe(3);
    expect(picks).not.toContain("golf");
  });

  it("cycles once every spare scene is taken", () => {
    expect(optionScenes(["A", "B", "C", "D"])).toHaveLength(4);
  });
});

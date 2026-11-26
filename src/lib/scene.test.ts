import { describe, expect, it } from "vitest";
import { sceneFor, sceneSrc } from "./scene";

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

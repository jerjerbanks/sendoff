import { describe, expect, it } from "vitest";
import { TRIP_THEMES } from "./trip-theme";
import { sceneForPage, sceneUrl, themeTileScene } from "./scenes";

describe("page-to-scene map", () => {
  it("follows the v6.5 map for outdoors", () => {
    expect(sceneForPage("home", "outdoors")).toBe("dock-lakeside");
    expect(sceneForPage("join", "outdoors")).toBe("dock-lakeside");
    expect(sceneForPage("vote", "outdoors")).toBe("pine-campsite");
    expect(sceneForPage("costs", "outdoors")).toBe("cabin-pines");
    expect(sceneForPage("pay", "outdoors")).toBe("campfire-group");
  });

  it("gives every theme a scene on every page, and never the landing-only sunrise", () => {
    for (const theme of TRIP_THEMES)
      for (const page of ["home", "join", "vote", "costs", "pay"] as const) {
        const scene = sceneForPage(page, theme);
        expect(scene).not.toBe("lake-canoe-sunrise");
        expect(sceneUrl(scene)).toMatch(/^\/illustrations\/[a-z-]+\.webp$/);
      }
  });

  it("uses the trip-home hero for tiles", () => {
    expect(themeTileScene("golf")).toBe("golf-trip");
    expect(themeTileScene("ski")).toBe("ski-chalet");
    expect(sceneForPage("costs", "party")).toBe("ocean-bungalow");
  });
});

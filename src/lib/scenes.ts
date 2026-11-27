import type { TripTheme } from "@/lib/trip-theme";

/**
 * v6.5 page-to-scene map, combined with the v7 trip-type themes. Pure and static: the header
 * takes the page and the derived theme and fetches nothing. Dark mode uses lake-night for
 * every theme until night twins exist.
 */
export type ScenePage = "home" | "join" | "vote" | "costs" | "pay";

export type SceneName =
  | "dock-lakeside"
  | "pine-campsite"
  | "cabin-pines"
  | "campfire-group"
  | "golf-trip"
  | "family-beach"
  | "ocean-bungalow"
  | "party-weekend"
  | "city-weekend"
  | "ski-chalet"
  | "lake-canoe-sunrise"
  | "lake-night";

const MAP: Record<Exclude<ScenePage, "join">, Record<TripTheme, SceneName>> = {
  home: { outdoors: "dock-lakeside", golf: "golf-trip", beach: "family-beach", party: "party-weekend", city: "city-weekend", ski: "ski-chalet" },
  vote: { outdoors: "pine-campsite", golf: "golf-trip", beach: "family-beach", party: "party-weekend", city: "city-weekend", ski: "ski-chalet" },
  costs: { outdoors: "cabin-pines", golf: "golf-trip", beach: "ocean-bungalow", party: "ocean-bungalow", city: "city-weekend", ski: "cabin-pines" },
  pay: { outdoors: "campfire-group", golf: "golf-trip", beach: "family-beach", party: "party-weekend", city: "city-weekend", ski: "ski-chalet" },
};

export const NIGHT_SCENE: SceneName = "lake-night";

export function sceneForPage(page: ScenePage, theme: TripTheme): SceneName {
  return MAP[page === "join" ? "home" : page][theme];
}

export function sceneUrl(name: SceneName): string {
  return `/illustrations/${name}.webp`;
}

/** The scene each theme shows on its landing tile and vibe-picker tile (its trip-home hero). */
export function themeTileScene(theme: TripTheme): SceneName {
  return MAP.home[theme];
}

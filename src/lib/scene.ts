/**
 * v6 illustration scenes. Pure presentation: picks a header scene from words the trip
 * already has (its name and place). No new data, no query.
 */
export type Scene = "lake" | "cabin" | "beach" | "golf" | "campfire";

const FILES: Record<Scene, string> = {
  lake: "lake-canoe-sunrise",
  cabin: "cabin-pines",
  beach: "ocean-bungalow",
  golf: "golf-trip",
  campfire: "campfire-group",
};

const WORDS: [Scene, RegExp][] = [
  ["golf", /\bgolf|\bfairway|\btee time|\bpebble beach\b/i],
  ["beach", /\bbeach|\bocean|\bisland|\btropic|\bcoast|\bbungalow|\bresort|\bcabo\b|\bcancun|\bhawaii|\bmaui|\bkey west|\bbahamas|\bcaribbean|\bmexico\b/i],
  ["cabin", /\bcabin|\bmountain|\bski\b|\bskiing|\blodge|\bpines?\b|\bforest|\bwoods\b|\bsmok(y|ies)|\btahoe|\baspen|\bvail|\bbreckenridge|\bpark city|\bgatlinburg|\bcamp(ing|ground)?\b/i],
  ["lake", /\blake|\bcanoe|\bdock\b|\briver\b|\bshore/i],
];

/** Lake is the default scene. The first matching scene wins, golf before beach (Pebble Beach). */
export function sceneFor(...texts: (string | null | undefined)[]): Scene {
  const text = texts.filter(Boolean).join(" ");
  for (const [scene, re] of WORDS) if (re.test(text)) return scene;
  return "lake";
}

/** Day image for a scene. Night is the lake night twin for every scene until more twins exist. */
export function sceneSrc(scene: Scene) {
  return { day: `/illustrations/${FILES[scene]}.webp`, night: "/illustrations/lake-night.webp" };
}

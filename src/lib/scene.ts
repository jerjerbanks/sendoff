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

/** Places with no scene words take one of these, so options in one poll look different. Golf only when the words say golf. */
const SPARE: Scene[] = ["cabin", "lake", "beach"];

/**
 * Thumbnail scenes for a "where" poll's options, in order: an option's own words first,
 * then the first spare scene no other option in the poll is using yet (cycling once all are taken).
 */
export function optionScenes(labels: string[]): Scene[] {
  const matched = labels.map((label) => {
    for (const [scene, re] of WORDS) if (re.test(label)) return scene;
    return null;
  });
  const used = new Set(matched.filter((scene): scene is Scene => scene !== null));
  let spare = 0;
  return matched.map((scene) => {
    if (scene) return scene;
    const free = SPARE.find((candidate) => !used.has(candidate));
    const pick = free ?? SPARE[spare++ % SPARE.length]!;
    used.add(pick);
    return pick;
  });
}

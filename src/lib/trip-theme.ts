/**
 * v7 trip-type themes. A trip's theme is DERIVED at render time from data the page already
 * loaded for a member (type, sub-type, name, place, option titles). Pure: no I/O, no queries,
 * nothing stored. Storing a theme on the trip is a follow-up that needs Jeremy's approval.
 */
export type TripTheme = "outdoors" | "golf" | "beach" | "party" | "city" | "ski";

export const TRIP_THEMES: readonly TripTheme[] = ["outdoors", "golf", "beach", "party", "city", "ski"];
export const DEFAULT_TRIP_THEME: TripTheme = "outdoors";

export function isTripTheme(value: unknown): value is TripTheme {
  return typeof value === "string" && (TRIP_THEMES as readonly string[]).includes(value);
}

/*
 * Starter keyword lists. They're deliberately short and plain; better destination matching
 * (a curated place list or geocoding) is a follow-up. Matching is case-insensitive and on word
 * boundaries, so "links" matches "the links" but not "linksys".
 */
const GOLF = ["golf", "tee time", "tee times", "links", "fairway", "fairways", "kohler", "pebble", "pinehurst", "scottsdale golf", "bandon", "whistling straits"];
const SKI = ["ski", "skiing", "snowboard", "snowboarding", "chalet", "slopes", "aspen", "vail", "park city", "breckenridge", "telluride", "whistler", "big sky"];
/** Tahoe is a ski place only in winter (Dec–Mar), and only when dates are already loaded. */
const SKI_WINTER_ONLY = ["tahoe"];
const BEACH = ["beach", "ocean", "shore", "coast", "island", "outer banks", "destin", "gulf shores", "myrtle", "cabo", "tulum", "maui", "key west", "cape cod"];
const CITY = ["chicago", "nyc", "new york", "nashville", "austin", "boston", "denver", "new orleans", "san francisco", "seattle", "dc", "city", "downtown"];
const OUTDOORS = ["lake", "cabin", "camp", "camping", "woods", "pines", "lodge", "river", "door county"];
const PARTY_SUBTYPES = ["bachelor", "bachelorette", "joint"];

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matcher(words: string[]): RegExp {
  return new RegExp(`(?:^|[^a-z0-9])(?:${words.map(escape).join("|")})(?![a-z0-9])`, "i");
}

const RE = {
  golf: matcher(GOLF),
  ski: matcher(SKI),
  skiWinter: matcher(SKI_WINTER_ONLY),
  beach: matcher(BEACH),
  city: matcher(CITY),
  outdoors: matcher(OUTDOORS),
};

function isWinter(month: number | null | undefined) {
  return month != null && (month === 12 || month <= 3);
}

export function deriveTripTheme(input: {
  /** PR #7 kind: "adult" | "family" (stored "pre_wedding" also counts as adult). */
  type?: string | null;
  /** PR #7 sub-type: "bachelor" | "bachelorette" | "joint" | "none" | null. */
  subType?: string | null;
  /** The trip's place, whatever it already stores. */
  destination?: string | null;
  /** Option / activity titles the page already has. */
  activities?: string[] | null;
  name?: string | null;
  /** Month (1–12) of the trip's dates, only if the page already has them. Used for Tahoe. */
  month?: number | null;
}): TripTheme {
  const text = [input.name, input.destination, ...(input.activities ?? [])].filter((part): part is string => !!part && !!part.trim()).join(" \n ");
  const subType = (input.subType ?? "").toLowerCase();

  // 1. Golf beats everything, even a bachelor sub-type (the guys' golf bach).
  if (RE.golf.test(text)) return "golf";
  // 2. Ski.
  if (RE.ski.test(text) || (isWinter(input.month) && RE.skiWinter.test(text))) return "ski";
  // 3. Wedding sub-types are a party.
  if (PARTY_SUBTYPES.includes(subType)) return "party";
  // 4. Beach.
  if (RE.beach.test(text)) return "beach";
  // 5. City.
  if (RE.city.test(text)) return "city";
  // 6. Lake / cabin.
  if (RE.outdoors.test(text)) return "outdoors";
  // 7–8. A family trip goes to the beach only on a beach keyword (already handled in 4), so
  // everything else falls back to the default.
  return DEFAULT_TRIP_THEME;
}

/** Display data per theme, from the design pack's themes-v7.json. Copy is flavour only. */
export const THEME_INFO: Record<
  TripTheme,
  { name: string; vibeLabel: string; note: string; done: string; empty: string }
> = {
  outdoors: {
    name: "Lake & cabin",
    vibeLabel: "The outdoors",
    note: "Your vote is private. Everyone sees totals.",
    done: "Everyone’s in. See you at the dock.",
    empty: "No cabins yet.",
  },
  golf: {
    name: "Golf trip",
    vibeLabel: "Fairways",
    note: "Budgets stay private. Everyone sees totals.",
    done: "Tee times, here we come. Everyone’s in.",
    empty: "No courses yet.",
  },
  beach: {
    name: "Beach trip",
    vibeLabel: "Beach days",
    note: "Your vote is private. Every household sees its own share.",
    done: "The whole crew is in. Sandcastle time.",
    empty: "No beach houses yet.",
  },
  party: {
    name: "Party weekend",
    vibeLabel: "Party weekend",
    note: "Your vote and your budget stay private.",
    done: "The squad’s all in. Cheers!",
    empty: "No party houses yet.",
  },
  city: {
    name: "City weekend",
    vibeLabel: "City break",
    note: "Your vote is private. Everyone sees totals.",
    done: "Everyone’s in. Dinner’s on.",
    empty: "No hotels yet.",
  },
  ski: {
    name: "Ski trip",
    vibeLabel: "Snow days",
    note: "Your vote is private. Everyone sees totals.",
    done: "Everyone’s in. First chair, here we come.",
    empty: "No chalets yet.",
  },
};

/** The trip-type chip: the theme (or the wedding sub-type) plus the size the page already has. */
export function themeChipLabel(theme: TripTheme, trip: { tripType: string; preWeddingStyle: string | null; travelerCount: number }): string {
  const style = trip.preWeddingStyle;
  let kind: string = THEME_INFO[theme].name;
  if (theme === "party" && (style === "bachelor" || style === "bachelorette")) kind = style === "bachelor" ? "Bachelor" : "Bachelorette";
  else if (theme === "party" && style === "joint") kind = "Joint bach";
  else if (theme === "beach" && trip.tripType === "family") kind = "Family beach";
  const people = `${trip.travelerCount} ${trip.travelerCount === 1 ? "person" : "people"}`;
  return `${kind} · ${people}`;
}

/** Order of the "What's the vibe?" tiles for a trip kind and sub-type. */
export function vibeOrder(kind: string | null | undefined, subType: string | null | undefined): TripTheme[] {
  if (subType && PARTY_SUBTYPES.includes(subType)) return ["party", "golf", "beach", "city", "ski", "outdoors"];
  if (kind === "family") return ["beach", "outdoors", "ski", "city"];
  return ["outdoors", "golf", "city", "ski", "beach", "party"];
}

/** The theme for a trip the page already loaded: its kind, sub-type, name, place and option titles. */
export function themeForTrip(trip: {
  tripType: string;
  preWeddingStyle: string | null;
  name: string;
  place: string;
  polls?: { options: { label: string }[] }[];
}): TripTheme {
  return deriveTripTheme({
    type: trip.tripType === "family" ? "family" : "adult",
    subType: trip.preWeddingStyle,
    name: trip.name,
    destination: trip.place,
    activities: (trip.polls ?? []).flatMap((poll) => poll.options.map((option) => option.label)),
  });
}

/**
 * Staging QA: with the vibe flag on, ?ft-theme=<theme> overrides the derived theme for that
 * one page view. Read-only and never saved; ignored when the flag is off.
 */
export function activeTripTheme(derived: TripTheme, override: string | string[] | null | undefined, flagOn: boolean): TripTheme {
  const value = Array.isArray(override) ? override[0] : override;
  return flagOn && isTripTheme(value) ? value : derived;
}

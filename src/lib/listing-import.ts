/**
 * Read rooms and beds from an Airbnb listing, or from the "Where you'll sleep"
 * text an organizer pastes. Pure functions only, so the same code runs on the
 * Worker (link import) and in the browser (pasted text).
 *
 * CPU matters here (50 ms per request): the listing page is ~650 KB, so we
 * never build a DOM or parse the whole embedded state. We find the
 * `data-deferred-state-0` script, slice out just the `sleepingArrangements`
 * and `overview` objects by bracket matching, and JSON.parse those few KB.
 */

export const BED_TYPES = ["king", "queen", "double", "single", "bunk", "sofa", "crib", "air_mattress", "other"] as const;
export type ImportBedType = (typeof BED_TYPES)[number];

export interface ImportBed {
  type: ImportBedType;
  count: number;
}

export interface ImportRoom {
  room: string;
  floor: string | null;
  beds: ImportBed[];
}

/** Sofa beds, air mattresses and cribs are listed but nobody has to count on them. */
export function isOptionalBed(type: ImportBedType): boolean {
  return type === "sofa" || type === "air_mattress" || type === "crib";
}

/** People a bed of this type sleeps, per bed. A bunk is one bed with two spots. */
export function spotsPerBed(type: ImportBedType): number {
  return type === "bunk" ? 2 : 1;
}

export function importBedLabel(type: ImportBedType, count = 1): string {
  const names: Record<ImportBedType, [string, string]> = {
    king: ["King bed", "King beds"],
    queen: ["Queen bed", "Queen beds"],
    double: ["Double bed", "Double beds"],
    single: ["Single bed", "Single beds"],
    bunk: ["Bunk bed", "Bunk beds"],
    sofa: ["Sofa bed", "Sofa beds"],
    crib: ["Crib", "Cribs"],
    air_mattress: ["Air mattress", "Air mattresses"],
    other: ["Other bed", "Other beds"],
  };
  return names[type][count === 1 ? 0 : 1];
}

// ---------------------------------------------------------------------------
// Links

/**
 * The listing id from an airbnb.com/rooms/{id} link, or null for anything else
 * (VRBO, other Airbnb domains, search pages). Query strings and fragments are
 * dropped. We only ever fetch the canonical URL built from the id, never the
 * pasted string itself.
 */
export function airbnbListingId(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (host !== "airbnb.com" && host !== "www.airbnb.com" && host !== "m.airbnb.com") return null;
  const match = url.pathname.match(/^\/rooms\/(\d{1,20})\/?$/);
  return match ? match[1] : null;
}

export function canonicalListingUrl(id: string): string {
  return `https://www.airbnb.com/rooms/${id}`;
}

// ---------------------------------------------------------------------------
// Bed text: "1 king bed", "2 single beds", "1 queen bed, 1 bunk bed"

const BED_WORDS: [RegExp, ImportBedType][] = [
  [/\bking\b/, "king"],
  [/\bqueen\b/, "queen"],
  [/\b(?:double|full)\b/, "double"],
  [/\bbunk\b/, "bunk"],
  [/\b(?:sofa|couch|futon|day ?bed|pull[- ]?out)\b/, "sofa"],
  [/\b(?:crib|cot|pack ?(?:n|and|&) ?play|toddler)\b/, "crib"],
  [/\b(?:air|floor) mattress/, "air_mattress"],
  [/\b(?:single|twin)\b/, "single"],
];

const COUNT_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

/** One "N kind bed" phrase, or null if it isn't one. */
function parseBedPhrase(phrase: string): ImportBed | null {
  const text = phrase.toLowerCase().replace(/[’']/g, "'").trim();
  const match = text.match(/^(\d{1,2}|a|an|one|two|three|four|five|six|seven|eight)\s+(.+)$/);
  if (!match) return null;
  const count = /^\d/.test(match[1]) ? Number(match[1]) : COUNT_WORDS[match[1]];
  const rest = match[2];
  // It has to name a bed: "bed(s)", "mattress", "crib", "bunk", "sofa", "couch", "futon".
  if (!/\b(?:beds?|mattress(?:es)?|cribs?|bunks?|sofas?|couch(?:es)?|futons?|cots?|daybeds?)\b/.test(rest)) return null;
  if (!count || count < 1 || count > 20) return null;
  const type = BED_WORDS.find(([pattern]) => pattern.test(rest))?.[1] ?? "other";
  return { type, count };
}

/** Every bed in a line like "1 queen bed, 1 bunk bed" or "2 single beds · 1 crib". Null if any part isn't a bed. */
export function parseBedLine(line: string): ImportBed[] | null {
  const parts = line
    .split(/\s*(?:,|·|•|\band\b|&|\+|;)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const beds: ImportBed[] = [];
  for (const part of parts) {
    const bed = parseBedPhrase(part);
    if (!bed) return null;
    beds.push(bed);
  }
  return mergeBeds(beds);
}

function mergeBeds(beds: ImportBed[]): ImportBed[] {
  const out: ImportBed[] = [];
  for (const bed of beds) {
    const same = out.find((item) => item.type === bed.type);
    if (same) same.count += bed.count;
    else out.push({ ...bed });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Floors, from the photo captions in a sleeping-arrangements stop

const FLOOR_PATTERNS: [RegExp, string][] = [
  [/\b(?:main|ground|entry|street)[- ](?:level|floor)\b/i, "Main level"],
  [/\b(?:upper|top)[- ](?:level|floor)\b/i, "Upper level"],
  [/\blower[- ](?:level|floor)\b/i, "Lower level"],
  [/\b(?:1st|first)[- ]floor\b/i, "1st floor"],
  [/\b(?:2nd|second)[- ](?:floor|level)\b/i, "2nd floor"],
  [/\b(?:3rd|third)[- ](?:floor|level)\b/i, "3rd floor"],
  [/\bbasement\b/i, "Basement"],
  [/\bloft\b/i, "Loft"],
  [/\bupstairs\b/i, "Upstairs"],
  [/\bdownstairs\b/i, "Downstairs"],
];

/** A floor named in the caption text, or null. The first pattern that matches wins. */
export function floorFromCaptions(captions: string[]): string | null {
  for (const caption of captions) {
    for (const [pattern, floor] of FLOOR_PATTERNS) if (pattern.test(caption)) return floor;
  }
  return null;
}

/** True for floors the existing "Ground floor" room flag should carry. */
export function isGroundFloor(floor: string | null): boolean {
  if (!floor) return false;
  return /\b(?:main|ground|entry|street|1st|first)\b/i.test(floor);
}

// ---------------------------------------------------------------------------
// Listing HTML

export type ListingFailure = "no_state" | "no_stops" | "parse_error";

export type ListingParse =
  | { ok: true; rooms: ImportRoom[]; bedrooms: number | null }
  | { ok: false; reason: ListingFailure; bedrooms: number | null };

const STATE_MARKER = 'id="data-deferred-state-0"';

/**
 * Starting at `from` (which must point at "{" or "["), return the end index
 * (exclusive) of that JSON value, honoring strings and escapes. -1 if unbalanced.
 */
function jsonValueEnd(text: string, from: number, limit: number): number {
  let depth = 0;
  let inString = false;
  for (let i = from; i < limit; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92) i++; // backslash: skip the escaped char
      else if (c === 34) inString = false;
      continue;
    }
    if (c === 34) inString = true;
    else if (c === 123 || c === 91) depth++;
    else if (c === 125 || c === 93) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** JSON.parse the object right after `"key":` (first match after `from`), or undefined. */
function sliceObject(text: string, key: string, from: number, limit: number): unknown {
  const at = text.indexOf(`"${key}":`, from);
  if (at < 0 || at >= limit) return undefined;
  const start = at + key.length + 3;
  const open = text.charCodeAt(start);
  if (open !== 123 && open !== 91) return undefined;
  const end = jsonValueEnd(text, start, limit);
  if (end < 0) return undefined;
  return JSON.parse(text.slice(start, end));
}

interface RawStop {
  name?: unknown;
  items?: { image?: { caption?: { user?: { localizedString?: unknown } } } }[] | null;
  description?: { descriptions?: { text?: unknown }[] | null } | null;
}

function bedroomCount(items: unknown): number | null {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const text = typeof item === "string" ? item : (item as { text?: unknown })?.text;
    if (typeof text !== "string") continue;
    const match = text.match(/^(\d{1,2})\s+bedrooms?$/i);
    if (match) return Number(match[1]);
    if (/^studio$/i.test(text.trim())) return 0;
  }
  return null;
}

/** Rooms and beds from a listing page's HTML. Never throws. */
export function parseListingHtml(html: string): ListingParse {
  const marker = html.indexOf(STATE_MARKER);
  if (marker < 0) return { ok: false, reason: "no_state", bedrooms: null };
  const start = html.indexOf(">", marker) + 1;
  const end = html.indexOf("</script>", start);
  if (start <= 0 || end < 0) return { ok: false, reason: "no_state", bedrooms: null };

  // Both objects live under niobeClientData → … → pdpPresentation.
  const scope = html.indexOf('"pdpPresentation":', start);
  const from = scope >= 0 && scope < end ? scope : start;

  let bedrooms: number | null = null;
  try {
    const overviewAt = html.indexOf('"overview":{"__typename":"StaysPdpOverview"', from);
    if (overviewAt >= 0 && overviewAt < end) {
      const overview = sliceObject(html, "overview", overviewAt, end) as { items?: unknown } | undefined;
      bedrooms = bedroomCount(overview?.items);
    }
  } catch {
    bedrooms = null;
  }

  let stops: RawStop[];
  try {
    const arrangements = sliceObject(html, "sleepingArrangements", from, end) as { stops?: unknown } | null | undefined;
    if (!arrangements || !Array.isArray(arrangements.stops)) return { ok: false, reason: "no_stops", bedrooms };
    stops = arrangements.stops as RawStop[];
  } catch {
    return { ok: false, reason: "parse_error", bedrooms };
  }

  const rooms: ImportRoom[] = [];
  for (const stop of stops) {
    const name = typeof stop?.name === "string" ? stop.name.trim().slice(0, 60) : "";
    const lines = (stop?.description?.descriptions ?? [])
      .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
      .filter(Boolean);
    const beds = mergeBeds(lines.flatMap((line) => parseBedLine(line) ?? []));
    if (!name || beds.length === 0) continue;
    const captions = (stop.items ?? [])
      .map((item) => item?.image?.caption?.user?.localizedString)
      .filter((caption): caption is string => typeof caption === "string");
    rooms.push({ room: name, floor: floorFromCaptions(captions), beds });
  }
  if (rooms.length === 0) return { ok: false, reason: "no_stops", bedrooms };
  return { ok: true, rooms, bedrooms };
}

// ---------------------------------------------------------------------------
// Pasted "Where you'll sleep" text

const HEADING = /^where\s+you['’]?(?:ll|\s+will)\s+sleep\b/i;

/**
 * Split "Bedroom 11 king bed" (a room name glued to its beds by copy-paste)
 * into ["Bedroom 1", beds]. Tries the latest split first, since the bed count
 * is usually one digit. Null if no split gives a bed line.
 */
function splitGlued(line: string): [string, ImportBed[]] | null {
  for (let i = line.length - 1; i > 0; i--) {
    if (!/\d/.test(line[i])) continue;
    const head = line.slice(0, i).trim();
    if (!head || /^\d+$/.test(head)) continue;
    const beds = parseBedLine(line.slice(i));
    if (beds) return [head, beds];
  }
  return null;
}

/**
 * Rooms from pasted text. Each bed line belongs to the closest non-bed line
 * above it, which names the room ("Bedroom 1", then "1 king bed"). A short
 * line naming only a floor ("Main level") sets the floor for the rooms after
 * it. Carousel noise ("1 / 2", "Show all") is ignored.
 */
export function parseSleepText(text: string): ImportRoom[] {
  const rooms: ImportRoom[] = [];
  let pending: string | null = null;
  let floor: string | null = null;
  const lines = text
    .slice(0, 20_000)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const add = (name: string, beds: ImportBed[]) => {
    const existing = rooms.find((room) => room.room === name);
    if (existing) existing.beds = mergeBeds([...existing.beds, ...beds]);
    else rooms.push({ room: name.slice(0, IMPORT_LIMITS.name), floor, beds });
  };

  for (const line of lines) {
    if (HEADING.test(line)) continue;
    if (/^\d+\s*\/\s*\d+$/.test(line) || /^(?:show|see) (?:all|more)\b/i.test(line)) continue;

    const beds = parseBedLine(line);
    if (beds) {
      add(pending ?? `Room ${rooms.length + 1}`, beds);
      pending = null;
      continue;
    }
    const glued = splitGlued(line);
    if (glued) {
      add(glued[0], glued[1]);
      pending = null;
      continue;
    }
    const level = line.length <= 24 ? FLOOR_PATTERNS.find(([pattern]) => pattern.test(line)) : undefined;
    if (level) {
      floor = level[1];
      continue;
    }
    if (line.length <= IMPORT_LIMITS.name) pending = line;
  }
  return rooms.slice(0, IMPORT_LIMITS.rooms);
}

// ---------------------------------------------------------------------------
// Mapping to the app's sleep spots

/** The app's bed type and default weight for an imported bed. Weights follow the Rooms and beds defaults. */
export function importedSpot(type: ImportBedType, aloneInRoom: boolean): { bedType: string; weight: number; privateRoom: boolean } {
  switch (type) {
    case "king":
    case "queen":
      return { bedType: type, weight: aloneInRoom ? 1.25 : 1, privateRoom: aloneInRoom };
    case "double":
      return { bedType: "full", weight: 1, privateRoom: aloneInRoom };
    case "single":
      return { bedType: "twin", weight: 0.8, privateRoom: aloneInRoom };
    case "bunk":
      return { bedType: "bunk", weight: 0.8, privateRoom: false };
    case "sofa":
      return { bedType: "sofa_bed", weight: 0.6, privateRoom: false };
    case "air_mattress":
      return { bedType: "air_mattress", weight: 0.5, privateRoom: false };
    default:
      return { bedType: "bed", weight: 1, privateRoom: aloneInRoom };
  }
}

/** The sleep_spots rows an imported room becomes. A bunk bed is two spots; a crib is no spot, only "crib space". */
export function importedRoomSpots(room: ImportRoom) {
  const beds = room.beds.filter((bed) => bed.type !== "crib");
  const spotCount = beds.reduce((sum, bed) => sum + bed.count * spotsPerBed(bed.type), 0);
  const alone = spotCount === 1;
  const crib = room.beds.some((bed) => bed.type === "crib");
  const ground = isGroundFloor(room.floor);
  const spots: { bedType: string; weight: number; privateRoom: boolean; optional: boolean }[] = [];
  for (const bed of beds) {
    for (let i = 0; i < bed.count * spotsPerBed(bed.type); i++) {
      spots.push({ ...importedSpot(bed.type, alone), optional: isOptionalBed(bed.type) });
    }
  }
  return { spots, cribSpace: crib, groundFloor: ground };
}

// ---------------------------------------------------------------------------
// Checks shared by the confirm screen and the save action

export const IMPORT_LIMITS = { rooms: 30, bedsPerRoom: 12, countPerBed: 12, spots: 80, name: 60, floor: 30 } as const;

/** Bedrooms the parsed rooms add up to, for the mismatch check: rooms with at least one bed that isn't optional. */
export function countBedrooms(rooms: ImportRoom[]): number {
  return rooms.filter((room) => room.beds.some((bed) => !isOptionalBed(bed.type))).length;
}

/** Clean and validate rooms sent back from the confirm screen. Returns an error message or the cleaned rooms. */
export function cleanImportRooms(input: unknown): { ok: true; rooms: ImportRoom[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Add at least one room." };
  if (input.length > IMPORT_LIMITS.rooms) return { ok: false, error: `Import up to ${IMPORT_LIMITS.rooms} rooms at a time.` };
  const rooms: ImportRoom[] = [];
  const names = new Set<string>();
  let spots = 0;
  for (const raw of input as Partial<ImportRoom>[]) {
    const room = typeof raw?.room === "string" ? raw.room.replace(/\s+/g, " ").trim().slice(0, IMPORT_LIMITS.name) : "";
    if (!room) return { ok: false, error: "Every room needs a name." };
    const key = room.toLowerCase();
    if (names.has(key)) return { ok: false, error: `Two rooms are named "${room}". Rename one.` };
    names.add(key);
    const floorRaw = typeof raw.floor === "string" ? raw.floor.replace(/\s+/g, " ").trim().slice(0, IMPORT_LIMITS.floor) : "";
    const bedsRaw = Array.isArray(raw.beds) ? raw.beds : [];
    if (bedsRaw.length === 0) return { ok: false, error: `${room} has no beds. Add one or remove the room.` };
    if (bedsRaw.length > IMPORT_LIMITS.bedsPerRoom) return { ok: false, error: `${room} has too many bed rows.` };
    const beds: ImportBed[] = [];
    for (const bed of bedsRaw) {
      const type = (BED_TYPES as readonly string[]).includes(bed?.type) ? (bed.type as ImportBedType) : null;
      const count = Number(bed?.count);
      if (!type) return { ok: false, error: `Pick a bed type in ${room}.` };
      if (!Number.isInteger(count) || count < 1 || count > IMPORT_LIMITS.countPerBed) {
        return { ok: false, error: `Bed counts in ${room} must be 1 to ${IMPORT_LIMITS.countPerBed}.` };
      }
      beds.push({ type, count });
      if (type !== "crib") spots += count * spotsPerBed(type);
    }
    rooms.push({ room, floor: floorRaw || null, beds: mergeBeds(beds) });
  }
  if (spots > IMPORT_LIMITS.spots) return { ok: false, error: `That's more than ${IMPORT_LIMITS.spots} sleeping spots.` };
  return { ok: true, rooms };
}

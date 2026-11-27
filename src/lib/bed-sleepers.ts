/**
 * Who sleeps in which bed, for the Beds page. Pure and display-only: what a party pays
 * follows the beds it holds, never who lies in them.
 *
 * Per party: travelers who picked one of the party's beds go there first; everyone else
 * who needs a bed (not an infant, not co-sleeping) fills the party's remaining beds in
 * traveler order; co-sleepers join the bed they share. A bed the party holds with nobody
 * resolved into it stays unnamed, and the caller can fall back to the party.
 */
import { bedLabel } from "./labels";

export interface SleeperTraveler {
  id: string;
  name: string;
  ageBand: string;
  coSleepSpotId: string | null;
  bedSpotId: string | null;
}

export interface Sleeper {
  travelerId: string;
  name: string;
  partyUserId: string;
  /** Picked by the party, rather than filled in by order. */
  chosen: boolean;
  coSleeping: boolean;
}

export function sleepersByBed(
  parties: { payerUserId: string; travelers: SleeperTraveler[] }[],
  /** Bed ids each party holds, in the order the beds are listed. */
  bedsHeld: (partyUserId: string) => string[],
): Map<string, Sleeper[]> {
  const out = new Map<string, Sleeper[]>();
  const put = (spotId: string, sleeper: Sleeper) => out.set(spotId, [...(out.get(spotId) ?? []), sleeper]);
  for (const party of parties) {
    const held = bedsHeld(party.payerUserId);
    if (held.length === 0) continue;
    const needBed = party.travelers.filter((traveler) => traveler.ageBand !== "infant" && !(traveler.coSleepSpotId && held.includes(traveler.coSleepSpotId)));
    const taken = new Set<string>();
    const later: SleeperTraveler[] = [];
    for (const traveler of needBed) {
      const pick = traveler.bedSpotId;
      if (pick && held.includes(pick) && !taken.has(pick)) {
        taken.add(pick);
        put(pick, { travelerId: traveler.id, name: traveler.name, partyUserId: party.payerUserId, chosen: true, coSleeping: false });
      } else later.push(traveler);
    }
    const free = held.filter((spotId) => !taken.has(spotId));
    later.forEach((traveler, index) => {
      const spotId = free[index];
      if (spotId) put(spotId, { travelerId: traveler.id, name: traveler.name, partyUserId: party.payerUserId, chosen: false, coSleeping: false });
    });
    for (const traveler of party.travelers) {
      if (traveler.ageBand !== "infant" && traveler.coSleepSpotId && held.includes(traveler.coSleepSpotId)) {
        put(traveler.coSleepSpotId, { travelerId: traveler.id, name: traveler.name, partyUserId: party.payerUserId, chosen: true, coSleeping: true });
      }
    }
  }
  return out;
}

/** "Jeremy Cmiel" → "JC", "Ava" → "A", "Mary-Kate O'Neil" → "MO". */
export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * Names for the beds in one room, so two queens never read the same:
 * a type that appears once is "Queen"; a repeated type is "Queen 1", "Queen 2".
 */
export function bedNames(beds: { id: string; bedType?: string | null }[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const bed of beds) counts.set(bedLabel(bed.bedType ?? undefined), (counts.get(bedLabel(bed.bedType ?? undefined)) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const bed of beds) {
    const label = bedLabel(bed.bedType ?? undefined);
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    out.set(bed.id, (counts.get(label) ?? 0) > 1 ? `${label} ${n}` : label);
  }
  return out;
}

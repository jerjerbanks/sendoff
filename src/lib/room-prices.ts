export interface PricedSpot {
  id: string;
  roomName?: string | null;
  weight: number;
  reservedForHonoree: boolean;
  sharingEnabled: boolean;
  capacity: number;
}

/**
 * Live lodging prices at today's occupancy, in cents.
 *
 * spots: each bed's price for the party that takes it now. An open bed is priced as if that party
 * joined the beds already held (its weight over held weight plus its own). An open share slot is half.
 *
 * rooms: what a party pays for a whole room. An empty room is priced as one unit (its beds' weight
 * together), never as the sum of each bed priced alone. That sum is what put $4,800 tags on a
 * $2,400 house: every empty bed priced alone is the whole house.
 */
export function livePriceTable(
  lodgingCents: number,
  spots: PricedSpot[],
  occupants: (spotId: string) => number,
): { spots: Record<string, number>; rooms: Record<string, number> } {
  const counted = spots.filter((spot) => !spot.reservedForHonoree);
  const base = counted.filter((spot) => occupants(spot.id) > 0).reduce((sum, spot) => sum + spot.weight, 0);
  const share = (weight: number, over: number) => (over > 0 ? Math.round((lodgingCents * weight) / over) : 0);

  const spotPrices: Record<string, number> = {};
  for (const spot of counted) {
    const taken = occupants(spot.id);
    if (taken === 0) spotPrices[spot.id] = share(spot.weight, base + spot.weight);
    else if (spot.sharingEnabled && taken < (spot.capacity || 2)) spotPrices[spot.id] = share(spot.weight / 2, base);
    else spotPrices[spot.id] = share(spot.weight / taken, base);
  }

  const byRoom = new Map<string, PricedSpot[]>();
  for (const spot of counted) {
    const key = spot.roomName ?? spot.id;
    byRoom.set(key, [...(byRoom.get(key) ?? []), spot]);
  }
  const rooms: Record<string, number> = {};
  for (const [key, inRoom] of byRoom) {
    const open = inRoom.filter((spot) => occupants(spot.id) === 0);
    const held = inRoom.filter((spot) => occupants(spot.id) > 0);
    const openWeight = open.reduce((sum, spot) => sum + spot.weight, 0);
    rooms[key] = held.reduce((sum, spot) => sum + (spotPrices[spot.id] ?? 0), 0) + (open.length > 0 ? share(openWeight, base + openWeight) : 0);
  }
  return { spots: spotPrices, rooms };
}

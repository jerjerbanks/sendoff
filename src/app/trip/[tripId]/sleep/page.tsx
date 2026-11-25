import { addSpotAction, assignRoomAction, updateRoomAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandLabel, bedLabel, shareComfortLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import type { SpotRecord } from "@/lib/store";
import { partySleeps } from "@/lib/trip-math";
import { loadTripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";

const bedTypes = [
  ["king", "King", "1.5"],
  ["queen", "Queen", "1.25"],
  ["full", "Full", "1"],
  ["twin", "Twin", "0.8"],
  ["bunk", "Bunk", "0.8"],
  ["sofa_bed", "Sofa bed", "0.6"],
  ["couch", "Couch", "0.5"],
  ["air_mattress", "Air mattress", "0.5"],
] as const;

/** S13. Organizer defines rooms and beds, accessibility, holds, and co-sleep limits. */
export default async function SleepSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const { error } = await searchParams;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return null;
  const rooms = new Map<string, SpotRecord[]>();
  for (const spot of [...view.spots].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    const key = spot.roomName ?? spot.id;
    rooms.set(key, [...(rooms.get(key) ?? []), spot]);
  }
  const sleeps = (spot: SpotRecord) => Math.max(spot.capacity || 1, partySleeps(spot));
  const capacity = view.spots.reduce((sum, spot) => sum + sleeps(spot), 0);
  const infants = view.parties.flatMap((party) => party.travelers).filter((traveler) => traveler.ageBand === "infant").length;
  const needAtCap = Math.max(view.bedsNeeded, view.maxHeadcount - infants);
  const payingParties = view.parties.filter((party) => !party.isHonoreeOnly && party.status !== "off_trip" && party.status !== "declined");
  const partyName = (id: string | null | undefined) => view.parties.find((party) => party.payerUserId === id)?.name ?? null;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="ft-h1">Rooms and beds</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          One lodging bill, split by the beds each party claims. Defaults: king or queen with a private bath 1.5, private room 1.25, full or a
          bed in a shared room 1.0, twin or bunk 0.8, sofa bed 0.6, couch or air mattress 0.5. An empty bed costs nothing.
        </p>
      </div>
      <p className={`rounded-xl px-3 py-2 text-sm ${capacity < needAtCap ? "bg-warn-soft text-warn" : "bg-chip"}`}>
        Beds sleep {capacity}. {view.bedsNeeded} travelers need one now
        {view.maxHeadcount - infants > view.bedsNeeded ? `, up to ${view.maxHeadcount - infants} at the ${view.maxHeadcount}-traveler cap` : ""}.
        {capacity < needAtCap ? " Add a bed or allow sharing before the trip fills up." : " Infants in a crib don't need a bed."}
      </p>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      <ul className="grid gap-3">
        {[...rooms.entries()].map(([roomName, spots]) => {
          const first = spots[0];
          const occupantIds = [...new Set(view.claims.filter((claim) => claim.status === "approved" && spots.some((spot) => spot.id === claim.spotId)).map((claim) => claim.userId))];
          return (
            <li key={roomName} className="ft-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="ft-h2">{roomName}</h3>
                {view.spotPrices ? (
                  <p className="text-sm font-semibold">{money(spots.reduce((sum, spot) => sum + (view.spotPrices?.[spot.id] ?? 0), 0))}</p>
                ) : null}
              </div>
              <ul className="mt-1 text-sm text-muted">
                {spots.map((spot) => (
                  <li key={spot.id}>
                    {bedLabel(spot.bedType)} · weight {spot.weight}
                    {spot.sharingEnabled ? " · shareable between parties" : ""}
                    {spot.reservedForHonoree ? " · guest of honor" : ""}
                  </li>
                ))}
              </ul>
              {occupantIds.length > 0 ? (
                <div className="mt-2 grid gap-1 text-sm">
                  {occupantIds.map((id) => {
                    const party = view.parties.find((item) => item.payerUserId === id);
                    return (
                      <p key={id}>
                        <span className="font-semibold">{party?.name ?? "Party"}</span>
                        <span className="text-muted">
                          {" "}
                          · {party?.travelers.map((traveler) => `${traveler.name.split(" ")[0]} (${ageBandLabel(traveler.ageBand).toLowerCase()})`).join(", ")}
                        </span>
                      </p>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Open</p>
              )}
              {view.isOrganizer ? (
                <details className="mt-3 rounded-2xl bg-chip/60">
                  <summary className="ft-summary px-3 text-[15px] font-medium">Access, holds, co-sleep</summary>
                  <form action={updateRoomAction} className="grid gap-2 px-3 pb-3 text-sm">
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={view.viewer?.userId} />
                    <input type="hidden" name="roomName" value={roomName} />
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        ["groundFloor", "Ground floor", first?.groundFloor],
                        ["noStairs", "No stairs", first?.noStairs],
                        ["accessibleBath", "Accessible bath", first?.accessibleBath],
                        ["cribSpace", "Crib space", first?.cribSpace],
                      ].map(([name, label, on]) => (
                        <label key={String(name)} className="flex items-center gap-2">
                          <input type="checkbox" name={String(name)} value="yes" defaultChecked={!!on} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <label className="font-medium">
                      Hold for a party before picks open
                      <select className={`${fieldClass} mt-1`} name="reservedFor" defaultValue={first?.reservedForUserId ?? ""}>
                        <option value="">No hold</option>
                        {payingParties.map((party) => (
                          <option key={party.payerUserId} value={party.payerUserId}>
                            {party.name}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs font-normal text-muted">Others see &ldquo;Reserved&rdquo;, never the reason.</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="coSleepAllowed" value="yes" defaultChecked={first?.coSleepAllowed} />
                        Co-sleeping allowed, up to
                      </label>
                      <Input className="w-16" name="maxCoSleepers" type="number" min={0} max={4} defaultValue={first?.maxCoSleepers ?? 1} aria-label="Most co-sleepers" />
                    </div>
                    <SubmitButton variant="secondary">Save room</SubmitButton>
                  </form>
                  <form action={assignRoomAction} className="flex flex-wrap items-end gap-2 border-t border-line px-3 py-3 text-sm">
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={view.viewer?.userId} />
                    <input type="hidden" name="roomName" value={roomName} />
                    <label className="flex-1 font-medium">
                      Assign the whole room
                      <select className={`${fieldClass} mt-1`} name="partyUserId" defaultValue={first?.reservedForUserId ?? occupantIds[0] ?? ""}>
                        {payingParties.map((party) => (
                          <option key={party.payerUserId} value={party.payerUserId}>
                            {party.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton variant="outline">Assign</SubmitButton>
                  </form>
                </details>
              ) : first?.reservedForUserId ? (
                <p className="mt-2 text-xs text-muted">Reserved{partyName(first.reservedForUserId) && first.reservedForUserId === view.viewerParty?.payerUserId ? " for your party" : ""}.</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {view.isOrganizer ? (
        <section className="ft-panel p-4">
          <h3 className="ft-h2">Needs and sharing notes</h3>
          <p className="mt-1 text-xs text-muted">Only you see this. Use it to place holds; {APP_NAME} never matches people automatically.</p>
          <ul className="mt-3 grid gap-2 text-sm">
            {view.parties.map((party) => {
              const notes = party.travelers.filter((traveler) => traveler.needsNotes);
              if (notes.length === 0 && party.shareComfort === "any" && !party.shareComfortNote) return null;
              return (
                <li key={party.payerUserId} className="rounded-2xl bg-chip/60 px-3 py-2">
                  <p className="font-semibold">{party.name}</p>
                  {notes.map((traveler) => (
                    <p key={traveler.id} className="text-warn">
                      {traveler.name.split(" ")[0]}: {traveler.needsNotes}
                    </p>
                  ))}
                  {party.shareComfort !== "any" || party.shareComfortNote ? (
                    <p className="text-muted">
                      {shareComfortLabel(party.shareComfort)}
                      {party.shareComfortNote ? ` — "${party.shareComfortNote}"` : ""}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {view.isOrganizer && view.status !== "booked" ? (
        <form action={addSpotAction} className="grid gap-3 ft-panel p-4">
          <h3 className="ft-h2">Add a bed</h3>
          <p className="text-xs text-muted">Beds with the same room name form a room a party can claim as a unit.</p>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={view.viewer?.userId} />
          <Input name="roomName" placeholder="Room name, e.g. Bunk room" required aria-label="Room name" />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">
              Bed
              <select className={`${fieldClass} mt-1.5`} name="bedType" defaultValue="queen">
                {bedTypes.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Weight
              <select className={`${fieldClass} mt-1.5`} name="weight" defaultValue="1">
                {["1.5", "1.25", "1", "0.8", "0.6", "0.5"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["privateBath", "Private bath"],
              ["privateRoom", "Private room"],
              ["allowSharing", "Shareable (king/queen)"],
              ["reserved", "Guest of honor"],
              ["groundFloor", "Ground floor"],
              ["noStairs", "No stairs"],
              ["accessibleBath", "Accessible bath"],
              ["cribSpace", "Crib space"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2">
                <input type="checkbox" name={name} value="yes" />
                {label}
              </label>
            ))}
          </div>
          <SubmitButton>Add bed</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

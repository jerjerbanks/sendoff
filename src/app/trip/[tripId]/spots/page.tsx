import { claimRoomAction, claimSpotAction, coSleepAction, optInShareAction, releaseSpotAction, requestSpotAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import { fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { bedLabel, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { listSpotRequests, type SpotRecord } from "@/lib/store";
import { loadTripView } from "@/lib/view";

/** S14. Parties claim a whole room or a single spot, in buy-in order. Never assigned by gender. */
export default async function SpotPickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; committed?: string }>;
}) {
  const { tripId } = await params;
  const { error, committed } = await searchParams;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return null;
  const viewer = view.viewer;
  const party = view.viewerParty;
  const myParty = party?.payerUserId ?? null;
  const partyName = (id: string) => view.parties.find((item) => item.payerUserId === id)?.name ?? "Someone";
  const rooms = new Map<string, SpotRecord[]>();
  for (const spot of [...view.spots].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    const key = spot.roomName ?? spot.id;
    rooms.set(key, [...(rooms.get(key) ?? []), spot]);
  }
  const holders = (spotId: string) => view.claims.filter((claim) => claim.spotId === spotId && claim.status === "approved");
  const canAct = !!viewer && !!party && viewer.role !== "honoree" && party.status !== "off_trip" && party.status !== "declined" && !view.cancelled;
  const requests = myParty ? (await listSpotRequests(tripId)).filter((request) => request.status === "pending" && request.counterpartUserId === myParty) : [];
  const myBeds = view.spots.filter((spot) => holders(spot.id).some((claim) => claim.userId === myParty));

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Pick a room</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Parties pick in the order they bought in. Take a whole room for your household, or one bed.{" "}
          {view.bedChangePolicy === "locked"
            ? "Beds are locked, so only the organizer moves people."
            : "To share a bed with another party, both parties say yes and the organizer approves."}{" "}
          Sendoff never assigns roommates, and never by gender.
          {view.status === "booked" ? " The stay is booked, so every move needs the organizer and re-prices everyone." : ""}
        </p>
        {view.spotPrices === null ? (
          <p className="mt-2 text-sm">Lodging splits {splitModeLabel(view.splitMode).toLowerCase()}, so every room costs the same here.</p>
        ) : null}
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {committed && myBeds.length === 0 ? (
        <p className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good">
          You&apos;re in. Test payment recorded — no card charged. Now pick where your party sleeps; parties pick in the order they bought in.
        </p>
      ) : null}

      {requests.map((request) => (
        <section key={request.id} className="rounded-3xl border-2 border-accent bg-card p-4">
          <p className="font-semibold">{partyName(request.requesterUserId)} asked to share a bed with your party.</p>
          <p className="mt-1 text-sm text-muted">
            {request.counterpartOptedIn ? "You said yes. The organizer decides next." : "Nothing changes unless you say yes and the organizer approves."}
          </p>
          {!request.counterpartOptedIn ? (
            <form action={optInShareAction} className="mt-3">
              <input type="hidden" name="tripId" value={view.id} />
              <input type="hidden" name="userId" value={viewer?.userId} />
              <input type="hidden" name="requestId" value={request.id} />
              <SubmitButton variant="secondary">Yes, we&apos;re open to sharing</SubmitButton>
            </form>
          ) : null}
        </section>
      ))}

      <ul className="grid gap-3">
        {[...rooms.entries()].map(([roomName, spots]) => {
          const anyHonoree = spots.some((spot) => spot.reservedForHonoree);
          const heldFor = spots.find((spot) => spot.reservedForUserId)?.reservedForUserId ?? null;
          const heldForOther = !!heldFor && heldFor !== myParty;
          const occupants = [...new Set(spots.flatMap((spot) => holders(spot.id).map((claim) => claim.userId)))];
          const mine = occupants.includes(myParty ?? "");
          const vacant = occupants.length === 0;
          const roomPrice = view.spotPrices ? spots.reduce((sum, spot) => sum + (view.spotPrices?.[spot.id] ?? 0), 0) : null;
          const flags = spots[0];
          return (
            <li key={roomName} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-2xl">{roomName}</h3>
                  <p className="text-sm text-muted">
                    {spots.map((spot) => bedLabel(spot.bedType)).join(" + ")}
                    {flags?.privateBath ? " · private bath" : ""}
                  </p>
                </div>
                {roomPrice !== null && !anyHonoree && spots.length > 1 ? (
                  <p className="shrink-0 text-right text-sm">
                    <span className="block font-semibold">{money(roomPrice)}</span>
                    <span className="text-xs text-muted">whole room</span>
                  </p>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flags?.groundFloor ? <Badge>Ground floor</Badge> : null}
                {flags?.noStairs ? <Badge>No stairs</Badge> : null}
                {flags?.accessibleBath ? <Badge>Accessible bath</Badge> : null}
                {flags?.cribSpace ? <Badge>Crib space</Badge> : null}
                {anyHonoree ? <Badge tone="warn">Reserved for the guest of honor</Badge> : null}
                {heldFor && heldFor === myParty ? <Badge tone="good">Held for your party</Badge> : null}
                {heldForOther ? <Badge tone="warn">Reserved</Badge> : null}
                {occupants.length > 0 ? (
                  <Badge tone={mine ? "good" : "default"}>{occupants.map((id) => (id === myParty ? "Your party" : partyName(id))).join(" + ")}</Badge>
                ) : null}
              </div>

              <ul className="mt-3 grid gap-2">
                {spots.map((spot) => {
                  const here = holders(spot.id);
                  const mineHere = here.some((claim) => claim.userId === myParty);
                  const openShare = spot.sharingEnabled && here.length > 0 && here.length < (spot.capacity || 2) && !mineHere;
                  const price = view.spotPrices?.[spot.id];
                  const coSleepers = party?.travelers.filter((traveler) => traveler.coSleepSpotId === spot.id) ?? [];
                  return (
                    <li key={spot.id} className="rounded-2xl bg-chip/60 p-3">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          {bedLabel(spot.bedType)}
                          {spot.sharingEnabled ? <span className="font-normal text-muted"> · sleeps 2, shareable</span> : null}
                        </span>
                        {price != null && !spot.reservedForHonoree ? (
                          <span>
                            {money(price)}
                            {openShare ? <span className="text-xs text-muted"> per party if shared</span> : null}
                          </span>
                        ) : null}
                      </div>
                      {coSleepers.length > 0 ? (
                        <p className="mt-1 text-xs text-muted">Co-sleeping at $0: {coSleepers.map((traveler) => traveler.name.split(" ")[0]).join(", ")}</p>
                      ) : null}
                      {canAct && !spot.reservedForHonoree && !heldForOther ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {here.length === 0 || openShare ? (
                            <form action={claimSpotAction} className="grid gap-2">
                              <input type="hidden" name="tripId" value={view.id} />
                              <input type="hidden" name="userId" value={viewer?.userId} />
                              <input type="hidden" name="spotId" value={spot.id} />
                              {here.length === 0 && spot.sharingEnabled ? (
                                <label className="flex items-start gap-2 text-xs">
                                  <input className="mt-0.5" type="checkbox" name="acceptShare" value="yes" />
                                  I accept that this bed may be shared with another party.
                                </label>
                              ) : null}
                              <SubmitButton variant="secondary">{openShare ? "Take the open share slot" : "Take this bed"}</SubmitButton>
                            </form>
                          ) : null}
                          {here.length > 0 && !mineHere && !openShare && view.bedChangePolicy === "member_requests" ? (
                            <form action={requestSpotAction}>
                              <input type="hidden" name="tripId" value={view.id} />
                              <input type="hidden" name="userId" value={viewer?.userId} />
                              <input type="hidden" name="spotId" value={spot.id} />
                              <input type="hidden" name="type" value="share" />
                              <SubmitButton variant="outline">Ask to share</SubmitButton>
                            </form>
                          ) : null}
                          {mineHere && view.status !== "booked" ? (
                            <form action={releaseSpotAction}>
                              <input type="hidden" name="tripId" value={view.id} />
                              <input type="hidden" name="userId" value={viewer?.userId} />
                              <input type="hidden" name="spotId" value={spot.id} />
                              <SubmitButton variant="outline">Release</SubmitButton>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {canAct && vacant && spots.length > 1 && !anyHonoree && !heldForOther ? (
                <form action={claimRoomAction} className="mt-3">
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer?.userId} />
                  <input type="hidden" name="roomName" value={roomName} />
                  <SubmitButton>Claim this whole room</SubmitButton>
                </form>
              ) : null}
              {canAct && vacant && spots.length === 1 && heldFor === myParty ? (
                <form action={claimRoomAction} className="mt-3">
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer?.userId} />
                  <input type="hidden" name="roomName" value={roomName} />
                  <SubmitButton>Take the room held for you</SubmitButton>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canAct && party && myBeds.length > 0 && party.travelers.length > 1 ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Co-sleeping</h3>
          <p className="mt-1 text-sm text-muted">
            Someone in your party (often a child) can share a bed your party already has, at $0 extra. If that frees one of your beds, release it to
            lower your share.
          </p>
          <ul className="mt-3 grid gap-2">
            {party.travelers
              .filter((traveler) => traveler.ageBand !== "infant" && !traveler.isPayer)
              .map((traveler) => (
                <li key={traveler.id}>
                  <form action={coSleepAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={viewer?.userId} />
                    <input type="hidden" name="travelerId" value={traveler.id} />
                    <span className="min-w-24 text-sm font-semibold">{traveler.name.split(" ")[0]}</span>
                    <select className={`${fieldClass} w-auto flex-1`} name="spotId" defaultValue={traveler.coSleepSpotId ?? ""} aria-label={`Where ${traveler.name} sleeps`}>
                      <option value="">Own bed</option>
                      {myBeds
                        .filter((spot) => spot.coSleepAllowed)
                        .map((spot) => (
                          <option key={spot.id} value={spot.id}>
                            With the party in the {roomName(spot)} {bedLabel(spot.bedType).toLowerCase()}
                          </option>
                        ))}
                    </select>
                    <SubmitButton variant="outline">Save</SubmitButton>
                  </form>
                </li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Infants in a crib never need a bed.</p>
        </section>
      ) : null}
    </div>
  );
}

function roomName(spot: SpotRecord): string {
  return spot.roomName ?? "room";
}

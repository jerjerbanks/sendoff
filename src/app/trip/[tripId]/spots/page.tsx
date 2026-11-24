import Link from "next/link";
import { claimRoomAction, claimSpotAction, coSleepAction, optInShareAction, releaseSpotAction, requestSpotAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { bedLabel, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { listSpotRequests, type SpotRecord } from "@/lib/store";
import { loadTripView, type TripView } from "@/lib/view";

type Room = { name: string; spots: SpotRecord[] };

/** S14. Parties claim a whole room or a single bed, in buy-in order. Never assigned by gender. */
export default async function RoomsPage({
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
  const many = !!party && party.travelers.length > 1;
  const isCommitted = party?.status === "committed";
  const canPick =
    !!viewer && !!party && viewer.role !== "honoree" && !view.cancelled && (isCommitted || view.isOrganizer) && party.status !== "off_trip";
  const holders = (spotId: string) => view.claims.filter((claim) => claim.spotId === spotId && claim.status === "approved").map((claim) => claim.userId);
  const partyName = (id: string) => (id === myParty ? "You" : (view.parties.find((item) => item.payerUserId === id)?.name ?? "Someone"));

  const rooms: Room[] = [];
  for (const spot of [...view.spots].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))) {
    const key = spot.roomName ?? spot.id;
    const room = rooms.find((item) => item.name === key);
    if (room) room.spots.push(spot);
    else rooms.push({ name: key, spots: [spot] });
  }
  const occupants = (room: Room) => [...new Set(room.spots.flatMap((spot) => holders(spot.id)))];
  const price = (room: Room) => room.spots.reduce((sum, spot) => sum + (view.spotPrices?.[spot.id] ?? 0), 0);
  const rank = (room: Room) => {
    const who = occupants(room);
    if (who.includes(myParty ?? "")) return 0;
    if (room.spots.some((spot) => spot.reservedForHonoree) || room.spots.some((spot) => spot.reservedForUserId && spot.reservedForUserId !== myParty)) return 3;
    if (who.length === 0 || room.spots.some((spot) => openShare(view, spot, holders(spot.id), myParty))) return 1;
    return 2;
  };
  rooms.sort((a, b) => rank(a) - rank(b) || price(b) - price(a));

  const myBeds = view.spots.filter((spot) => holders(spot.id).includes(myParty ?? ""));
  const requests = myParty ? (await listSpotRequests(tripId)).filter((request) => request.status === "pending" && request.counterpartUserId === myParty) : [];

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-4xl leading-none">Rooms</h2>
        <p className="mt-2 text-sm text-muted">
          {canPick
            ? `Pick where ${many ? "your party sleeps" : "you sleep"}. Earlier commits pick first.`
            : viewer?.role === "honoree"
              ? "Your room is reserved."
              : "Commit first, then pick. Parties choose in the order they bought in."}{" "}
          {view.spotPrices ? "Nicer rooms cost more; prices update as people pick." : `Every room costs the same here (${splitModeLabel(view.splitMode).toLowerCase()}).`}
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {committed && isCommitted ? (
        <section className="rounded-3xl border-2 border-good/50 bg-good-soft p-5 text-center">
          <p className="font-serif text-4xl text-good">You&apos;re in.</p>
          <p className="mt-2 text-sm text-good">
            {view.payerCount >= view.minPayerCount
              ? `${view.payerCount} parties committed — enough to book.`
              : `Party ${view.payerCount} of the ${view.minPayerCount} needed to book.`}{" "}
            Test payment only; no card charged.
          </p>
          <p className="mt-3 text-sm text-ink">{myBeds.length === 0 ? "Now pick where you sleep." : "Your bed is saved below."}</p>
        </section>
      ) : null}

      {!canPick && viewer && viewer.role !== "honoree" && party?.status === "joined" && viewer.isPayer ? (
        <Link href={`/trip/${view.id}/pay`} className="flex h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink">
          Commit to pick a room
        </Link>
      ) : null}

      {requests.map((request) => (
        <section key={request.id} className="rounded-3xl border-2 border-accent bg-card p-5">
          <p className="font-semibold">{partyName(request.requesterUserId)} asked to share a bed with you.</p>
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
        {rooms.map((room) => (
          <RoomCard
            key={room.name}
            view={view}
            room={room}
            myParty={myParty}
            canPick={canPick}
            many={many}
            hasBed={myBeds.length > 0}
            holders={holders}
            partyName={partyName}
          />
        ))}
      </ul>

      {canPick && party && myBeds.length > 0 && many ? (
        <details className="rounded-3xl border border-line bg-card">
          <summary className="cursor-pointer px-5 py-4 font-serif text-xl">Kids sharing your bed?</summary>
          <div className="px-5 pb-5">
            <p className="text-sm text-muted">
              Someone in your party can share a bed you already have, at $0 extra. If that frees a bed, release it to lower your share. Infants in a crib
              never need a bed.
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
                      <span className="min-w-20 text-sm font-semibold">{traveler.name.split(" ")[0]}</span>
                      <select className={`${fieldClass} w-auto min-w-0 flex-1`} name="spotId" defaultValue={traveler.coSleepSpotId ?? ""} aria-label={`Where ${traveler.name} sleeps`}>
                        <option value="">Own bed</option>
                        {myBeds
                          .filter((spot) => spot.coSleepAllowed)
                          .map((spot) => (
                            <option key={spot.id} value={spot.id}>
                              In the {spot.roomName} {bedLabel(spot.bedType).toLowerCase()}
                            </option>
                          ))}
                      </select>
                      <SubmitButton variant="outline">Save</SubmitButton>
                    </form>
                  </li>
                ))}
            </ul>
          </div>
        </details>
      ) : null}

      <p className="text-center text-xs text-muted">
        {view.bedChangePolicy === "locked" ? "Beds are locked: only the organizer moves people." : "Sharing a bed with another party needs both parties' yes and the organizer's."}{" "}
        Sendoff never assigns roommates, and never by gender.
      </p>
    </div>
  );
}

function openShare(view: TripView, spot: SpotRecord, here: string[], myParty: string | null): boolean {
  return spot.sharingEnabled && here.length > 0 && here.length < (spot.capacity || 2) && !here.includes(myParty ?? "") && !spot.reservedForHonoree;
}

function RoomCard({
  view,
  room,
  myParty,
  canPick,
  many,
  hasBed,
  holders,
  partyName,
}: {
  view: TripView;
  room: Room;
  myParty: string | null;
  canPick: boolean;
  many: boolean;
  /** Taking a bed when you already hold one moves you; label it that way. */
  hasBed: boolean;
  holders: (spotId: string) => string[];
  partyName: (id: string) => string;
}) {
  const hidden = (
    <>
      <input type="hidden" name="tripId" value={view.id} />
      <input type="hidden" name="userId" value={view.viewer?.userId} />
    </>
  );
  const first = room.spots[0];
  const who = [...new Set(room.spots.flatMap((spot) => holders(spot.id)))];
  const mine = who.includes(myParty ?? "");
  const honoree = room.spots.some((spot) => spot.reservedForHonoree);
  const heldFor = room.spots.find((spot) => spot.reservedForUserId)?.reservedForUserId ?? null;
  const heldForOther = !!heldFor && heldFor !== myParty;
  const vacant = who.length === 0;
  // Joining a share slot doesn't release your current bed, so only bed-less parties are offered it.
  const share = hasBed ? undefined : room.spots.find((spot) => openShare(view, spot, holders(spot.id), myParty));
  const prices = view.spotPrices;
  const roomPrice = prices ? room.spots.reduce((sum, spot) => sum + (prices[spot.id] ?? 0), 0) : null;
  const shown = share && prices ? prices[share.id] : roomPrice;
  const features = [
    room.spots.map((spot) => bedLabel(spot.bedType)).join(" + "),
    first?.privateBath ? "private bath" : null,
    first?.groundFloor ? "ground floor" : null,
    first?.noStairs ? "no stairs" : null,
    first?.accessibleBath ? "accessible bath" : null,
    first?.cribSpace ? "room for a crib" : null,
  ].filter(Boolean);
  const status = honoree
    ? "Guest of honor"
    : heldForOther
      ? "Reserved"
      : mine
        ? "Yours"
        : share
          ? `${who.map(partyName).join(" + ")} · room for one more party`
          : vacant
            ? heldFor === myParty
              ? "Held for you"
              : "Open"
            : who.map(partyName).join(" + ");
  const muted = honoree || heldForOther || (!vacant && !mine && !share);

  return (
    <li className={`rounded-3xl border p-4 ${mine ? "border-2 border-accent bg-card" : "border-line bg-card"} ${muted ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-2xl leading-tight">{room.name}</h3>
          <p className="text-sm text-muted">{features.join(" · ")}</p>
        </div>
        {shown != null && !honoree ? (
          <p className="shrink-0 text-right">
            <span className="block font-serif text-2xl">{money(shown).replace(/\.\d\d$/, "")}</span>
            <span className="text-xs text-muted">{share ? "if shared" : room.spots.length > 1 ? "whole room" : "this bed"}</span>
          </p>
        ) : null}
      </div>
      <p className={`mt-2 text-sm font-semibold ${mine ? "text-accent" : vacant && !honoree && !heldForOther ? "text-good" : "text-muted"}`}>{status}</p>

      {canPick && !honoree && !heldForOther ? (
        <div className="mt-3 grid gap-2">
          {vacant && room.spots.length > 1 ? (
            <>
              <form action={claimRoomAction}>
                {hidden}
                <input type="hidden" name="roomName" value={room.name} />
                <SubmitButton variant="secondary">{hasBed ? "Move to this room" : "Take the whole room"}</SubmitButton>
              </form>
              {!many ? (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-muted">Or just one bed</summary>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {room.spots.map((spot) => (
                      <form key={spot.id} action={claimSpotAction}>
                        {hidden}
                        <input type="hidden" name="spotId" value={spot.id} />
                        <SubmitButton variant="outline">
                          {bedLabel(spot.bedType)} · {money(prices?.[spot.id] ?? 0).replace(/\.\d\d$/, "")}
                        </SubmitButton>
                      </form>
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : null}
          {vacant && room.spots.length === 1 && first ? (
            heldFor === myParty ? (
              <form action={claimRoomAction}>
                {hidden}
                <input type="hidden" name="roomName" value={room.name} />
                <SubmitButton variant="secondary">Take the room held for you</SubmitButton>
              </form>
            ) : (
              <form action={claimSpotAction} className="grid gap-2">
                {hidden}
                <input type="hidden" name="spotId" value={first.id} />
                {first.sharingEnabled ? (
                  <label className="flex items-start gap-2 text-xs text-muted">
                    <input className="mt-0.5" type="checkbox" name="acceptShare" value="yes" />
                    I&apos;m OK if another party later shares this bed.
                  </label>
                ) : null}
                <SubmitButton variant="secondary">{hasBed ? "Move here" : "Take this bed"}</SubmitButton>
              </form>
            )
          ) : null}
          {share ? (
            <form action={claimSpotAction}>
              {hidden}
              <input type="hidden" name="spotId" value={share.id} />
              <SubmitButton variant="secondary">Share it with {who.map(partyName).join(" + ")}</SubmitButton>
            </form>
          ) : null}
          {!vacant && !mine && !share && view.bedChangePolicy === "member_requests" ? (
            <form action={requestSpotAction}>
              {hidden}
              <input type="hidden" name="spotId" value={first?.id} />
              <input type="hidden" name="type" value="share" />
              <button type="submit" className="text-sm font-semibold text-muted underline">
                Ask to share
              </button>
            </form>
          ) : null}
          {mine && view.status !== "booked" ? (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-muted">Change</summary>
              <ul className="mt-2 grid gap-2">
                {room.spots
                  .filter((spot) => holders(spot.id).includes(myParty ?? ""))
                  .map((spot) => (
                    <li key={spot.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {bedLabel(spot.bedType)}
                        {prices?.[spot.id] != null ? <span className="text-muted"> · {money(prices[spot.id] ?? 0)}</span> : null}
                      </span>
                      <form action={releaseSpotAction}>
                        {hidden}
                        <input type="hidden" name="spotId" value={spot.id} />
                        <SubmitButton variant="outline">Release</SubmitButton>
                      </form>
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

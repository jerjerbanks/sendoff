import Link from "next/link";
import { claimRoomAction, claimSpotAction, coSleepAction, optInShareAction, releaseSpotAction, requestSpotAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { FloorPlan, type BedState, type PlanRoom } from "@/components/floor-plan";
import { HeadcountMeter, Toast } from "@/components/motion";
import { meterCells } from "@/lib/meter";
import { fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { bedLabel, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { listSpotRequests, type SpotRecord } from "@/lib/store";
import { loadTripView, type TripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";

type Room = { name: string; spots: SpotRecord[]; code: string };

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
    else rooms.push({ name: key, spots: [spot], code: String(rooms.length + 1).padStart(2, "0") });
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
  const pending = myParty ? (await listSpotRequests(tripId)).filter((request) => request.status === "pending") : [];
  const requests = pending.filter((request) => request.counterpartUserId === myParty);
  const asked = new Set(pending.filter((request) => request.requesterUserId === myParty).map((request) => request.toSpotId));
  const initials = (id: string) => {
    const name = view.parties.find((item) => item.payerUserId === id)?.name ?? "";
    return name.replace(/^The\s+/i, "").charAt(0).toUpperCase();
  };
  const plan: PlanRoom[] = [...rooms]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((room) => ({
      code: room.code,
      name: room.name,
      anchor: `room-${room.code}`,
      groundFloor: room.spots.some((spot) => spot.groundFloor),
      stepFree: room.spots.some((spot) => spot.noStairs),
      beds: room.spots.map((spot) => {
        const who = holders(spot.id);
        const state: BedState = who.includes(myParty ?? "")
          ? "mine"
          : asked.has(spot.id)
            ? "requested"
            : who.length
              ? "taken"
              : spot.reservedForHonoree || (spot.reservedForUserId && spot.reservedForUserId !== myParty)
                ? "held"
                : "open";
        return { id: spot.id, bedType: spot.bedType ?? "", state, label: who.map(initials).join("+") };
      }),
    }));

  const whole = (cents: number) => money(cents).replace(/\.\d\d$/, "");

  return (
    <div className="grid grid-cols-1 gap-7 [&>*]:min-w-0">
      {committed && isCommitted ? (
        <>
          <Toast
            delayMs={120 + 70 + 560}
            title="You're in."
            body={`${whole(view.buyInAmountCents)} test buy-in recorded. ${myBeds.length === 0 ? "Now pick where you sleep." : "Your bed is saved."}`}
          />
          <HeadcountMeter
            framed
            commit
            cells={meterCells(view, { youPending: true })}
            need={view.minPayerCount}
            unit="parties"
            sub={view.payerCount >= view.minPayerCount ? "Enough to book" : `${view.minPayerCount} needed to book`}
          />
        </>
      ) : null}

      <section>
        {party ? (
          <p className="ft-lbl">
            {party.name} · {party.travelers.length} {party.travelers.length === 1 ? "person" : "people"}
          </p>
        ) : null}
        <h1 className="ft-display mt-3">
          Choose your
          <br />
          <i>{many ? "beds." : "bed."}</i>
        </h1>
        <p className="ft-lead mt-4">
          {canPick
            ? `Earlier commits pick first.`
            : viewer?.role === "honoree"
              ? "Your room is reserved."
              : "Commit first, then pick. Parties choose in the order they bought in."}{" "}
          {view.spotPrices ? "Prices follow the bed: a private bath costs more, a couch less." : `Every room costs the same here (${splitModeLabel(view.splitMode).toLowerCase()}).`}
        </p>
      </section>
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}

      {plan.length > 0 ? (
        <section>
          <div className="mb-3 flex justify-end">
            <span className="ft-live">
              <span className="ft-dot" aria-hidden />
              Live
            </span>
          </div>
          <FloorPlan rooms={plan} />
        </section>
      ) : null}

      {!canPick && viewer && viewer.role !== "honoree" && party?.status === "joined" && viewer.isPayer ? (
        <Link href={`/trip/${view.id}/pay`} className="ft-btn">
          <span>Commit to pick a room</span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      {requests.map((request) => (
        <section key={request.id} className="ft-panel ring-1 ring-clay p-5">
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

      <ul className="ft-rule">
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
        <details className="ft-panel">
          <summary className="ft-summary px-4 py-2 text-[17px] font-semibold">Kids sharing your bed?</summary>
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
        {APP_NAME} never assigns roommates, and never by gender.
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
    <li id={`room-${room.code}`} className={`scroll-mt-20 border-b border-line py-4 ${muted ? "text-ink-2" : ""}`}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-baseline gap-x-3">
        <span className={`ft-mono text-[15px] ${mine ? "text-clay-ink" : "text-muted"}`}>{room.code}</span>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[18px] font-semibold leading-snug">
            <span className={`inline-block size-3 flex-none rounded-[3px] border ${mine ? "border-clay bg-clay-tint" : muted ? "border-line-strong bg-chip" : "border-ink-2 bg-card"}`} aria-hidden />
            {room.name}
          </h3>
          <p className="ft-meta">{features.join(" · ")}</p>
          <p className={`mt-1 font-mono text-[14px] uppercase tracking-[0.06em] ${mine ? "text-clay-ink" : vacant && !honoree && !heldForOther ? "text-pine" : "text-muted"}`}>{status}</p>
        </div>
        {shown != null && !honoree ? (
          <p className="text-right">
            <span className={`ft-mono block text-[18px] font-semibold ${mine ? "text-clay-ink" : ""}`}>{money(shown).replace(/\.\d\d$/, "")}</span>
            <span className="ft-meta">{share ? "if shared" : room.spots.length > 1 ? "room" : "bed"}</span>
          </p>
        ) : null}
      </div>
      <div className="pl-[52px]">
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
                  <summary className="ft-summary text-[15px] font-medium text-ink-2">Or just one bed</summary>
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
              <summary className="ft-summary text-[15px] font-medium text-ink-2">Change</summary>
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
      </div>
    </li>
  );
}

import { claimSpotAction, releaseSpotAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export default async function SpotPickerPage({
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
  const mine = view.claims.find((claim) => claim.userId === view.viewer?.userId && claim.status !== "denied");
  void mine;
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Pick a bed</h2>
        <p className="mt-1 text-sm text-muted">
          With member requests, asking for a bed files a pending claim. The organizer approves it. Locked mode lets only the organizer assign beds.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {mine ? <p className="text-sm font-semibold">Your claim is {mine.status}.</p> : null}
      <ul className="grid gap-3">
        {view.spots.map((spot) => {
          const holders = view.claims.filter((claim) => claim.spotId === spot.id && claim.status !== "denied");
          const name = holders.map((claim) => view.members.find((member) => member.userId === claim.userId)?.name ?? "Someone").join(", ");
          return (
            <li key={spot.id} className="rounded-3xl border border-line bg-card p-4">
              <p className="font-semibold">{spot.roomName ?? "Bed"} · {spot.bedType} · weight {spot.weight}</p>
              <p className="text-sm text-muted">
                {spot.reservedForHonoree ? "Reserved for the guest of honor" : name || "Open"}{spot.sharingEnabled ? " · can share" : ""}
              </p>
              {view.viewer && view.status !== "booked" && !spot.reservedForHonoree ? (
                <div className="mt-3 flex gap-2">
                  <form action={claimSpotAction}>
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={view.viewer.userId} />
                    <input type="hidden" name="spotId" value={spot.id} />
                    <SubmitButton variant="secondary">{holders.some((claim) => claim.userId === view.viewer?.userId) ? "Update claim" : "Request this bed"}</SubmitButton>
                  </form>
                  {holders.some((claim) => claim.userId === view.viewer?.userId) ? (
                    <form action={releaseSpotAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="userId" value={view.viewer.userId} />
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
    </div>
  );
}

import { addSpotAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

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
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Sleeping spots</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          One lodging bill, split by bed weight. The guest of honor&apos;s room is not in the split. An empty bed costs nothing. Defaults: 1.5 king suite, 1.25 queen, 1.0 full, 0.8 bunk, 0.6 sofa bed, 0.5 couch.
        </p>
      </div>
      {view.spots.filter((spot) => !spot.reservedForHonoree).reduce((sum, spot) => sum + (spot.sharingEnabled ? spot.capacity : 1), 0) < view.maxHeadcount ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">Payer beds cannot cover the max headcount of {view.maxHeadcount}. Add a spot or turn on sharing.</p>
      ) : null}
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <ul className="grid gap-2">
        {view.spots.map((spot) => (
          <li key={spot.id} className="rounded-2xl border border-line bg-card px-3 py-3 text-sm">
            <p className="font-semibold">{spot.roomName ?? "Room"} · {spot.bedType} · weight {spot.weight}</p>
            <p className="text-muted">{spot.reservedForHonoree ? "Reserved for the guest of honor" : spot.sharingEnabled ? "Sharable" : "One person"}</p>
          </li>
        ))}
      </ul>
      {view.isOrganizer && view.status !== "booked" ? (
        <form action={addSpotAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Add a spot</h3>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={view.viewer?.userId} />
          <Input name="roomName" placeholder="Room name" required />
          <Input name="bedType" placeholder="Bed type" defaultValue="Queen" />
          <label className="text-sm font-medium">
            Weight
            <select className={`${fieldClass} mt-1.5`} name="weight" defaultValue="1">
              <option value="1.5">1.5 private bath and room</option>
              <option value="1.25">1.25 private room</option>
              <option value="1">1.0 standard</option>
              <option value="0.8">0.8 bunk</option>
              <option value="0.6">0.6 sofa bed</option>
              <option value="0.5">0.5 couch or air mattress</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="privateBath" value="yes" /> Private bath</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="privateRoom" value="yes" /> Private room</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reserved" value="yes" /> Reserve for the guest of honor</label>
          <SubmitButton>Add spot</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

import { getViewerId } from "@/lib/session";
import { listEvents } from "@/lib/store";
import { loadMemberView } from "@/lib/view";
import { outOfPocketAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";

export default async function MetricsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const view = await loadMemberView(tripId, await getViewerId());
  if (!view) return null;
  const events = await listEvents(tripId);
  const committed = view.payerCount >= view.minHeadcount;
  const firstJoin = events.find((event) => event.kind === "joined")?.at ?? null;
  const ready = events.find((event) => event.kind === "booking_ready")?.at ?? null;
  const days = firstJoin && ready ? Math.max(0, Math.round((new Date(ready).getTime() - new Date(firstJoin).getTime()) / 86_400_000)) : null;
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="ft-h1">Validation</h2>
        <p className="mt-1 text-sm text-muted">
          Friends who already planned to go will make these rates look high. Treat an early number as a ceiling, not a forecast.
        </p>
      </div>
      <ul className="grid gap-2 text-sm">
        <li>Commit rate on this trip: {committed ? "reached the minimum" : "not at the minimum yet"}{view.status === "booked" ? ", and the stay is booked" : ""}.</li>
        <li>Days from the first join to the minimum: {days === null ? "not recorded yet" : days}.</li>
        <li>Events logged: {events.length}.</li>
      </ul>
      {view.isOrganizer ? (
        <form action={outOfPocketAction} className="grid gap-3 ft-panel p-4">
          <h3 className="ft-h2">What did you front?</h3>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={view.viewer?.userId} />
          <label className="text-sm">Last similar trip
            <Input className="mt-1" name="previous" type="number" min={0} placeholder="Dollars you paid yourself" />
          </label>
          <label className="text-sm">This trip
            <Input className="mt-1" name="current" type="number" min={0} placeholder="Dollars you paid yourself" />
          </label>
          <SubmitButton variant="secondary">Save the comparison</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

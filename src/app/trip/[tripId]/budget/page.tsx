import Link from "next/link";
import { saveBudgetAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { getViewerId } from "@/lib/session";
import { ownBudget } from "@/lib/store";
import { loadTripView } from "@/lib/view";

export default async function BudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const { error } = await searchParams;
  const viewerId = await getViewerId();
  const view = await loadTripView(tripId, viewerId);
  if (!view || !view.viewer) return null;
  const own = await ownBudget(tripId, view.viewer.userId);
  const locked = view.viewer.status === "committed" || view.viewer.status === "off_trip";
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Your private budget</h2>
        <p className="mt-1 text-sm leading-relaxed">
          Only you see this number. The organizer and the group will never see your budget, your notes, or whether a destination is over for you.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {!own ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">Even a rough number helps the group pick a destination you can actually do. You can skip it.</p>
      ) : null}
      <form action={saveBudgetAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <input type="hidden" name="tripId" value={view.id} />
        <input type="hidden" name="userId" value={view.viewer.userId} />
        <label className="text-sm font-medium">
          All-in, including flights
          <Input className="mt-1.5" name="maxAllIn" type="number" min={1} step="1" defaultValue={own ? own.maxAllIn / 100 : ""} disabled={locked} required />
        </label>
        <label className="text-sm font-medium">
          A private note
          <Input className="mt-1.5" name="flexNote" defaultValue={own?.flexNote ?? ""} disabled={locked} />
        </label>
        <fieldset className="grid gap-2 text-sm" disabled={locked}>
          <legend className="font-medium">Must-haves</legend>
          {[["golf", "Golf"], ["own_room", "My own room"], ["nightlife", "Nightlife"], ["other", "Something else"]].map(([id, label]) => (
            <label key={id} className="flex items-center gap-2">
              <input type="checkbox" name={id} value="yes" defaultChecked={(own?.mustHaves ?? "").split(",").includes(id)} />
              {label}
            </label>
          ))}
        </fieldset>
        {locked ? <p className="text-sm text-muted">This locked when you bought in. You can still see it.</p> : <SubmitButton>Save budget</SubmitButton>}
      </form>
      <Link href={`/trip/${view.id}/vote`} className="text-sm font-semibold text-accent">Continue to the polls</Link>
    </div>
  );
}

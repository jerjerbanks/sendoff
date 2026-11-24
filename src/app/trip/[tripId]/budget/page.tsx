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
  searchParams: Promise<{ error?: string; welcome?: string }>;
}) {
  const { tripId } = await params;
  const { error, welcome } = await searchParams;
  const viewerId = await getViewerId();
  const view = await loadTripView(tripId, viewerId);
  if (!view || !view.viewer) return null;
  if (!view.viewer.isPayer) {
    return (
      <div className="grid gap-3">
        <h2 className="font-serif text-3xl">Private budget</h2>
        <p className="text-sm leading-relaxed">
          Your party has one budget, and only its payer sees it: {view.viewerParty?.payerName ?? "your payer"}. Nobody else on the trip
          can see it either, the organizer included.
        </p>
        <Link href={`/trip/${view.id}/vote`} className="text-sm font-semibold text-accent">Go to the polls</Link>
      </div>
    );
  }
  const own = await ownBudget(tripId, view.viewer.userId);
  const size = view.viewerParty?.travelers.length ?? 1;
  const locked = view.viewer.status === "committed" || view.viewer.status === "off_trip";
  return (
    <div className="grid gap-4">
      <div>
        {welcome ? <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 2 of 2 · Private</p> : null}
        <h2 className="font-serif text-3xl">{size > 1 ? "Your party's private budget" : "Your private budget"}</h2>
        <p className="mt-1 text-sm leading-relaxed">
          Only you see this number. The organizer and the group will never see your budget or whether a destination is over for your party.
          Polls show only an anonymous &ldquo;fits the group&rdquo; signal.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {!own ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">Even a rough number helps the group pick a destination you can actually do. You can skip it.</p>
      ) : null}
      <form action={saveBudgetAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <input type="hidden" name="tripId" value={view.id} />
        <input type="hidden" name="userId" value={view.viewer.userId} />
        {welcome ? <input type="hidden" name="welcome" value="1" /> : null}
        <label className="text-sm font-medium">
          {size > 1 ? `All-in for all ${size} of you, including travel` : "All-in, including flights"}
          <Input className="mt-1.5" name="maxAllIn" type="number" min={1} step="1" defaultValue={own ? own.maxAllIn / 100 : ""} disabled={locked} required />
        </label>
        <label className="text-sm font-medium">
          A private note
          <Input className="mt-1.5" name="flexNote" defaultValue={own?.flexNote ?? ""} disabled={locked} />
        </label>
        <fieldset className="grid gap-2 text-sm" disabled={locked}>
          <legend className="font-medium">Must-haves</legend>
          {[
            ["golf", "Golf"],
            ["own_room", "Our own room"],
            ["nightlife", "Nightlife"],
            ["ground_floor", "Ground floor"],
            ["crib_space", "Room for a crib"],
            ["other", "Something else"],
          ].map(([id, label]) => (
            <label key={id} className="flex items-center gap-2">
              <input type="checkbox" name={id} value="yes" defaultChecked={(own?.mustHaves ?? "").split(",").includes(id)} />
              {label}
            </label>
          ))}
        </fieldset>
        {locked ? (
          <p className="text-sm text-muted">This locked when your party bought in. You can still see it.</p>
        ) : (
          <>
            <SubmitButton>Save budget</SubmitButton>
            <p className="text-xs text-muted">You can edit it until your party buys in. It never blocks a vote or a buy-in.</p>
          </>
        )}
      </form>
      <Link href={`/trip/${view.id}/vote`} className="text-sm font-semibold text-accent">{welcome ? "Skip for now and go vote" : "Continue to the polls"}</Link>
    </div>
  );
}

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
        {welcome ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Step 2 of 2</p> : null}
        <h2 className="font-serif text-4xl leading-none">What can {size > 1 ? "your party" : "you"} spend?</h2>
        <p className="mt-3 rounded-2xl bg-chip px-4 py-3 text-sm leading-relaxed">
          <span className="font-semibold">Private.</span> Only you see this number. The organizer and the group will never see your budget or
          whether a destination is over for your party.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <form action={saveBudgetAction} className="grid gap-4">
        <input type="hidden" name="tripId" value={view.id} />
        <input type="hidden" name="userId" value={view.viewer.userId} />
        {welcome ? <input type="hidden" name="welcome" value="1" /> : null}
        <label className="block">
          <span className="text-sm text-muted">{size > 1 ? `All-in for all ${size} of you, travel included` : "All-in, flights included"}</span>
          <span className="mt-2 flex items-center gap-2 rounded-3xl border border-line bg-card px-5">
            <span className="font-serif text-4xl text-muted">$</span>
            <input
              className="h-20 w-full min-w-0 bg-transparent font-serif text-5xl text-ink outline-none placeholder:text-line"
              name="maxAllIn"
              type="number"
              inputMode="numeric"
              min={1}
              step="1"
              placeholder="1500"
              defaultValue={own ? own.maxAllIn / 100 : ""}
              disabled={locked}
              required
              aria-label="All-in budget in dollars"
            />
          </span>
        </label>
        <p className="text-sm text-muted">
          The polls then tag each option &ldquo;fits everyone&rdquo;, &ldquo;fits most&rdquo;, or &ldquo;over budget for the group&rdquo; — never naming
          anyone. Only you see whether you&apos;re over.
        </p>
        <details className="rounded-2xl border border-line">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">Anything you need? (optional)</summary>
          <div className="grid gap-3 px-4 pb-4">
            <fieldset className="flex flex-wrap gap-2 text-sm" disabled={locked}>
              <legend className="sr-only">Must-haves</legend>
              {[
                ["golf", "Golf"],
                ["own_room", "Our own room"],
                ["nightlife", "Nightlife"],
                ["ground_floor", "Ground floor"],
                ["crib_space", "Room for a crib"],
                ["other", "Something else"],
              ].map(([id, label]) => (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
                >
                  <input className="sr-only" type="checkbox" name={id} value="yes" defaultChecked={(own?.mustHaves ?? "").split(",").includes(id)} />
                  {label}
                </label>
              ))}
            </fieldset>
            <Input name="flexNote" defaultValue={own?.flexNote ?? ""} disabled={locked} placeholder="A private note to yourself" aria-label="A private note" />
          </div>
        </details>
        {locked ? (
          <p className="text-sm text-muted">This locked when your party bought in. You can still see it.</p>
        ) : (
          <>
            <SubmitButton>Save budget</SubmitButton>
            <p className="text-center text-xs text-muted">Edit it anytime until you buy in. It never blocks a vote or a buy-in.</p>
          </>
        )}
      </form>
      <Link href={`/trip/${view.id}/vote`} className="text-sm font-semibold text-accent">{welcome ? "Skip — I'd rather not say" : "Continue to the polls"}</Link>
    </div>
  );
}

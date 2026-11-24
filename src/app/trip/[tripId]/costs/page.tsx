import { addCostAction, deleteCostAction, optAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { categoryLabel, splitLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

const categories = ["lodging", "flight", "activity", "golf", "food", "other"];

export default async function CostsPage({
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
  const viewer = view.viewer;
  const base = view.sharedCents - view.forfeitedPotCents;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">The sheet</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Prices are typed in. Nothing checks flights, houses, or tee sheets. Shared costs split across committed payers.
          Optional costs split only across people who opted in and are still paying. Individual costs stay with one person.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      <section className="rounded-3xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Base pool</p>
        <p className="font-serif text-4xl">{money(Math.max(0, base))}</p>
        <p className="mt-1 text-sm text-muted">
          {money(view.sharedCents)} of shared costs
          {view.forfeitedPotCents > 0 ? ` minus ${money(view.forfeitedPotCents)} forfeited` : ""}. Rounded up per payer. The spare change stays in the pot.
        </p>
        {view.roundingCents > 0 ? (
          <p className="mt-2 rounded-xl bg-chip px-3 py-2 text-sm">
            Rounding leaves {money(view.roundingCents)} in the trip pot.
          </p>
        ) : null}
      </section>

      <div className="grid gap-3">
        {view.costs.map((cost) => (
          <article key={cost.id} className="rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{cost.label}</h3>
                <p className="text-sm text-muted">
                  {categoryLabel(cost.category)} · {splitLabel(cost.splitType)}
                  {cost.memberName ? ` · ${cost.memberName}` : ""}
                </p>
              </div>
              <p className="font-serif text-2xl">{money(cost.amountCents)}</p>
            </div>
            {cost.splitType === "optional" ? (
              <div className="mt-3">
                <p className="text-sm">
                  {cost.participantNames.length > 0 ? cost.participantNames.join(", ") : "Nobody has opted in."}
                </p>
                {view.buyInOpen && viewer && viewer.role !== "honoree" && viewer.status !== "off_trip" ? (
                  <form action={optAction} className="mt-2">
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={viewer.userId} />
                    <input type="hidden" name="costId" value={cost.id} />
                    <SubmitButton variant={cost.optedIn ? "outline" : "default"}>
                      {cost.optedIn ? "Opt out" : "Count me in"}
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-muted">Opt-in closes when buy-in closes.</p>
                )}
              </div>
            ) : null}
            {(view.isOrganizer || (cost.splitType === "individual" && cost.memberId === viewer?.userId)) && !view.cancelled ? (
              <form action={deleteCostAction} className="mt-3">
                <input type="hidden" name="tripId" value={view.id} />
                <input type="hidden" name="userId" value={viewer?.userId} />
                <input type="hidden" name="costId" value={cost.id} />
                <SubmitButton variant="outline">Remove</SubmitButton>
              </form>
            ) : null}
          </article>
        ))}
      </div>

      {viewer && viewer.status !== "off_trip" && !view.cancelled ? (
        <form action={addCostAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">{view.isOrganizer ? "Add a cost" : "Add something only you pay"}</h3>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={viewer.userId} />
          {!view.isOrganizer ? <input type="hidden" name="splitType" value="individual" /> : null}
          {!view.isOrganizer ? <input type="hidden" name="memberId" value={viewer.userId} /> : null}
          <label className="text-sm font-medium">
            What
            <Input className="mt-1.5" name="label" placeholder="Flight home" required />
          </label>
          <label className="text-sm font-medium">
            Amount
            <Input className="mt-1.5" name="amount" inputMode="decimal" placeholder="280" required />
          </label>
          <label className="text-sm font-medium">
            Category
            <select className={`${fieldClass} mt-1.5`} name="category" defaultValue="flight">
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          {view.isOrganizer ? (
            <>
              <label className="text-sm font-medium">
                How it splits
                <select className={`${fieldClass} mt-1.5`} name="splitType" defaultValue="shared">
                  <option value="shared">Shared — everyone who commits</option>
                  <option value="optional">Optional — only people who opt in</option>
                  <option value="individual">Individual — one person</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                If it&apos;s individual, who pays
                <select className={`${fieldClass} mt-1.5`} name="memberId" defaultValue={viewer.userId}>
                  {view.members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <SubmitButton>Add to the sheet</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

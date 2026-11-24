import { addCostAction, deleteCostAction, travelerOptAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandLabel, categoryLabel, splitLabel, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

const categories = ["lodging", "flights", "activities", "tee_times", "other"];

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
  const party = view.viewerParty;
  const bill = party?.bill?.payer ? party.bill : null;
  const canOpt = !!viewer && viewer.isPayer && viewer.role !== "honoree" && viewer.status !== "off_trip" && view.buyInOpen;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">The sheet</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Prices are typed in. Nothing checks flights, houses, or tee sheets. Lodging splits {splitModeLabel(view.splitMode).toLowerCase()}.
          Other shared costs split by person, with children at {view.ageWeights.child} and infants at {view.ageWeights.infant} of an adult.
          Optional costs split only across the people opted in. Individual costs stay with one party.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {bill ? (
        <section className="rounded-3xl border-2 border-accent bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {party && party.travelers.length > 1 ? `The ${party.name} party's breakdown` : "Your breakdown"}
          </p>
          <p className="font-serif text-4xl">{money(bill.totalCents)}</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">Lodging, {party?.rooms.length ? party.rooms.join(", ") : "your beds"}</dt>
            <dd>{money(bill.lodgingCents)}</dd>
            <dt className="text-muted">Shared per-head ({party?.ageWeight ?? 1} {party?.ageWeight === 1 ? "share" : "shares"})</dt>
            <dd>{money(bill.evenCents)}</dd>
            {bill.optionalCents + bill.ticketCents > 0 ? (
              <>
                <dt className="text-muted">Optional, the people you opted in</dt>
                <dd>{money(bill.optionalCents + bill.ticketCents)}</dd>
              </>
            ) : null}
            {bill.individualCents > 0 ? (
              <>
                <dt className="text-muted">Just yours (flights and the like)</dt>
                <dd>{money(bill.individualCents)}</dd>
              </>
            ) : null}
          </dl>
          {view.buyInAmountCents > 0 ? (
            <p className="mt-3 text-sm">The {money(view.buyInAmountCents)} buy-in is the first payment of this total, not a fee on top.</p>
          ) : null}
          {view.honoreeExcluded ? <p className="mt-1 text-sm text-muted">The group covers the guest of honor&apos;s share.</p> : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shared pool</p>
        <p className="font-serif text-4xl">{money(Math.max(0, base))}</p>
        <p className="mt-1 text-sm text-muted">
          {money(view.sharedCents)} of shared costs
          {view.forfeitedPotCents > 0 ? ` minus ${money(view.forfeitedPotCents)} forfeited` : ""}, besides lodging. Each party&apos;s shared total rounds up to the next dollar. The spare change stays in the pot.
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
            {cost.agePrices ? (
              <p className="mt-1 text-xs text-muted">
                {(["adult", "teen", "child", "infant"] as const)
                  .filter((band) => cost.agePrices?.[band] != null)
                  .map((band) => `${ageBandLabel(band)} ${money(cost.agePrices?.[band] ?? 0)}`)
                  .join(" · ")}
              </p>
            ) : null}
            {cost.splitType === "optional" ? (
              <div className="mt-3">
                <p className="text-sm">
                  {cost.participantNames.length > 0 ? cost.participantNames.map((name) => name.split(" ")[0]).join(", ") : "Nobody has opted in."}
                </p>
                {canOpt && party ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {party.travelers
                      .filter((traveler) => !traveler.isHonoree)
                      .map((traveler) => {
                        const inIt = cost.optInTravelerIds.includes(traveler.id);
                        return (
                          <form key={traveler.id} action={travelerOptAction}>
                            <input type="hidden" name="tripId" value={view.id} />
                            <input type="hidden" name="userId" value={viewer?.userId} />
                            <input type="hidden" name="costId" value={cost.id} />
                            <input type="hidden" name="travelerId" value={traveler.id} />
                            <button
                              type="submit"
                              aria-pressed={inIt}
                              className={`min-h-11 rounded-full px-3 text-sm font-semibold ${inIt ? "bg-accent text-accent-ink" : "border border-line bg-card"}`}
                            >
                              {inIt ? "✓ " : "+ "}
                              {party.travelers.length > 1 ? traveler.name.split(" ")[0] : "Count me in"}
                            </button>
                          </form>
                        );
                      })}
                  </div>
                ) : viewer && !viewer.isPayer && viewer.role !== "honoree" ? (
                  <p className="mt-2 text-xs text-muted">Your party&apos;s payer opts people in.</p>
                ) : (
                  <p className="mt-2 text-xs text-muted">Opt-ins close when buy-in closes.</p>
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

      {viewer && viewer.isPayer && viewer.status !== "off_trip" && !view.cancelled ? (
        <form action={addCostAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">{view.isOrganizer ? "Add a cost" : "Add something only your party pays"}</h3>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={viewer.userId} />
          {!view.isOrganizer ? <input type="hidden" name="splitType" value="individual" /> : null}
          {!view.isOrganizer ? <input type="hidden" name="memberId" value={viewer.partyUserId} /> : null}
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
            <select className={`${fieldClass} mt-1.5`} name="category" defaultValue={view.isOrganizer ? "activities" : "flights"}>
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
                  <option value="shared">Shared — every party that commits</option>
                  <option value="optional">Optional — only people who opt in</option>
                  <option value="individual">Individual — one party</option>
                </select>
              </label>
              <label className="text-sm font-medium">
                If it&apos;s individual, which party pays
                <select className={`${fieldClass} mt-1.5`} name="memberId" defaultValue={viewer.partyUserId}>
                  {view.parties.map((item) => (
                    <option key={item.payerUserId} value={item.payerUserId}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset className="grid gap-2 text-sm">
                <legend className="font-medium">Age prices (optional, e.g. a kid ticket)</legend>
                <p className="text-xs text-muted">If you set any, they replace the amount: each person opted in pays their age price.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["adult", "teen", "child", "infant"] as const).map((band) => (
                    <label key={band} className="text-xs text-muted">
                      {ageBandLabel(band)}
                      <Input className="mt-1" name={`price${band[0]?.toUpperCase()}${band.slice(1)}`} inputMode="decimal" placeholder="—" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}
          <SubmitButton>Add to the sheet</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

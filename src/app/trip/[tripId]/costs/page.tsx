import { addCostAction, deleteCostAction, travelerOptAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandLabel, categoryLabel, splitModeLabel } from "@/lib/labels";
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
  const party = view.viewerParty;
  const bill = party?.bill?.payer ? party.bill : null;
  const canOpt = !!viewer && viewer.isPayer && viewer.role !== "honoree" && viewer.status !== "off_trip" && view.buyInOpen;

  const whole = (cents: number) => money(cents).replace(/\.00$/, "");
  const optional = view.costs.filter((cost) => cost.splitType === "optional");
  const fixed = view.costs.filter((cost) => cost.splitType !== "optional");
  const many = !!party && party.travelers.length > 1;
  const splitWords = (cost: (typeof view.costs)[number]) =>
    cost.category === "lodging" && cost.splitType === "shared"
      ? `split ${splitModeLabel(view.splitMode).toLowerCase()}`
      : cost.splitType === "shared"
        ? "split per person"
        : cost.splitType === "individual"
          ? `${cost.memberName?.split(" ")[0] ?? "one party"} only`
          : `${cost.optInTravelerIds.length} going`;

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-4xl leading-none">Costs</h2>
        <p className="mt-2 text-sm text-muted">What the trip costs, and {many ? "your party's" : "your"} share of it.</p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {bill ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{many ? `The ${party?.name} party's share` : "Your share"}</p>
          <p className="mt-1 font-serif text-5xl leading-none">{whole(bill.totalCents)}</p>
          <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">Lodging{party?.rooms.length ? ` · ${party.rooms.join(", ")}` : ""}</dt>
            <dd>{money(bill.lodgingCents)}</dd>
            <dt className="text-muted">Food and shared activities{many ? ` · ${party?.ageWeight} shares` : ""}</dt>
            <dd>{money(bill.evenCents)}</dd>
            {bill.optionalCents + bill.ticketCents > 0 ? (
              <>
                <dt className="text-muted">Extras you&apos;re in for</dt>
                <dd>{money(bill.optionalCents + bill.ticketCents)}</dd>
              </>
            ) : null}
            {bill.individualCents > 0 ? (
              <>
                <dt className="text-muted">Just {many ? "your party" : "you"} (flights)</dt>
                <dd>{money(bill.individualCents)}</dd>
              </>
            ) : null}
          </dl>
          {view.buyInAmountCents > 0 ? <p className="mt-4 text-sm text-muted">The {whole(view.buyInAmountCents)} buy-in is your first payment toward this.</p> : null}
          {view.honoreeExcluded ? <p className="mt-1 text-sm text-muted">The group covers the guest of honor.</p> : null}
        </section>
      ) : null}

      {optional.length > 0 ? (
        <section>
          <h3 className="font-serif text-2xl">Extras</h3>
          <p className="mt-1 text-sm text-muted">
            {canOpt ? `Only the people you add pay. ${many ? "Tap each person who's in." : ""}` : "Only the people who opted in pay."}
          </p>
          <ul className="mt-3 grid gap-2">
            {optional.map((cost) => {
              const prices = cost.agePrices;
              const priceLine = prices
                ? (["adult", "teen", "child", "infant"] as const)
                    .filter((band) => prices[band] != null)
                    .map((band) => `${ageBandLabel(band)} ${whole(prices[band] ?? 0)}`)
                    .join(" · ")
                : `${whole(cost.amountCents)} split among who's in`;
              return (
                <li key={cost.id} className="rounded-3xl border border-line bg-card p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-lg font-semibold">{cost.label}</h4>
                    <span className="text-sm text-muted">{cost.optInTravelerIds.length} going</span>
                  </div>
                  <p className="text-sm text-muted">{priceLine}</p>
                  {canOpt && party ? (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${inIt ? "bg-accent text-accent-ink" : "border border-line"}`}
                              >
                                {inIt ? "✓ " : "+ "}
                                {many ? traveler.name.split(" ")[0] : inIt ? "I'm in" : "Count me in"}
                              </button>
                            </form>
                          );
                        })}
                    </div>
                  ) : viewer && !viewer.isPayer && viewer.role !== "honoree" ? (
                    <p className="mt-2 text-xs text-muted">Your party&apos;s payer adds people.</p>
                  ) : !view.buyInOpen ? (
                    <p className="mt-2 text-xs text-muted">Sign-ups closed with the buy-in.</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h3 className="font-serif text-2xl">The whole trip</h3>
        <ul className="mt-3 divide-y divide-line rounded-3xl border border-line bg-card">
          {fixed.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{cost.label}</span>
                <span className="block text-sm text-muted">{splitWords(cost)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block">{whole(cost.amountCents)}</span>
                {(view.isOrganizer || (cost.splitType === "individual" && cost.memberId === viewer?.partyUserId)) && !view.cancelled ? (
                  <form action={deleteCostAction}>
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={viewer?.userId} />
                    <input type="hidden" name="costId" value={cost.id} />
                    <button type="submit" className="text-xs font-semibold text-muted underline">
                      Remove
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-accent">How splitting works</summary>
          <div className="mt-2 grid gap-2 text-sm leading-relaxed text-muted">
            <p>Lodging splits {splitModeLabel(view.splitMode).toLowerCase()}: a nicer bed costs more, a couch costs less, and an empty bed costs nobody anything.</p>
            <p>
              Food and shared activities split per person. Children count as {view.ageWeights.child} of an adult and infants as {view.ageWeights.infant}.
            </p>
            <p>Extras split only among the people who opted in. Flights stay with their own party.</p>
            <p>
              Each party&apos;s shared total rounds up to the next dollar.
              {view.roundingCents > 0 ? ` That leaves ${money(view.roundingCents)} in the trip pot.` : ""}
              {view.forfeitedPotCents > 0 ? ` ${money(view.forfeitedPotCents)} forfeited by a late drop paid down lodging.` : ""}
            </p>
            <p>Prices are typed in by the organizer. Nothing checks live fares or rentals.</p>
          </div>
        </details>
      </section>

      {viewer && viewer.isPayer && viewer.status !== "off_trip" && !view.cancelled ? (
        <details className={`rounded-2xl ${view.isOrganizer ? "border border-dashed" : "border"} border-line`}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">
            {view.isOrganizer ? "Organizer: add a cost" : "Add a cost only your party pays"}
          </summary>
          <form action={addCostAction} className="grid gap-3 px-4 pb-4">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer.userId} />
            {!view.isOrganizer ? <input type="hidden" name="splitType" value="individual" /> : null}
            {!view.isOrganizer ? <input type="hidden" name="memberId" value={viewer.partyUserId} /> : null}
            <label className="text-sm font-medium">
              What
              <Input className="mt-1.5" name="label" placeholder={view.isOrganizer ? "Boat rental" : "Flight home"} required />
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
                    <option value="optional">Extra — only people who opt in</option>
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
                  <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
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
        </details>
      ) : null}
    </div>
  );
}

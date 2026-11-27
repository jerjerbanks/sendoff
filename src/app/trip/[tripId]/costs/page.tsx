import { addCostAction, deleteCostAction, travelerOptAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { ForecastSlider } from "@/components/forecast-slider";
import { forecastFor } from "@/lib/forecast";
import { ownBudget } from "@/lib/store";
import { Input, fieldClass } from "@/components/ui/input";
import { money } from "@/lib/format";
import { ageBandLabel, categoryLabel, splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadMemberView } from "@/lib/view";

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
  const view = await loadMemberView(tripId, await getViewerId());
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

  const budget = viewer?.isPayer ? await ownBudget(tripId, viewer.userId) : null;
  const forecast = forecastFor(view);
  const fits = budget && bill ? bill.totalCents <= budget.maxAllIn : null;
  const cents = (value: number) => (value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const preview = view.currentShareCents == null && view.ifYouCommitCents != null;

  return (
    <div className="grid grid-cols-1 gap-9 [&>*]:min-w-0">
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}

      {bill ? (
        <section>
          {/* v6.5 money card: the clay tint, ink text. */}
          <div className="ft-money-card">
          <p className="ft-lbl">
            {party?.name} · {party?.travelers.length} {party?.travelers.length === 1 ? "person" : "people"} · if {view.payerCount} {view.payerCount === 1 ? "party goes" : "parties go"}
          </p>
          <div className="mt-1 py-1">
            <p className="ft-money text-[76px]">{whole(bill.totalCents)}</p>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {fits != null ? (
              <span className={`ft-chip ${fits ? "pine" : "bad"}`}>
                <span className={`ft-dot ${fits ? "" : "error"}`} aria-hidden />
                {fits ? "Fits budget" : "Over budget"}
              </span>
            ) : (
              <span className={`ft-chip ${view.payerCount >= view.minPayerCount ? "pine" : "warn"}`}>
                <span className={`ft-dot ${view.payerCount >= view.minPayerCount ? "" : "warn"}`} aria-hidden />
                {view.lockedIn ? "Final" : view.payerCount >= view.minPayerCount ? "Official" : "Estimate"}
              </span>
            )}
            <span className="ft-meta">{fits != null ? "Only you see your budget" : preview ? "If you commit now" : `What ${many ? "your party pays" : "you pay"} in all`}</span>
          </p>
          </div>

          <div className="ft-panel mt-6">
            <div className="ft-panel-h">
              <span className="ft-lbl ink">Breakdown</span>
              <span className="ft-lbl">USD</span>
            </div>
            <dl className="px-4">
              <div className="ft-row">
                <dt className="min-w-0">
                  Lodging{party?.rooms.length ? <span className="ft-meta"> · {party.rooms.join(", ").toLowerCase()}</span> : null}
                </dt>
                <dd className="ft-amt text-right">{cents(bill.lodgingCents)}</dd>
              </div>
              <div className="ft-row">
                <dt className="min-w-0">
                  Food + activities{many ? <span className="ft-meta"> · {party?.ageWeight} shares</span> : null}
                </dt>
                <dd className="ft-amt text-right">{cents(bill.evenCents)}</dd>
              </div>
              {bill.optionalCents + bill.ticketCents > 0 ? (
                <div className="ft-row">
                  <dt>
                    Extras<span className="ft-meta"> · you opted in</span>
                  </dt>
                  <dd className="ft-amt text-right">{cents(bill.optionalCents + bill.ticketCents)}</dd>
                </div>
              ) : null}
              {bill.individualCents > 0 ? (
                <div className="ft-row">
                  <dt>
                    Just {many ? "your party" : "you"}
                    <span className="ft-meta"> · flights</span>
                  </dt>
                  <dd className="ft-amt text-right">{cents(bill.individualCents)}</dd>
                </div>
              ) : null}
              <div className="ft-row border-b-0">
                <dt className="font-semibold">Total</dt>
                <dd className="ft-amt text-right font-semibold">${cents(bill.totalCents)}</dd>
              </div>
            </dl>
          </div>
          {view.buyInAmountCents > 0 ? <p className="ft-meta mt-3">The {whole(view.buyInAmountCents)} buy-in is your first payment toward this.</p> : null}
          {view.honoreeExcluded ? <p className="ft-meta mt-1">The group covers the guest of honor.</p> : null}
          {view.roundingCents > 0 ? <PotLine cents={view.roundingCents} /> : null}
        </section>
      ) : null}

      {!bill && (view.currentShareCents ?? view.ifYouCommitCents) != null && viewer?.role !== "honoree" ? (
        <section>
          <p className="ft-lbl">
            {party ? `${party.name} · ${party.travelers.length} ${party.travelers.length === 1 ? "person" : "people"} · ` : ""}
            {preview ? "if you commit now" : "your share"}
          </p>
          <div className="ft-glow -mx-5 mt-1 px-5 py-1">
            <p className="ft-money text-[76px]">{whole((view.currentShareCents ?? view.ifYouCommitCents)!)}</p>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="ft-chip warn">
              <span className="ft-dot warn" aria-hidden />
              Estimate
            </span>
            <span className="ft-meta">The line-by-line breakdown shows once you commit.</span>
          </p>
        </section>
      ) : null}

      {forecast ? (
        <section>
          <h2 className="ft-sec">
            <span className="ix">§1</span>
            <span className="ft-h2">If the group changes</span>
          </h2>
          <p className="ft-meta mt-2">
            The stay books at {view.minPayerCount} parties. Tap a count to see {many ? "your party's" : "your"} share.
          </p>
          <div className="mt-4">
            <ForecastSlider
              compact
              rows={forecast.rows}
              startPayers={forecast.start}
              nowPayers={view.payerCount}
              bandLowDeltaCents={forecast.bandLow}
              bandHighDeltaCents={forecast.bandHigh}
              budgetCents={budget?.maxAllIn ?? null}
            />
          </div>
        </section>
      ) : null}

      {optional.length > 0 ? (
        <section>
          <h2 className="ft-sec">
            <span className="ix">§2</span>
            <span className="ft-h2">Extras</span>
          </h2>
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
                <li key={cost.id} className="ft-panel p-4">
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
                                className={`ft-chip min-h-12 px-4 !text-[15px] ${inIt ? "on" : ""}`}
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
        <h2 className="ft-sec">
          <span className="ix">§3</span>
          <span className="ft-h2">The whole trip</span>
        </h2>
        <ul className="mt-3 divide-y divide-line ft-panel">
          {fixed.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{cost.label}</span>
                <span className="block text-sm text-muted">{splitWords(cost)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="ft-amt block">{cents(cost.amountCents)}</span>
                {(view.isOrganizer || (cost.splitType === "individual" && cost.memberId === viewer?.partyUserId)) && !view.cancelled ? (
                  <form action={deleteCostAction}>
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={viewer?.userId} />
                    <input type="hidden" name="costId" value={cost.id} />
                    <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-end text-xs font-semibold text-muted underline">
                      Remove
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {/* Visible, not only inside "How splitting works": with no line-by-line bill above, the pot shows here. */}
        {!bill && view.roundingCents > 0 ? <PotLine cents={view.roundingCents} /> : null}
        <details className="mt-3">
          <summary className="ft-summary text-[15px] font-medium text-ink-2">How splitting works</summary>
          <div className="mt-2 grid gap-2 text-sm leading-relaxed text-muted">
            <p>Lodging splits {splitModeLabel(view.splitMode).toLowerCase()}: a nicer bed costs more, a couch costs less, and an empty bed costs nobody anything.</p>
            <p>
              Food and shared activities split per person. Children count as {view.ageWeights.child} of an adult and infants as {view.ageWeights.infant}.
            </p>
            <p>Extras split only among the people who opted in. Flights stay with their own party.</p>
            <p>
              Each party&apos;s shared total rounds up to the next dollar.
              {view.roundingCents > 0 ? " The leftover goes to the trip pot." : ""}
              {view.forfeitedPotCents > 0 ? ` ${money(view.forfeitedPotCents)} forfeited by a late drop paid down lodging.` : ""}
            </p>
            <p>Prices are typed in by the organizer. Nothing checks live fares or rentals.</p>
          </div>
        </details>
      </section>

      {viewer && viewer.isPayer && viewer.status !== "off_trip" && !view.cancelled ? (
        <details className={`rounded-2xl ${view.isOrganizer ? "border border-dashed" : "border"} border-line`}>
          <summary className="ft-summary px-4 text-[15px] font-medium text-ink-2">
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

/** The rounding leftover, shown as visible text next to the totals. */
function PotLine({ cents: amount }: { cents: number }) {
  return <p className="mt-2 text-[15px] text-ink-2">That leaves {money(amount)} in the trip pot.</p>;
}

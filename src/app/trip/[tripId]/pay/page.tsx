import { openBuyInAction, payAction, removeMemberAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { PaymentGrid } from "@/components/payment-grid";
import { Input, fieldClass } from "@/components/ui/input";
import { formatDay, money, utcToZonedInput } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export default async function PayPage({
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
  const buyIn = view.milestones.find((milestone) => milestone.kind === "buy_in");
  const owed = viewer?.isPayer ? viewer.lines.filter((line) => line.canPay) : [];

  const whole = (cents: number) => money(cents).replace(/\.00$/, "");
  const canCommit =
    !!viewer && viewer.isPayer && viewer.role !== "honoree" && viewer.status === "joined" && (view.buyInOpen || view.status === "booking_ready") && !!buyIn;
  const party = view.viewerParty;
  const history = viewer?.isPayer ? viewer.lines.filter((line) => !line.canPay && line.amountCents > 0) : [];

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-4xl leading-none">Pay</h2>
        <p className="mt-2 text-sm text-muted">Each party pays its own share, so nobody fronts the bill. Test payments only — no card is charged.</p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {viewer?.role === "honoree" ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <h3 className="font-serif text-2xl">You&apos;re covered</h3>
          <p className="mt-2 text-sm text-muted">No buy-in for you. The group splits your share, flight included.</p>
        </section>
      ) : null}

      {viewer && !viewer.isPayer && viewer.role !== "honoree" ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <h3 className="font-serif text-2xl">{party?.payerName.split(" ")[0] ?? "Your payer"} pays for your party</h3>
          <p className="mt-2 text-sm text-muted">
            One buy-in covers the whole {party?.name ?? ""} party. {party?.status === "committed" ? "It's paid — you're in." : "Not committed yet."}
          </p>
        </section>
      ) : null}

      {canCommit && buyIn ? (
        <section className="rounded-3xl border-2 border-accent bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Commit {party && party.travelers.length > 1 ? `the ${party.name} party` : ""}
            {view.buyInDeadline ? ` by ${formatDay(view.buyInDeadline)}` : ""}
          </p>
          <p className="mt-1 font-serif text-6xl leading-none">{whole(view.buyInAmountCents)}</p>
          <p className="mt-2 text-sm text-muted">
            The first slice of your share, not a fee on top.
            {party && party.travelers.length > 1 ? ` One buy-in for ${party.travelers.map((traveler) => traveler.name.split(" ")[0]).join(", ")}.` : ""}
          </p>
          <p className="mt-4 rounded-2xl bg-chip px-4 py-3 text-sm leading-relaxed">
            Your buy-in is refundable until the organizer books the stay. After the stay is booked, the buy-in is forfeited if you drop and is not
            returned.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold text-accent">How refunds work</summary>
            <ul className="mt-2 grid gap-2 text-sm text-muted">
              <li>You get it back if the group misses the minimum of {view.minPayerCount} paying parties, or the organizer cancels before booking.</li>
              <li>A drop after booking pays down everyone else&apos;s lodging first.</li>
              <li>Miss the deadline and your party is off the trip, with no way back.</li>
            </ul>
          </details>
          <form action={payAction} className="mt-4 grid gap-3">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId} />
            <input type="hidden" name="milestoneId" value={buyIn.id} />
            <input type="hidden" name="kind" value="buy_in" />
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" type="checkbox" name="ack" value="yes" required />
              I understand it&apos;s refundable only until the stay is booked.
            </label>
            <SubmitButton pendingLabel="Marking paid…">Pay {whole(view.buyInAmountCents)} (test)</SubmitButton>
            <p className="text-center text-xs text-muted">Test payment. No card is charged.</p>
          </form>
        </section>
      ) : null}

      {owed.filter((line) => line.kind !== "buy_in").map((line) => (
        <section key={line.milestoneId} className="rounded-3xl border-2 border-accent bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            {line.status === "late" ? "Late" : "Due"} {formatDay(line.dueDate)}
          </p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-3xl">{line.name}</h3>
            <p className="font-serif text-3xl">{whole(line.amountCents)}</p>
          </div>
          {line.status === "late" ? (
            <p className="mt-2 text-sm text-warn">You&apos;re late. The organizer can take your party off the trip and keep what you&apos;ve paid.</p>
          ) : null}
          <form action={payAction} className="mt-4">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId} />
            <input type="hidden" name="milestoneId" value={line.milestoneId} />
            <input type="hidden" name="kind" value={line.kind} />
            <SubmitButton>Pay {whole(line.amountCents)} (test)</SubmitButton>
          </form>
        </section>
      ))}

      {viewer?.isPayer && (history.length > 0 || viewer.paidCents > 0) ? (
        <section className="rounded-3xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-serif text-xl">Your payments</h3>
            <p className="text-sm text-muted">
              {whole(viewer.paidCents)} paid{viewer.balanceCents ? ` · ${whole(viewer.balanceCents)} to go` : ""}
            </p>
          </div>
          <ul className="mt-3 grid gap-2">
            {[...owed.filter((line) => line.kind !== "buy_in"), ...history].map((line) => (
              <li key={line.milestoneId} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {line.name}
                  <span className="text-muted"> · {formatDay(line.dueDate)}</span>
                </span>
                <span className={line.status === "paid" ? "text-good" : line.status === "forfeited" ? "text-bad" : line.status === "late" ? "text-warn" : "text-muted"}>
                  {paymentStatusLabel(line.status)} {whole(line.amountCents)}
                </span>
              </li>
            ))}
          </ul>
          {viewer.refundedCents ? <p className="mt-3 text-sm text-muted">{whole(viewer.refundedCents)} came back in the test because the stay was never booked.</p> : null}
          {view.status === "buy_in_open" && viewer.status === "committed" ? (
            <p className="mt-3 text-sm text-muted">The rest of your share is scheduled once enough parties commit.</p>
          ) : null}
        </section>
      ) : null}

      {view.milestones.length > 0 ? (
        <details className="rounded-3xl border border-line bg-card">
          <summary className="cursor-pointer px-5 py-4 font-serif text-xl">Who has paid</summary>
          <div className="px-3 pb-4">
            <PaymentGrid view={view} />
          </div>
        </details>
      ) : null}

      {view.isOrganizer ? (
        <details className="rounded-2xl border border-dashed border-line" open={!view.termsLocked && !view.cancelled && view.status !== "booked"}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">Organizer: buy-in and late payers</summary>
          <div className="grid gap-4 px-4 pb-4">
            {!view.termsLocked && !view.cancelled && view.status !== "under_minimum" && view.status !== "booked" ? (
              <form action={openBuyInAction} className="grid gap-3">
                <p className="text-sm text-muted">Suggested from lodging: {whole(view.suggestedBuyInCents)}. Amount and deadline lock after the first commit.</p>
                <input type="hidden" name="tripId" value={view.id} />
                <input type="hidden" name="userId" value={viewer?.userId} />
                <label className="text-sm font-medium">
                  Buy-in per party
                  <Input className="mt-1.5" name="amount" inputMode="decimal" defaultValue={(view.suggestedBuyInCents / 100).toFixed(2)} required />
                </label>
                <label className="text-sm font-medium">
                  Paying parties needed to book
                  <Input className="mt-1.5" name="minHeadcount" type="number" min={1} defaultValue={view.minHeadcount} required />
                </label>
                <label className="text-sm font-medium">
                  Deadline (US Central)
                  <input className={`${fieldClass} mt-1.5`} type="datetime-local" name="deadline" required defaultValue={view.buyInDeadline ? utcToZonedInput(view.buyInDeadline) : undefined} />
                </label>
                <SubmitButton>Open buy-in</SubmitButton>
              </form>
            ) : (
              <p className="text-sm text-muted">
                Buy-in is {whole(view.buyInAmountCents)} per party{view.buyInDeadline ? `, due ${formatDay(view.buyInDeadline)}` : ""}. Locked once a party committed.
              </p>
            )}
            {view.lockedIn ? (
              <ul className="grid gap-2">
                {view.members.filter((member) => member.isPayer && member.lines.some((line) => line.status === "late")).map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-warn-soft px-3 py-2">
                    <span className="text-sm font-semibold">{view.parties.find((item) => item.payerUserId === member.userId)?.name ?? member.name} is late</span>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="actorId" value={viewer?.userId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <SubmitButton variant="destructive">Move off trip</SubmitButton>
                    </form>
                  </li>
                ))}
                {view.members.every((member) => !member.lines.some((line) => line.status === "late")) ? (
                  <li className="text-sm text-muted">Nobody is late. A drop after booking forfeits the buy-in, which pays down lodging first.</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

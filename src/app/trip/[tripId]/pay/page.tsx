import { openBuyInAction, payAction, removeMemberAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { PaymentGrid } from "@/components/payment-grid";
import { Input, fieldClass } from "@/components/ui/input";
import { formatWhen, money, utcToZonedInput } from "@/lib/format";
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

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-3xl">Nobody fronts the bill</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Each committed party pays its own share straight into the trip, so the organizer doesn&apos;t front it. Test payment — no card charged. Stripe
          is not connected and no real money moves.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {viewer?.role === "honoree" ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">You&apos;re covered</h3>
          <p className="mt-2 text-sm leading-relaxed">
            You don&apos;t pay a buy-in. The group splits the shared costs, including your flight, without you.
          </p>
        </section>
      ) : null}

      {viewer && !viewer.isPayer && viewer.role !== "honoree" ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">{view.viewerParty?.payerName.split(" ")[0] ?? "Your payer"} pays for your party</h3>
          <p className="mt-2 text-sm leading-relaxed">
            One buy-in covers the whole {view.viewerParty?.name ?? ""} party. Status: {view.viewerParty?.status === "committed" ? "committed" : "not committed yet"}.
          </p>
        </section>
      ) : null}

      {viewer && viewer.isPayer && viewer.status !== "off_trip" && viewer.role !== "honoree" && (view.buyInOpen || view.status === "booking_ready") && viewer.status === "joined" && buyIn ? (
        <section className="rounded-3xl border-2 border-accent bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Commit {view.viewerParty && view.viewerParty.travelers.length > 1 ? `the ${view.viewerParty.name} party` : "your spot"}
          </p>
          <h3 className="mt-1 font-serif text-4xl">{money(view.buyInAmountCents)}</h3>
          {view.viewerParty && view.viewerParty.travelers.length > 1 ? (
            <p className="mt-1 text-sm">
              One buy-in for {view.viewerParty.travelers.map((traveler) => traveler.name.split(" ")[0]).join(", ")}.
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed">
            Your buy-in is refundable until the organizer books the stay. After the stay is booked, the buy-in is forfeited if you drop and is not
            returned. It is the first slice of your share, not a fee on top.
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>You get it back if the group misses the minimum of {view.minPayerCount} paying parties, or the organizer cancels before booking.</li>
            <li>If you drop after the stay is booked, this payment is forfeited. It reduces lodging first, and everyone else&apos;s share goes up.</li>
            <li>The deadline is {view.buyInDeadline ? formatWhen(view.buyInDeadline) : "not set"}. Miss it and your party is off, with no way back.</li>
          </ul>
          <form action={payAction} className="mt-4 grid gap-3">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer.userId} />
            <input type="hidden" name="milestoneId" value={buyIn.id} />
            <input type="hidden" name="kind" value="buy_in" />
            <label className="flex items-start gap-2 text-sm">
              <input className="mt-1" type="checkbox" name="ack" value="yes" required />
              I understand. This buy-in comes back only if the stay is never booked. After booking, it is not refunded.
            </label>
            <SubmitButton pendingLabel="Marking paid…">Pay {money(view.buyInAmountCents)} (test)</SubmitButton>
            <p className="text-xs text-muted">Test payment. No card is charged.</p>
          </form>
        </section>
      ) : null}

      {viewer && viewer.paidCents > 0 ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Already marked paid</h3>
          <p className="mt-1 text-sm">
            {money(viewer.paidCents)} in test payments
            {viewer.balanceCents === null ? ". The rest of the share locks when the deadline passes." : ` · ${money(viewer.balanceCents)} still open.`}
          </p>
        </section>
      ) : null}

      {viewer?.refundedCents ? (
        <section className="rounded-3xl bg-chip p-4">
          <h3 className="font-serif text-2xl">Refunded in the test</h3>
          <p className="mt-1 text-sm">{money(viewer.refundedCents)} came back because the trip missed the minimum or was cancelled. No money moved.</p>
        </section>
      ) : null}

      {owed.filter((line) => line.kind !== "buy_in").map((line) => (
        <section key={line.milestoneId} className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-2xl">{line.name}</h3>
            <p className="font-semibold">{money(line.amountCents)}</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            {paymentStatusLabel(line.status)} · due {formatWhen(line.dueDate)}
            {line.status === "late" ? " · late. The organizer can take your party off the trip and keep what you've paid." : ""}
          </p>
          <form action={payAction} className="mt-3">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId} />
            <input type="hidden" name="milestoneId" value={line.milestoneId} />
            <input type="hidden" name="kind" value={line.kind} />
            <SubmitButton>Pay {money(line.amountCents)} (test)</SubmitButton>
          </form>
        </section>
      ))}

      <section>
        <h3 className="mb-3 font-serif text-2xl">Who still owes what</h3>
        <p className="mb-2 text-xs text-muted">One row per paying party. Test payments only.</p>
        <PaymentGrid view={view} />
      </section>

      {view.isOrganizer && view.lockedIn ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Late payers</h3>
          <p className="mt-1 text-sm text-muted">
            Moving a party off forfeits what it already paid, which pays down lodging first. Optional costs re-split among whoever is still opted in.
            The guest of honor can&apos;t be dropped.
          </p>
          <ul className="mt-3 grid gap-2">
            {view.members.filter((member) => member.isPayer && member.lines.some((line) => line.status === "late")).map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-warn-soft px-3 py-2">
                <span className="text-sm font-semibold">{view.parties.find((party) => party.payerUserId === member.userId)?.name ?? member.name} is late</span>
                <form action={removeMemberAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="actorId" value={viewer?.userId} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <SubmitButton variant="destructive">Move off trip</SubmitButton>
                </form>
              </li>
            ))}
            {view.members.every((member) => !member.lines.some((line) => line.status === "late")) ? (
              <li className="text-sm text-muted">Nobody is late. Jump the QA clock to the day after the second payment to try a forfeiture.</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {view.isOrganizer && !view.termsLocked && !view.cancelled && view.status !== "under_minimum" && view.status !== "booked" ? (
        <form action={openBuyInAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Open buy-in</h3>
          <p className="text-sm text-muted">
            Suggested from lodging, rounded up: {money(view.suggestedBuyInCents)}. The amount and deadline lock after the first commit.
          </p>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={viewer?.userId} />
          <label className="text-sm font-medium">
            Buy-in amount
            <Input className="mt-1.5" name="amount" inputMode="decimal" defaultValue={(view.suggestedBuyInCents / 100).toFixed(2)} required />
          </label>
          <label className="text-sm font-medium">
            Paying parties needed to book (guests of honor don&apos;t count)
            <Input className="mt-1.5" name="minHeadcount" type="number" min={1} defaultValue={view.minHeadcount} required />
          </label>
          <label className="text-sm font-medium">
            Deadline (US Central)
            <input className={`${fieldClass} mt-1.5`} type="datetime-local" name="deadline" required defaultValue={view.buyInDeadline ? utcToZonedInput(view.buyInDeadline) : undefined} />
          </label>
          <SubmitButton>Open buy-in</SubmitButton>
        </form>
      ) : null}

      {view.termsLocked && view.buyInOpen ? (
        <p className="text-sm text-muted">
          Buy-in is {money(view.buyInAmountCents)} per paying party, due {view.buyInDeadline ? formatWhen(view.buyInDeadline) : ""}. Amount and deadline are locked because a party already committed.
        </p>
      ) : null}
    </div>
  );
}

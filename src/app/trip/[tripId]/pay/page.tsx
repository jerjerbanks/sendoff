import { openBuyInAction, payAction, removeMemberAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { CommitButton, HeadcountMeter } from "@/components/motion";
import { PaymentGrid } from "@/components/payment-grid";
import { Spot } from "@/components/spot";
import { meterCells, meterSub, restScheduleNote, tripMeter } from "@/lib/meter";
import { Input, fieldClass } from "@/components/ui/input";
import { formatDay, money, utcToZonedInput } from "@/lib/format";
import { paymentStatusLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadMemberView } from "@/lib/view";
import { activeTripTheme, THEME_INFO, themeForTrip } from "@/lib/trip-theme";
import { THEME_PREVIEW_ON } from "@/lib/vibe-flag";

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; opened?: string; "ft-theme"?: string }>;
}) {
  const { tripId } = await params;
  const { error, opened, "ft-theme": themePreview } = await searchParams;
  const view = await loadMemberView(tripId, await getViewerId());
  if (!view) return null;
  const theme = activeTripTheme(themeForTrip(view), themePreview, THEME_PREVIEW_ON);
  const viewer = view.viewer;
  const buyIn = view.milestones.find((milestone) => milestone.kind === "buy_in");
  const owed = viewer?.isPayer ? viewer.lines.filter((line) => line.canPay) : [];

  const whole = (cents: number) => money(cents).replace(/\.00$/, "");
  const canCommit =
    !!viewer && viewer.isPayer && viewer.role !== "honoree" && viewer.status === "joined" && (view.buyInOpen || view.status === "booking_ready") && !!buyIn;
  const party = view.viewerParty;
  const history = viewer?.isPayer ? viewer.lines.filter((line) => !line.canPay && line.amountCents > 0) : [];

  const words = ["Nobody", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  const word = (n: number) => words[n] ?? String(n);
  const share = view.currentShareCents ?? view.ifYouCommitCents ?? party?.bill?.totalCents ?? null;
  const daysLeft = view.buyInDeadline ? Math.max(0, Math.ceil((Date.parse(view.buyInDeadline) - Date.parse(view.now)) / 86_400_000)) : null;
  const after = view.payerCount + 1;
  // v6 celebration: every party still on the trip has committed (honoree-only parties don't pay).
  const payingParties = view.parties.filter((item) => !item.isHonoreeOnly && item.status !== "off_trip" && item.status !== "declined");
  const everyoneIn = payingParties.length >= 2 && payingParties.every((item) => item.status === "committed");

  return (
    <div className="grid grid-cols-1 gap-8 [&>*]:min-w-0">
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}
      {opened && !error && view.buyInOpen ? (
        <p role="status" className="ft-panel border-good/40 bg-good-soft px-4 py-3 text-[15px] text-good">
          Buy-in is open: {money(view.buyInAmountCents).replace(/\.00$/, "")} per party
          {view.buyInDeadline ? `, due ${formatDay(view.buyInDeadline)}` : ""}.
        </p>
      ) : null}

      {everyoneIn ? (
        <section className="ft-panel overflow-hidden px-5 pt-6 pb-5 text-center">
          <Spot name="everyone-in" alt="Friends and family cheering together on a lake dock at sunset" className="w-[240px]" />
          <p className="mt-4">
            <span className="ft-badge joy">
              <span aria-hidden>✓</span> {payingParties.length} of {payingParties.length} committed
            </span>
          </p>
          <h2 className="ft-h1 mt-2">
            You made it out of
            <br />
            <i>the group chat.</i>
          </h2>
          <p className="ft-lead mt-2 ft-theme-ink">{THEME_INFO[theme].done}</p>
        </section>
      ) : null}

      {viewer?.role === "honoree" ? (
        <section>
          <p className="ft-lbl accent">Guest of honor</p>
          <h1 className="ft-display mt-3">
            You&apos;re
            <br />
            <i>covered.</i>
          </h1>
          <p className="ft-lead mt-4">No buy-in for you. The group splits your share, flight included.</p>
        </section>
      ) : null}

      {viewer && !viewer.isPayer && viewer.role !== "honoree" ? (
        <section>
          <p className="ft-lbl accent">{party?.name ?? "Your party"}</p>
          <h1 className="ft-display mt-3">
            {party?.payerName.split(" ")[0] ?? "Your payer"} pays
            <br />
            <i>for your party.</i>
          </h1>
          <p className="ft-lead mt-4">
            One buy-in covers the whole {party?.name ?? ""} party. {party?.status === "committed" ? "It's paid, so you're in." : "Not committed yet."}
          </p>
        </section>
      ) : null}

      {viewer?.isPayer && viewer.role !== "honoree" && viewer.status === "joined" && !canCommit && !view.cancelled && (view.status === "planning" || view.status === "voting") ? (
        <section>
          <p className="ft-lbl">{party?.name ?? viewer.name}</p>
          <h1 className="ft-display mt-3">
            Buy-in isn&apos;t
            <br />
            <i>open yet.</i>
          </h1>
          <p className="ft-lead mt-4">
            {view.isOrganizer
              ? "Open it below once the place and dates are set and the house is on the cost sheet. Everyone then commits with a refundable test buy-in."
              : `${view.organizerName.split(" ")[0] || "The organizer"} opens it once the place and dates are set. Until then, vote and check your number on Costs.`}
          </p>
        </section>
      ) : null}

      {canCommit && buyIn ? (
        <>
          <section>
            <p className="ft-lbl">
              {party && party.travelers.length > 1
                ? party.travelers.map((traveler) => traveler.name.split(" ")[0]).join(" & ")
                : (viewer?.name ?? "")}
            </p>
            <h1 className="ft-display mt-3">
              {view.payerCount === 0 ? "Nobody's in yet." : `${word(view.payerCount)} ${view.payerCount === 1 ? "is" : "are"} in.`}
              <br />
              <i>{after <= view.minPayerCount ? `You make ${word(after).toLowerCase()}.` : "Join them."}</i>
            </h1>
            <p className="ft-lead mt-4">
              {view.organizerName.split(" ")[0]} books the stay at {view.minPayerCount} {view.minPayerCount === 1 ? "party" : "parties"}.{" "}
              {after === view.minPayerCount
                ? `Your ${party && party.travelers.length > 1 ? `${party.travelers.length} places take` : "place takes"} it to the line.`
                : after > view.minPayerCount
                  ? "The line is already met, so your share goes down when you join."
                  : `${view.minPayerCount - after} more after you.`}
            </p>
          </section>

          <HeadcountMeter
            framed
            cells={meterCells(view)}
            need={view.minPayerCount}
            unit="parties"
            sub={meterSub(tripMeter(view), "parties")}
            booked={view.lockedIn || view.status === "booked"}
          />

          <section className="ft-rule -mx-5 px-5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="ft-glow -ml-5 min-w-0 flex-1 pl-5">
                <p className="ft-lbl">Buy-in today</p>
                <p className="ft-money mt-2 text-[76px]">{whole(view.buyInAmountCents)}</p>
              </div>
              <div className="pt-0.5 text-right">
                <p className="ft-lbl">Refundable</p>
                {share != null ? (
                  <dl className="ft-mono mt-5 grid grid-cols-[auto_auto] gap-x-4 gap-y-1.5 text-[15px] text-ink-2">
                    <dt className="uppercase tracking-[0.06em]">Rest</dt>
                    <dd className="text-ink">{whole(Math.max(0, share - view.buyInAmountCents))}</dd>
                    <dt className="uppercase tracking-[0.06em]">Total</dt>
                    <dd className="text-ink">{whole(share)}</dd>
                  </dl>
                ) : null}
              </div>
            </div>
            <dl className="mt-6 border-t border-line">
              <div className="ft-kv">
                <dt>Room</dt>
                <dd className="v">{party?.rooms.length ? party.rooms.join(", ") : <span className="text-ink-2">You pick right after</span>}</dd>
              </div>
              {view.buyInDeadline ? (
                <div className="ft-kv">
                  <dt>Deadline</dt>
                  <dd className="v">
                    {formatDay(view.buyInDeadline)}
                    {daysLeft != null ? <span className="ft-meta"> · {daysLeft} {daysLeft === 1 ? "day" : "days"}</span> : null}
                  </dd>
                </div>
              ) : null}
              <div className="ft-kv">
                <dt>Refund</dt>
                <dd className="text-[16px]">
                  Full, if {view.minPayerCount} parties aren&apos;t in by the deadline or the stay isn&apos;t booked. After booking, a drop forfeits it.
                </dd>
              </div>
            </dl>
            <details className="mt-3">
              <summary className="ft-btn-sec ft-btn-sec-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">How refunds work</summary>
              <ul className="ft-meta mt-3 grid gap-2 pb-2">
                <li>You get it back if the group misses the minimum of {view.minPayerCount} paying parties, or the organizer cancels before booking.</li>
                <li>A drop after booking pays down everyone else&apos;s lodging first.</li>
                <li>Miss the deadline and your party is off the trip, with no way back.</li>
              </ul>
            </details>
          </section>

          <form action={payAction} className="grid gap-4">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId} />
            <input type="hidden" name="milestoneId" value={buyIn.id} />
            <input type="hidden" name="kind" value="buy_in" />
            <label className="flex min-h-12 items-start gap-3 text-[15px] text-ink-2">
              <input className="mt-0.5 size-6 shrink-0 accent-[var(--accent)]" type="checkbox" name="ack" value="yes" required />
              I understand it&apos;s refundable only until the stay is booked.
            </label>
            <TestModeNotice />
            <CommitButton label="Commit" amount={whole(view.buyInAmountCents)} doneLabel={`Committed · ${whole(view.buyInAmountCents)}`} />
            <p className="flex items-center justify-between gap-3">
              <span className="ft-meta">Test payment, no card charged</span>
              <span className="ft-meta">Paid to the trip</span>
            </p>
          </form>
        </>
      ) : null}

      {viewer?.isPayer && viewer.role !== "honoree" && party?.status === "committed" ? (
        <>
          <section>
            <p className="ft-lbl accent">{party.name} · committed</p>
            <h1 className="ft-display mt-3">
              You&apos;re in.
              <br />
              <i>{viewer.balanceCents ? "The rest comes later." : "All squared up."}</i>
            </h1>
            <p className="ft-lead mt-4">
              {restScheduleNote({
                lockedIn: view.lockedIn,
                payerCount: view.payerCount,
                minPayers: view.minPayerCount,
                organizerFirstName: view.organizerName.split(" ")[0] ?? view.organizerName,
                viewerIsOrganizer: view.isOrganizer,
              })}
            </p>
          </section>
          <HeadcountMeter
            framed
            cells={meterCells(view)}
            need={view.minPayerCount}
            unit="parties"
            sub={meterSub(tripMeter(view), "parties")}
            booked={view.lockedIn || view.status === "booked"}
          />
        </>
      ) : null}

      {owed.filter((line) => line.kind !== "buy_in").map((line) => (
        <section key={line.milestoneId} className="ft-panel">
          <div className="ft-panel-h">
            <span className="ft-lbl ink">{line.name}</span>
            <span className={`ft-live ${line.status === "late" ? "text-bad" : ""}`}>
              <span className={`ft-dot ${line.status === "late" ? "error" : "accent"}`} aria-hidden />
              {line.status === "late" ? "LATE" : "DUE"} {formatDay(line.dueDate).toUpperCase()}
            </span>
          </div>
          <div className="p-4">
          <p className="ft-money text-[56px]">{whole(line.amountCents)}</p>
          {line.status === "late" ? (
            <p className="mt-2 text-sm text-warn">You&apos;re late. The organizer can take your party off the trip and keep what you&apos;ve paid.</p>
          ) : null}
          <TestModeNotice className="mt-4" />
          <form action={payAction} className="mt-3">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId} />
            <input type="hidden" name="milestoneId" value={line.milestoneId} />
            <input type="hidden" name="kind" value={line.kind} />
            <CommitButton label="Pay (test)" amount={whole(line.amountCents)} doneLabel={`Paid · ${whole(line.amountCents)}`} />
          </form>
          </div>
        </section>
      ))}

      {viewer?.isPayer && (history.length > 0 || viewer.paidCents > 0) ? (
        <section className="ft-panel">
          <div className="ft-panel-h">
            <span className="ft-lbl ink">Your payments</span>
            <span className="ft-mono text-[14px] text-ink-2">
              {whole(viewer.paidCents)} paid{viewer.balanceCents ? ` · ${whole(viewer.balanceCents)} to go` : ""}
            </span>
          </div>
          <div className="px-4 pb-4">
          <ul className="mt-2 border-t border-line">
            {[...owed.filter((line) => line.kind !== "buy_in"), ...history].map((line) => (
              <li key={line.milestoneId} className="ft-row last:border-b-0">
                <span className="min-w-0">
                  {line.name}
                  <span className="ft-meta block">
                    <span className={`ft-mono uppercase tracking-[0.06em] ${line.status === "paid" ? "text-pine" : line.status === "forfeited" ? "text-bad" : line.status === "late" ? "text-warn" : ""}`}>
                      {paymentStatusLabel(line.status)}
                    </span>
                    {" · "}
                    {formatDay(line.dueDate)}
                  </span>
                </span>
                <span className="ft-amt text-right">{money(line.amountCents)}</span>
              </li>
            ))}
          </ul>
          {viewer.refundedCents ? <p className="mt-3 text-sm text-muted">{whole(viewer.refundedCents)} came back in the test because the stay was never booked.</p> : null}
          {view.status === "buy_in_open" && viewer.status === "committed" ? (
            <p className="ft-meta mt-3">
              {view.payerCount < view.minPayerCount
                ? "The rest of your share is scheduled once enough parties commit."
                : "The rest of your share is scheduled when the stay is booked."}
            </p>
          ) : null}
          </div>
        </section>
      ) : null}

      {view.milestones.length > 0 ? (
        <details className="ft-panel">
          <summary className="ft-summary px-4 py-2 text-[17px] font-semibold">Who has paid</summary>
          <div className="px-3 pb-4">
            <PaymentGrid view={view} />
          </div>
        </details>
      ) : null}

      {view.isOrganizer ? (
        <details className="rounded-2xl border border-dashed border-line-strong" open={!view.termsLocked && !view.cancelled && view.status !== "booked"}>
          <summary className="ft-summary px-4 text-[15px] font-medium text-ink-2">Organizer: buy-in and late payers</summary>
          <div className="grid gap-4 px-4 pb-4">
            {!view.termsLocked && !view.cancelled && view.status !== "under_minimum" && view.status !== "booked" ? (
              <form action={openBuyInAction} className="grid gap-3">
                <p className="text-sm text-muted">
                  {view.suggestedBuyInCents > 0
                    ? `Suggested from lodging: ${whole(view.suggestedBuyInCents)}.`
                    : "Add the house on the Costs page first and we'll suggest an amount."}{" "}
                  Amount and deadline lock after the first commit.
                </p>
                <input type="hidden" name="tripId" value={view.id} />
                <input type="hidden" name="userId" value={viewer?.userId} />
                <label className="text-sm font-medium">
                  Buy-in per party
                  <Input
                    className="mt-1.5"
                    name="amount"
                    inputMode="decimal"
                    defaultValue={view.suggestedBuyInCents > 0 ? (view.suggestedBuyInCents / 100).toFixed(2) : undefined}
                    placeholder="150"
                    required
                  />
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

/** Shown above every commit and pay button until real payments exist (they don't yet). */
function TestModeNotice({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`ft-notice ${className}`}>
      <span>
        <strong className="font-semibold">Test mode: no real money moves.</strong> Nothing is charged and no card is asked for.
      </span>
    </p>
  );
}

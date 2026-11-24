import Link from "next/link";
import { cancelAction, extendAction } from "@/app/actions";
import { CopyLink, SubmitButton } from "@/components/bits";
import { PaymentGrid } from "@/components/payment-grid";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatWhen, money, utcToZonedInput } from "@/lib/format";
import { ageBandLabel, honoreeRoleLabel, partyStatusLabel, pollKindLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView, type TripView } from "@/lib/view";

export default async function DashboardPage({
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
  const plan = view.polls.map((poll) => ({
    kind: poll.kind,
    label: poll.lockedLabel,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad md:col-span-2">{error}</p> : null}
      <section className="rounded-3xl border border-line bg-card p-4 md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Notices stay in the app. Nothing is emailed.</p>
        <div className="mt-3 grid gap-2">
          {view.notices.length === 0 ? <p className="text-sm text-muted">Nothing needs you right now.</p> : null}
          {view.notices.map((notice) => (
            <p
              key={notice.text}
              className={
                notice.tone === "bad"
                  ? "rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad"
                  : notice.tone === "warn"
                    ? "rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn"
                    : notice.tone === "good"
                      ? "rounded-xl bg-good-soft px-3 py-2 text-sm text-good"
                      : "rounded-xl bg-chip px-3 py-2 text-sm"
              }
            >
              {notice.text}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="font-serif text-2xl">The plan</h2>
        <p className="mt-1 text-sm text-muted">{view.dateWindow}</p>
        <ul className="mt-4 grid gap-3">
          {plan.map((item) => (
            <li key={item.kind} className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted">{pollKindLabel(item.kind)}</span>
              <span className="text-right text-sm font-semibold">{item.label ?? "Still voting"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          {view.honoreeNames.length > 0
            ? `Guest${view.honoreeNames.length > 1 ? "s" : ""} of honor: ${view.honoreeNames.join(" and ")}${view.honoreeExcluded ? " · the group covers their share" : ""}`
            : "No guest of honor. Everyone who commits pays."}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-sm font-semibold text-accent">
          <Link href={`/trip/${view.id}/party`}>Your party</Link>
          <Link href={`/trip/${view.id}/vote`}>Polls</Link>
          <Link href={`/trip/${view.id}/spots`}>Rooms</Link>
          {view.viewer?.isPayer ? <Link href={`/trip/${view.id}/budget`}>Private budget</Link> : null}
          {view.isOrganizer ? (
            <>
              <Link href={`/trip/${view.id}/sleep`}>Room setup</Link>
              <Link href={`/trip/${view.id}/approvals`}>Approvals</Link>
              <Link href={`/trip/${view.id}/book`}>Book stay</Link>
              <Link href={`/trip/${view.id}/settings`}>Settings</Link>
              <Link href={`/trip/${view.id}/metrics`}>Metrics</Link>
            </>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="font-serif text-2xl">
          {view.viewerParty && view.viewerParty.travelers.length > 1
            ? `The ${view.viewerParty.name} party's number`
            : viewer
              ? `Your number, ${viewer.name.split(" ")[0]}`
              : "Your number"}
        </h2>
        {view.shareLowCents != null && view.shareHighCents != null ? (
          <p className="mt-1 text-sm font-semibold">Flight band {money(view.shareLowCents)}–{money(view.shareHighCents)} around the midpoint.</p>
        ) : null}
        <ShareSummary view={view} />
        {view.viewerParty?.bill?.payer ? (
          <p className="mt-2 text-sm text-muted">
            Lodging {money(view.viewerParty.bill.lodgingCents)} · shared per-head {money(view.viewerParty.bill.evenCents)} · optional{" "}
            {money(view.viewerParty.bill.optionalCents + view.viewerParty.bill.ticketCents)} · just yours {money(view.viewerParty.bill.individualCents)}
          </p>
        ) : null}
        {view.saveIfOneMoreCents !== null ? (
          <p className="mt-2 text-sm">If one more party commits, you save {money(view.saveIfOneMoreCents)}.</p>
        ) : null}
        {view.addIfSomeoneDropsCents !== null ? (
          <p className="text-sm">If a party drops, you pay {money(view.addIfSomeoneDropsCents)} more. That can put the trip under the minimum.</p>
        ) : null}
        {view.sensitivityRows.length > 0 ? (
          <ul className="mt-3 grid gap-1 text-sm">
            {view.sensitivityRows.map((row) => (
              <li key={row.payers} className="flex justify-between">
                <span>{row.expanded ? `If ${row.payers} commit (with an approved share)` : `If ${row.payers} parties commit`}</span>
                <span className="font-semibold">
                  {view.shareLowCents != null && view.shareHighCents != null && view.currentShareCents != null
                    ? `${money(row.totalCents + view.shareLowCents - view.currentShareCents)}–${money(row.totalCents + view.shareHighCents - view.currentShareCents)}`
                    : money(row.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {view.rebase.length > 0 ? (
          <ul className="mt-3 grid gap-1 text-sm">
            {view.rebase.map((row) => (
              <li key={row.userId}>
                {row.name.split(" ")[0]}: {money(row.beforeCents)} → {money(row.afterCents)}
              </li>
            ))}
          </ul>
        ) : null}
        {view.viewerParty ? (
          <p className="mt-2 text-sm font-semibold">
            Room:{" "}
            {view.viewerParty.rooms.length > 0 ? (
              view.viewerParty.rooms.join(", ")
            ) : view.viewer?.role === "honoree" ? (
              "reserved for you"
            ) : (
              <Link className="text-accent" href={`/trip/${view.id}/spots`}>pick a room</Link>
            )}
          </p>
        ) : null}
        <Link href={`/trip/${view.id}/pay`} className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
          {view.nextPayment ? `Next: ${view.nextPayment.name}` : "Payment details"}
        </Link>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4 md:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="font-serif text-2xl">Who&apos;s in</h2>
          <p className="text-sm text-muted">
            {view.payerCount} paying {view.payerCount === 1 ? "party" : "parties"} committed ·{" "}
            {view.payerCount >= view.minPayerCount ? `${view.minPayerCount} needed to book, met` : `${view.minPayerCount} needed to book`}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">
          {view.travelerCount} {view.travelerCount === 1 ? "traveler" : "travelers"} of {view.maxHeadcount} max · {view.bedsNeeded} need a bed
        </p>
        <ul className="mt-3 divide-y divide-line">
          {view.parties.map((party) => (
            <li key={party.payerUserId} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {party.name}
                    {party.payerUserId === view.viewerParty?.payerUserId ? <span className="font-normal text-accent"> · you</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {party.travelers.length > 1 ? `Paid by ${party.payerName.split(" ")[0]} · ` : ""}
                    {party.rooms.length > 0 ? party.rooms.join(", ") : party.status === "committed" && !party.isHonoreeOnly ? "No room yet" : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone={party.status === "committed" ? "good" : party.status === "off_trip" || party.status === "declined" ? "bad" : "warn"}>
                    {partyStatusLabel(party.status)}
                  </Badge>
                  {party.bill?.payer ? (
                    <p className="mt-1 text-sm font-semibold">{money(party.bill.totalCents)}</p>
                  ) : party.isHonoreeOnly ? (
                    <p className="mt-1 text-xs text-muted">Buy-in waived</p>
                  ) : null}
                </div>
              </div>
              {party.travelers.length > 1 || party.travelers.some((traveler) => traveler.isHonoree || traveler.needsNotes) ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {party.travelers.map((traveler) => (
                  <li key={traveler.id} className="rounded-full bg-chip px-2.5 py-1 text-xs">
                    {traveler.name.split(" ")[0]}
                    <span className="text-muted">
                      {" "}
                      · {traveler.isHonoree ? honoreeRoleLabel(traveler.honoreeRole) : ageBandLabel(traveler.ageBand)}
                      {!traveler.hasAccount ? " · no app" : ""}
                    </span>
                    {view.isOrganizer && traveler.needsNotes ? <span className="text-warn"> · needs note</span> : null}
                  </li>
                ))}
              </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="md:col-span-2">
        <h2 className="mb-3 font-serif text-2xl">Payment status</h2>
        <PaymentGrid view={view} />
        {view.roundingCents > 0 ? (
          <p className="mt-2 text-sm text-muted">
            Rounding up leaves {money(view.roundingCents)} in the trip pot. It is not assigned to anyone.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">These shares divide evenly. Nothing extra is sitting in the pot from rounding.</p>
        )}
        {view.forfeitedPotCents > 0 ? (
          <p className="mt-1 text-sm text-muted">
            {money(view.forfeitedPotCents)} forfeited after lock-in came off the base pool only.
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-line bg-card p-4 md:col-span-2">
        <h2 className="font-serif text-2xl">Invite link</h2>
        <p className="mt-1 text-sm text-muted">Anyone with the link can join with a name and a phone or email. There&apos;s no real login.</p>
        <div className="mt-3">
          <CopyLink path={`/join/${view.inviteToken}`} />
        </div>
      </section>

      {view.isOrganizer && view.underMinimum ? (
        <section className="rounded-3xl border border-line bg-card p-4 md:col-span-2">
          <h2 className="font-serif text-2xl">The group is short</h2>
          <p className="mt-1 text-sm text-muted">
            Extending the deadline does not bring dropped parties back. You can also lower the minimum in Settings. Cancel if you want the test buy-ins to stay refunded.
          </p>
          <form action={extendAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId ?? ""} />
            <Input type="datetime-local" name="deadline" required defaultValue={view.buyInDeadline ? utcToZonedInput(view.buyInDeadline) : undefined} />
            <SubmitButton variant="secondary">Extend deadline</SubmitButton>
          </form>
          <form action={cancelAction} className="mt-3">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={viewer?.userId ?? ""} />
            <SubmitButton variant="destructive">Cancel the trip</SubmitButton>
          </form>
        </section>
      ) : null}

      {view.buyInDeadline ? (
        <p className="text-sm text-muted md:col-span-2">Buy-in deadline {formatWhen(view.buyInDeadline)}. Times are US Central.</p>
      ) : null}
    </div>
  );
}

function ShareSummary({ view }: { view: TripView }) {
  const viewer = view.viewer;
  if (!viewer) return <p className="mt-2 text-sm">Pick who you&apos;re viewing as.</p>;
  if (viewer.role === "honoree") {
    return (
      <p className="mt-3 text-sm leading-relaxed">
        You&apos;re the guest of honor. Your room is reserved, you don&apos;t pay a buy-in, and you can&apos;t be dropped.
      </p>
    );
  }
  if (!viewer.isPayer) {
    const payer = view.viewerParty?.payerName.split(" ")[0] ?? "Your payer";
    return (
      <div className="mt-3">
        <p className="font-serif text-4xl">{money(view.currentShareCents ?? view.viewerParty?.bill?.totalCents ?? 0)}</p>
        <p className="mt-2 text-sm text-muted">For the whole party. {payer} pays and manages the party; you can vote and see the plan.</p>
      </div>
    );
  }
  if (view.currentShareCents == null && view.ifYouCommitCents != null) {
    const n = view.payerCount + 1;
    return (
      <div className="mt-3">
        <p className="font-serif text-4xl">{money(view.ifYouCommitCents)}</p>
        <p className="mt-2 text-sm text-muted">
          If your party commits now, as party {n}
          {n < view.minPayerCount ? `. Unofficial until ${view.minPayerCount} parties commit` : ""}. The number moves as parties commit or drop;
          the range below shows where it lands.
        </p>
      </div>
    );
  }
  const amount = view.currentShareCents ?? viewer.bill?.totalCents ?? 0;
  return (
    <div className="mt-3">
      <p className="font-serif text-4xl">{money(amount)}</p>
      <p className="mt-2 text-sm text-muted">
        {view.payerCount} paying {view.payerCount === 1 ? "party" : "parties"} now. Minimum to book is {view.minPayerCount}. Buy-in is refundable until the stay is booked.
      </p>

    </div>
  );
}

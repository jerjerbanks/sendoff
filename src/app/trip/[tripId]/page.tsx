import Link from "next/link";
import { cancelAction, extendAction } from "@/app/actions";
import { CopyLink, SubmitButton } from "@/components/bits";
import { PaymentGrid } from "@/components/payment-grid";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatWhen, money, utcToZonedInput } from "@/lib/format";
import { pollKindLabel, roleLabel, statusLabel } from "@/lib/labels";
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
    <div className="grid gap-4 md:grid-cols-2">
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
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-accent">
          <Link href={`/trip/${view.id}/vote`}>Polls</Link>
          <Link href={`/trip/${view.id}/spots`}>Beds</Link>
          <Link href={`/trip/${view.id}/sleep`}>Spot setup</Link>
          <Link href={`/trip/${view.id}/book`}>Book stay</Link>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="font-serif text-2xl">{viewer ? `Your number, ${viewer.name.split(" ")[0]}` : "Your number"}</h2>
        <ShareSummary view={view} />
        {view.viewer?.bill ? (
          <p className="mt-2 text-sm text-muted">
            Even split {money(view.viewer.bill.evenCents)} · lodging {money(view.viewer.bill.lodgingCents)} · optional {money(view.viewer.bill.optionalCents)} · yours {money(view.viewer.bill.individualCents)}
          </p>
        ) : null}
        {view.saveIfOneMoreCents !== null ? (
          <p className="mt-2 text-sm">If one more person commits, you save {money(view.saveIfOneMoreCents)}.</p>
        ) : null}
        {view.addIfSomeoneDropsCents !== null ? (
          <p className="text-sm">If someone drops, you pay {money(view.addIfSomeoneDropsCents)} more.</p>
        ) : null}
        {view.viewer ? (
          <p className="mt-2 text-sm font-semibold">
            Bed: {view.claims.some((claim) => claim.userId === view.viewer?.userId && claim.status === "approved") ? "claimed" : view.viewer.role === "honoree" ? "reserved" : "unclaimed"}
          </p>
        ) : null}
        <Link href={`/trip/${view.id}/pay`} className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink">
          {view.nextPayment ? `Next: ${view.nextPayment.name}` : "Payment details"}
        </Link>
      </section>

      <section className="rounded-3xl border border-line bg-card p-4 md:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl">Who&apos;s in</h2>
          <p className="text-sm text-muted">
            {view.payerCount} of {view.minPayerCount} payers · minimum crew {view.minHeadcount}
          </p>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {view.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">
                  {member.name}{" "}
                  <span className="font-normal text-muted">{roleLabel(member.role)}</span>
                </p>
                <p className="text-xs text-muted">{member.contact}</p>
              </div>
              <div className="text-right">
                <Badge tone={member.status === "committed" ? "good" : member.status === "off_trip" ? "bad" : "warn"}>
                  {statusLabel(member.status)}
                </Badge>
                {member.bill?.payer ? (
                  <p className="mt-1 text-sm font-semibold">{money(member.bill.totalCents)}</p>
                ) : member.role === "honoree" ? (
                  <p className="mt-1 text-xs text-muted">Not in the split</p>
                ) : null}
              </div>
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
          <h2 className="font-serif text-2xl">The crew is short</h2>
          <p className="mt-1 text-sm text-muted">
            Extending the deadline does not bring dropped people back. Cancel if you want the test buy-ins to stay refunded.
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
  const amount = view.currentShareCents ?? viewer.bill?.totalCents ?? 0;
  return (
    <div className="mt-3">
      <p className="font-serif text-4xl">{money(amount)}</p>
      <p className="mt-2 text-sm text-muted">
        {view.payerCount} payers now. Minimum to book is {view.minPayerCount}. Buy-in is refundable until the stay is booked.
      </p>
      {view.isOrganizer ? (
        <ul className="mt-3 grid gap-1 text-sm">
          {view.sensitivityRows.map((row) => (
            <li key={row.payers}>
              At {row.payers}: {money(row.totalCents)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

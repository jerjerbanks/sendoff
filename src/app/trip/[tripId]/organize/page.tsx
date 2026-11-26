import Link from "next/link";
import { cancelAction, extendAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { PaymentGrid } from "@/components/payment-grid";
import { Input } from "@/components/ui/input";
import { money, utcToZonedInput } from "@/lib/format";
import { splitModeLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadMemberView } from "@/lib/view";

/** Everything only the organizer does, in one place, so members never see it. */
export default async function OrganizePage({
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
  if (!view.isOrganizer) {
    return <p className="text-sm text-muted">Only the organizer runs these. Use the tabs below for your own steps.</p>;
  }
  const me = view.viewer?.userId ?? "";
  const tools = [
    view.status === "booking_ready"
      ? { href: "/book", title: "Book the stay", line: "Record the booking and the real lodging total.", hot: true }
      : null,
    { href: "/approvals", title: "Room requests", line: view.pendingApprovals ? `${view.pendingApprovals} waiting on you` : "Nothing waiting", hot: view.pendingApprovals > 0 },
    { href: "/sleep", title: "Rooms and beds", line: "Beds, prices, accessibility, holds" },
    { href: "/costs", title: "Cost sheet", line: `Lodging ${money(view.lodgingTotalCents).replace(/\.00$/, "")} · split ${splitModeLabel(view.splitMode).toLowerCase()}` },
    { href: "/party", title: "Parties and travelers", line: `${view.parties.length} parties · ${view.travelerCount} people` },
    { href: "/pay", title: "Buy-in", line: view.buyInAmountCents ? `${money(view.buyInAmountCents).replace(/\.00$/, "")} per party` : "Not open yet", hot: !view.buyInAmountCents },
    { href: "/settings", title: "Settings", line: "Lodging split, age weights, minimum, bed rules" },
    { href: "/metrics", title: "Pilot metrics", line: "Commit rate and time to commit" },
  ].filter(Boolean) as { href: string; title: string; line: string; hot?: boolean }[];

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      <div>
        <p className="ft-lbl clay">Organizer</p>
        <h2 className="ft-h1">Run the trip</h2>
        <p className="mt-1 text-sm text-muted">
          {view.payerCount} of {view.minPayerCount} parties committed. Members don&apos;t see this page.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      {view.underMinimum ? (
        <section className="rounded-3xl border border-warn/40 bg-warn-soft p-5">
          <h3 className="ft-h2">The group is short</h3>
          <p className="mt-1 text-sm">
            Lower the minimum in Settings, extend the deadline, or cancel. Extending doesn&apos;t bring back parties who dropped.
          </p>
          <form action={extendAction} className="mt-3 grid gap-2">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={me} />
            <Input type="datetime-local" name="deadline" required defaultValue={view.buyInDeadline ? utcToZonedInput(view.buyInDeadline) : undefined} aria-label="New deadline" />
            <SubmitButton variant="secondary">Extend the deadline</SubmitButton>
          </form>
          <form action={cancelAction} className="mt-2">
            <input type="hidden" name="tripId" value={view.id} />
            <input type="hidden" name="userId" value={me} />
            <SubmitButton variant="destructive">Cancel the trip</SubmitButton>
          </form>
        </section>
      ) : null}

      <ul className="grid gap-2">
        {tools.map((tool) => (
          <li key={tool.href}>
            <Link
              href={`/trip/${view.id}${tool.href}`}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl px-4 py-3 ${tool.hot ? "border-2 border-accent bg-card" : "border border-line bg-card"}`}
            >
              <span className="min-w-0">
                <span className="block font-semibold">{tool.title}</span>
                <span className="block truncate text-sm text-muted">{tool.line}</span>
              </span>
              <span className="text-clay-ink" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h3 className="mb-2 ft-h2">Who has paid</h3>
        <PaymentGrid view={view} />
        {view.roundingCents > 0 ? (
          <p className="mt-2 text-xs text-muted">Rounding up leaves {money(view.roundingCents)} in the trip pot.</p>
        ) : null}
      </section>
    </div>
  );
}

import { bookStayAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export default async function BookPage({
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
  const lodging = view.costs.find((cost) => cost.splitType === "shared" && cost.category === "lodging");
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Book the stay</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          This is a stub. It records a confirmation number and the actual lodging total. Shares rebase immediately. Buy-ins are refundable until you book, and forfeited after.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <p className="text-sm">
        {view.payerCount} of {view.minPayerCount} payers committed. Estimate {lodging ? money(lodging.amountCents) : "not set"}.
      </p>
      {view.status === "booked" ? (
        <p className="rounded-2xl bg-good-soft px-3 py-3 text-sm text-good">The stay is booked. Buy-ins are no longer refundable.</p>
      ) : null}
      {view.isOrganizer && view.status === "booking_ready" ? (
        <form action={bookStayAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={view.viewer?.userId} />
          <label className="text-sm font-medium">
            Confirmation number
            <Input className="mt-1.5" name="confirmation" placeholder="ABC123" required />
          </label>
          <label className="text-sm font-medium">
            Actual lodging total
            <Input className="mt-1.5" name="actual" inputMode="decimal" defaultValue={lodging ? (lodging.amountCents / 100).toFixed(0) : ""} required />
          </label>
          <SubmitButton>Book stay (test)</SubmitButton>
        </form>
      ) : null}
      {view.status !== "booking_ready" && view.status !== "booked" ? (
        <p className="text-sm text-muted">Booking opens when at least {view.minPayerCount} people have committed.</p>
      ) : null}
    </div>
  );
}

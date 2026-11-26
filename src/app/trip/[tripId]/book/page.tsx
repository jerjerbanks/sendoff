import { bookStayAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { getViewerId } from "@/lib/session";
import { loadMemberView } from "@/lib/view";

export default async function BookPage({
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
  const lodging = view.costs.find((cost) => cost.splitType === "shared" && cost.category === "lodging");
  // A committed party with no bed carries no lodging; booking now would quietly shift it onto everyone else.
  const bedless = view.parties.filter((party) => party.status === "committed" && !party.isHonoreeOnly && party.rooms.length === 0);
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="ft-h1">Book the stay</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          This is a stub. It records a confirmation number and the actual lodging total. Shares rebase immediately. Buy-ins are refundable until you book, and forfeited after.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <p className="text-sm">
        {view.payerCount} of {view.minPayerCount} payers committed. Estimate {lodging ? money(lodging.amountCents) : "not set"}.
      </p>
      {bedless.length > 0 && view.status !== "booked" ? (
        <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          {bedless.map((party) => party.name).join(", ")} {bedless.length === 1 ? "hasn't" : "haven't"} picked a bed yet, so{" "}
          {bedless.length === 1 ? "that party pays" : "those parties pay"} no lodging and everyone else covers it. Ask them to pick a room before you book.
        </p>
      ) : null}
      {view.status === "booked" ? (
        <div className="rounded-2xl bg-good-soft px-3 py-3 text-sm text-good">
          <p>The stay is booked. Buy-ins are no longer refundable.</p>
          {view.rebase.length > 0 ? (
            <ul className="mt-2 grid gap-1">
              {view.rebase.map((row) => (
                <li key={row.userId}>{row.name.split(" ")[0]}: {money(row.beforeCents)} was, {money(row.afterCents)} now</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-muted">Booking closes buy-in and drops anyone who has not committed.</p>
      {view.isOrganizer && view.status === "booking_ready" ? (
        <form action={bookStayAction} className="grid gap-3 ft-panel p-4">
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

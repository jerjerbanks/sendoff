import { bedPolicyAction, simulateDeadlineAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export default async function SettingsPage({
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
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Payments are simulated. No real money moves. Invite code {view.inviteToken}. Crew {view.minHeadcount} to {view.maxHeadcount} payers.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {view.isOrganizer ? (
        <form action={bedPolicyAction} className="grid gap-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-serif text-2xl">Who can move beds</h3>
          <input type="hidden" name="tripId" value={view.id} />
          <input type="hidden" name="userId" value={view.viewer?.userId} />
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="policy" value="member_requests" defaultChecked={view.bedChangePolicy === "member_requests"} />
            <span>Members can ask to share or switch. You approve the request.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="policy" value="locked" defaultChecked={view.bedChangePolicy === "locked"} />
            <span>Locked. Only you move people. Approved beds stay where they are.</span>
          </label>
          <SubmitButton>Save bed policy</SubmitButton>
        </form>
      ) : (
        <p className="text-sm">Bed changes are {view.bedChangePolicy === "locked" ? "locked to the organizer" : "requested, then approved"}.</p>
      )}
      {view.isOrganizer ? (
        <form action={simulateDeadlineAction} className="rounded-3xl border border-line bg-card p-4">
          <input type="hidden" name="tripId" value={view.id} />
          <p className="mb-3 text-sm text-muted">Prototype only. Runs the commit deadline now and drops anyone who has not bought in.</p>
          <SubmitButton variant="secondary">Simulate deadline now</SubmitButton>
        </form>
      ) : null}
      <a href={`/trip/${view.id}/approvals`} className="text-sm font-semibold text-accent">Open the approvals queue</a>
    </div>
  );
}

import { resolveRequestAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { getViewerId } from "@/lib/session";
import { listSpotRequests } from "@/lib/store";
import { loadTripView } from "@/lib/view";

export default async function ApprovalsPage({
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
  const requests = await listSpotRequests(tripId);
  const pending = requests.filter((request) => request.status === "pending");
  const name = (userId: string | null) => view.members.find((member) => member.userId === userId)?.name ?? "Someone";
  const room = (spotId: string | null) => view.spots.find((spot) => spot.id === spotId)?.roomName ?? "a bed";
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-serif text-3xl">Approvals</h2>
        <p className="mt-1 text-sm text-muted">
          {pending.length} open {pending.length === 1 ? "request" : "requests"}. After the stay is booked, approving a move rebases every price.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {view.bedChangePolicy === "locked" && view.status !== "booked" ? (
        <p className="rounded-2xl bg-chip px-3 py-3 text-sm">Beds are locked, so members cannot file new requests. Assign beds from sleeping-spot setup.</p>
      ) : null}
      {pending.length === 0 ? <p className="text-sm text-muted">No pending share or switch requests.</p> : null}
      <ul className="grid gap-3">
        {pending.map((request) => (
          <li key={request.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{name(request.requesterUserId)} wants to {request.type}</p>
            <p className="text-sm text-muted">
              {request.fromSpotId ? `${room(request.fromSpotId)} → ` : ""}
              {room(request.toSpotId)}
              {request.counterpartUserId ? ` · with ${name(request.counterpartUserId)}` : ""}
            </p>
            {view.isOrganizer ? (
              <div className="mt-3 flex gap-2">
                <form action={resolveRequestAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={view.viewer?.userId} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <SubmitButton>Approve</SubmitButton>
                </form>
                <form action={resolveRequestAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={view.viewer?.userId} />
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="decision" value="deny" />
                  <SubmitButton variant="outline">Deny</SubmitButton>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

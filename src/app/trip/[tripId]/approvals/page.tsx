import { resolveRequestAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { getViewerId } from "@/lib/session";
import { listSpotRequests } from "@/lib/store";
import { money } from "@/lib/format";
import { shareComfortLabel } from "@/lib/labels";
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
  const party = (userId: string | null) => view.parties.find((item) => item.payerUserId === userId) ?? null;
  const name = (userId: string | null) => party(userId)?.name ?? view.members.find((member) => member.userId === userId)?.name ?? "Someone";
  const room = (spotId: string | null) => view.spots.find((spot) => spot.id === spotId)?.roomName ?? "a bed";
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="ft-h1">Approvals</h2>
        <p className="mt-1 text-sm text-muted">
          {pending.length} open {pending.length === 1 ? "request" : "requests"}. After the stay is booked, approving a move rebases every price.
          Budgets never appear here.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {view.bedChangePolicy === "locked" && view.status !== "booked" ? (
        <p className="rounded-2xl bg-chip px-3 py-3 text-sm">Beds are locked, so members cannot file new requests. Assign beds from sleeping-spot setup.</p>
      ) : null}
      {pending.length === 0 ? <p className="text-sm text-muted">No pending share or switch requests.</p> : null}
      <ul className="grid gap-3">
        {pending.map((request) => (
          <li key={request.id} className="ft-panel p-4">
            <p className="font-semibold">{name(request.requesterUserId)} wants to {request.type === "share" ? "share a bed" : "switch beds"}</p>
            <p className="text-sm text-muted">
              {request.fromSpotId ? `${room(request.fromSpotId)} → ` : ""}
              {room(request.toSpotId)}
              {request.counterpartUserId ? ` · with ${name(request.counterpartUserId)}` : ""}
              {view.spotPrices?.[request.toSpotId] != null ? ` · about ${money(view.spotPrices[request.toSpotId] ?? 0)} for that bed now` : ""}
            </p>
            {request.type === "share" && request.counterpartUserId ? (
              <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${request.counterpartOptedIn ? "bg-good-soft text-good" : "bg-warn-soft text-warn"}`}>
                {request.counterpartOptedIn
                  ? `${name(request.counterpartUserId)} said yes to sharing.`
                  : `Waiting on ${name(request.counterpartUserId)} to say yes. You can't approve a share until both parties opt in.`}
              </p>
            ) : null}
            {view.isOrganizer ? (
              <ul className="mt-2 grid gap-1 text-xs text-muted">
                {[request.requesterUserId, request.counterpartUserId].filter(Boolean).map((id) => {
                  const item = party(id);
                  if (!item) return null;
                  const notes = item.travelers.filter((traveler) => traveler.needsNotes);
                  return (
                    <li key={id}>
                      Only you see: {item.name} — {shareComfortLabel(item.shareComfort)}
                      {item.shareComfortNote ? ` ("${item.shareComfortNote}")` : ""}
                      {notes.map((traveler) => `; ${traveler.name.split(" ")[0]}: ${traveler.needsNotes}`).join("")}
                    </li>
                  );
                })}
              </ul>
            ) : null}
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

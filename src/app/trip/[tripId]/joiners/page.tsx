import { approveJoinersAction, decideJoinAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { getViewerId } from "@/lib/session";
import { listJoinRequests, type JoinRequestRecord } from "@/lib/store";
import { loadMemberView } from "@/lib/view";

/** Organizer only: people who opened the invite and are waiting to be let in. */
export default async function JoinersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tripId } = await params;
  const { error } = await searchParams;
  const viewerId = await getViewerId();
  const view = await loadMemberView(tripId, viewerId);
  if (!view) return null;
  if (!view.isOrganizer || !viewerId) {
    return <p className="text-sm text-muted">Only the organizer decides who joins.</p>;
  }
  const requests = (await listJoinRequests(tripId, viewerId)) ?? [];
  const waiting = requests.filter((request) => request.status === "pending");
  const declined = requests.filter((request) => request.status === "declined");

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      <div>
        <p className="ft-lbl accent">Organizer</p>
        <h2 className="ft-h1">Who joins</h2>
        <p className="mt-1 text-sm text-muted">
          {view.approveJoiners
            ? "Anyone with the invite link asks first. They see nothing about the trip until you let them in."
            : "Anyone with the invite link joins straight away."}
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}

      <section className="grid gap-3" aria-labelledby="waiting-heading">
        <h3 id="waiting-heading" className="ft-h2">
          Waiting{waiting.length ? ` · ${waiting.length}` : ""}
        </h3>
        {waiting.length === 0 ? <p className="text-sm text-muted">Nobody is waiting.</p> : null}
        <ul className="grid gap-3" aria-label="People waiting to join">
          {waiting.map((request) => (
            <li key={request.userId} className="ft-panel p-4">
              <Person request={request} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Decide tripId={view.id} userId={request.userId} approve label={`Let ${firstName(request.name)} in`} />
                <Decide tripId={view.id} userId={request.userId} approve={false} label="Not this trip" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {declined.length ? (
        <details className="ft-panel p-4">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Turned away · {declined.length}</summary>
          <ul className="mt-2 grid gap-3">
            {declined.map((request) => (
              <li key={request.userId} className="flex flex-wrap items-center justify-between gap-2">
                <Person request={request} />
                <Decide tripId={view.id} userId={request.userId} approve label="Let in after all" secondary />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <section className="grid gap-3 ft-panel p-4">
        <h3 className="ft-h2">New people</h3>
        <form action={approveJoinersAction} className="grid gap-3">
          <input type="hidden" name="tripId" value={view.id} />
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="on" value="yes" defaultChecked={view.approveJoiners} />
            <span>Ask me first. Best once the link might travel beyond the people you sent it to.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="on" value="no" defaultChecked={!view.approveJoiners} />
            <span>Anyone with the link joins straight away. People already waiting still need you to let them in.</span>
          </label>
          <SubmitButton variant="secondary">Save</SubmitButton>
        </form>
      </section>
    </div>
  );
}

function Person({ request }: { request: JoinRequestRecord }) {
  return (
    <span className="min-w-0">
      <span className="block font-semibold">{request.name}</span>
      <span className="block break-all text-sm text-muted">{request.contact}</span>
      <span className="block text-xs text-muted">Asked {askedWhen(request.createdAt)}</span>
    </span>
  );
}

function Decide({ tripId, userId, approve, label, secondary }: { tripId: string; userId: string; approve: boolean; label: string; secondary?: boolean }) {
  return (
    <form action={decideJoinAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="joinerId" value={userId} />
      <input type="hidden" name="decision" value={approve ? "approve" : "decline"} />
      <SubmitButton variant={approve && !secondary ? undefined : "secondary"}>{label}</SubmitButton>
    </form>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "them";
}

function askedWhen(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

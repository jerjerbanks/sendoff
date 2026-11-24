import { addOptionAction, clearLockAction, hideOptionAction, lockOptionAction, pollDeadlineAction, voteAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { fieldClass } from "@/components/ui/input";
import { formatWhen, money, utcToZonedInput } from "@/lib/format";
import { pollKindLabel } from "@/lib/labels";
import { getViewerId } from "@/lib/session";
import { loadTripView } from "@/lib/view";

export default async function VotePage({
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
  const canVote = !!viewer && viewer.status !== "off_trip" && viewer.status !== "invited" && !view.cancelled;

  return (
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-3xl">Approve anything you&apos;d actually do</h2>
        <p className="mt-1 text-sm text-muted">Pick as many options as you want. The organizer locks one winner per poll.</p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {!viewer ? <p className="text-sm">Pick who you&apos;re viewing as before you vote.</p> : null}
      {view.polls.map((poll) => {
        const top = Math.max(1, ...poll.options.map((option) => option.votes));
        return (
          <section key={poll.id} className="rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl">{pollKindLabel(poll.kind)}</h3>
                <p className="text-sm text-muted">
                  {poll.lockedLabel ? `Locked in: ${poll.lockedLabel}` : `Closes ${formatWhen(poll.deadline)}`}
                </p>
              </div>
              {view.isOrganizer && poll.lockedOptionId ? (
                <form action={clearLockAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer?.userId} />
                  <input type="hidden" name="pollId" value={poll.id} />
                  <SubmitButton variant="outline">Clear lock</SubmitButton>
                </form>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2">
              {poll.options.length === 0 ? <p className="text-sm text-muted">No options yet.</p> : null}
              {poll.options.filter((option) => view.isOrganizer || !option.hidden).map((option) => {
                const width = Math.round((option.votes / top) * 100);
                return (
                  <div key={option.id} className="rounded-2xl border border-line p-3">
                    <form action={voteAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="userId" value={viewer?.userId ?? ""} />
                      <input type="hidden" name="optionId" value={option.id} />
                      <button
                        type="submit"
                        disabled={!canVote || poll.closed}
                        className={`block w-full text-left ${option.votedByMe ? "text-accent" : ""} disabled:opacity-60`}
                      >
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="font-semibold">{option.label}</span>
                          <span className="text-sm">{option.votes}</span>
                        </span>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-chip">
                          <span className="block h-full bg-accent" style={{ width: `${width}%` }} />
                        </span>
                        {option.badge ? (
                          <span className="mt-1 block text-xs font-semibold">
                            {option.badge}
                            {option.countLabel ? ` (${option.countLabel})` : ""}
                          </span>
                        ) : null}
                        {option.privateLine ? <span className="mt-1 block text-xs">{option.privateLine}</span> : null}
                        <span className="mt-2 block text-xs text-muted">
                          {option.votedByMe ? "Approved · tap to take it back" : canVote && !poll.closed ? "Tap to approve" : "Voting closed"}
                          {option.estCost > 0 ? ` · estimate ${money(option.estCost)}` : ""}
                        </span>
                      </button>
                    </form>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      {option.link ? (
                        <a className="text-xs font-semibold text-accent" href={option.link} target="_blank" rel="noreferrer">
                          Details
                        </a>
                      ) : <span />}
                      {view.isOrganizer && poll.kind === "destination" && !poll.lockedOptionId ? (
                        <form action={hideOptionAction}>
                          <input type="hidden" name="tripId" value={view.id} />
                          <input type="hidden" name="userId" value={viewer?.userId} />
                          <input type="hidden" name="optionId" value={option.id} />
                          <input type="hidden" name="hidden" value={option.hidden ? "no" : "yes"} />
                          <SubmitButton variant="outline">{option.hidden ? "Unhide" : "Hide from the vote"}</SubmitButton>
                        </form>
                      ) : null}
                      {view.isOrganizer && !poll.lockedOptionId ? (
                        <form action={lockOptionAction}>
                          <input type="hidden" name="tripId" value={view.id} />
                          <input type="hidden" name="userId" value={viewer?.userId} />
                          <input type="hidden" name="optionId" value={option.id} />
                          <SubmitButton variant="secondary">Lock this in</SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {view.isOrganizer ? (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 [&>*]:min-w-0">
                <form action={addOptionAction} className="grid gap-2">
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer?.userId} />
                  <input type="hidden" name="pollId" value={poll.id} />
                  <Input name="label" placeholder="Add an option" required />
                  <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
                    <Input name="estCost" inputMode="decimal" placeholder="Estimate $" />
                    <Input name="link" placeholder="https://…" />
                  </div>
                  <SubmitButton variant="outline">Add option</SubmitButton>
                </form>
                <form action={pollDeadlineAction} className="flex gap-2 [&>*]:min-w-0">
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={viewer?.userId} />
                  <input type="hidden" name="pollId" value={poll.id} />
                  <input className={`${fieldClass} min-w-0 flex-1`} type="datetime-local" name="deadline" defaultValue={utcToZonedInput(poll.deadline)} required />
                  <SubmitButton variant="secondary">Set deadline</SubmitButton>
                </form>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

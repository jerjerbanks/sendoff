import { addOptionAction, clearLockAction, hideOptionAction, lockOptionAction, pollDeadlineAction, voteAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { fieldClass } from "@/components/ui/input";
import { formatDay, money, utcToZonedInput } from "@/lib/format";
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

  const anyBadge = view.polls.some((poll) => poll.options.some((option) => option.badge));
  const question = (kind: string) => (kind === "destination" ? "Where are we going?" : kind === "dates" ? "When?" : "What should we do?");

  return (
    <div className="grid grid-cols-1 gap-8 [&>*]:min-w-0">
      <div>
        <h2 className="font-serif text-4xl leading-none">Vote</h2>
        <p className="mt-2 text-sm text-muted">
          Tap everything you&apos;d actually do.{" "}
          {anyBadge ? "Your budget stays private — the tags only say whether an option fits the group." : ""}
        </p>
      </div>
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {!viewer ? <p className="text-sm">Pick who you&apos;re viewing as before you vote.</p> : null}
      {view.polls.map((poll) => {
        const visible = poll.options.filter((option) => view.isOrganizer || !option.hidden);
        return (
          <section key={poll.id} aria-labelledby={`q-${poll.id}`}>
            <h3 id={`q-${poll.id}`} className="font-serif text-3xl leading-tight">
              {question(poll.kind)}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {poll.lockedLabel ? `Decided: ${poll.lockedLabel}` : poll.closed ? "Voting closed" : `Closes ${formatDay(poll.deadline)}`}
            </p>
            <ul className="mt-3 grid gap-2">
              {visible.length === 0 ? <li className="text-sm text-muted">No options yet.</li> : null}
              {visible.map((option) => {
                const won = poll.lockedOptionId === option.id;
                const on = option.votedByMe;
                const disabled = !canVote || poll.closed;
                const tone = won || on ? "bg-accent text-accent-ink border-accent" : "bg-card border-line";
                const sub = won || on ? "text-accent-ink/75" : "text-muted";
                return (
                  <li key={option.id} className={poll.lockedOptionId && !won ? "opacity-50" : ""}>
                    <form action={voteAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="userId" value={viewer?.userId ?? ""} />
                      <input type="hidden" name="optionId" value={option.id} />
                      <button
                        type="submit"
                        disabled={disabled}
                        aria-pressed={on}
                        className={`block w-full rounded-3xl border px-4 py-3 text-left transition active:scale-[0.99] disabled:cursor-default ${tone}`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-xl font-semibold">{option.label}</span>
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                              won || on ? "bg-accent-ink text-accent" : "border border-line"
                            }`}
                            aria-hidden
                          >
                            {won || on ? "✓" : ""}
                          </span>
                        </span>
                        <span className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm ${sub}`}>
                          {option.badge ? (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                won || on ? "bg-accent-ink/10" : option.badge === "Fits everyone" ? "bg-good-soft text-good" : option.badge === "Fits most" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"
                              }`}
                            >
                              {option.badge}
                            </span>
                          ) : null}
                          <span>
                            {option.votes} {option.votes === 1 ? "vote" : "votes"}
                          </span>
                          {poll.kind === "destination" && option.estCost > 0 ? <span>· house ~{money(option.estCost).replace(/\.00$/, "")}</span> : null}
                          {option.hidden ? <span>· hidden from members</span> : null}
                          {won ? <span className="font-semibold">· decided</span> : null}
                        </span>
                        {option.privateLine ? (
                          <span className={`mt-2 block text-sm ${won || on ? "" : "text-ink"}`}>
                            <span className={`mr-1 text-xs font-semibold uppercase tracking-wide ${sub}`}>Only you see this:</span>
                            {option.privateLine}
                          </span>
                        ) : null}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            {view.isOrganizer ? (
              <details className="mt-3 rounded-2xl border border-dashed border-line">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted">Organizer: manage this poll</summary>
                <div className="grid grid-cols-1 gap-4 px-4 pb-4 [&>*]:min-w-0">
                  {poll.lockedOptionId ? (
                    <form action={clearLockAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="userId" value={viewer?.userId} />
                      <input type="hidden" name="pollId" value={poll.id} />
                      <SubmitButton variant="outline">Reopen the vote</SubmitButton>
                    </form>
                  ) : (
                    <ul className="grid gap-2">
                      {poll.options.map((option) => (
                        <li key={option.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{option.label}</span>
                          <span className="flex gap-2">
                            {poll.kind === "destination" ? (
                              <form action={hideOptionAction}>
                                <input type="hidden" name="tripId" value={view.id} />
                                <input type="hidden" name="userId" value={viewer?.userId} />
                                <input type="hidden" name="optionId" value={option.id} />
                                <input type="hidden" name="hidden" value={option.hidden ? "no" : "yes"} />
                                <SubmitButton variant="outline">{option.hidden ? "Unhide" : "Hide"}</SubmitButton>
                              </form>
                            ) : null}
                            <form action={lockOptionAction}>
                              <input type="hidden" name="tripId" value={view.id} />
                              <input type="hidden" name="userId" value={viewer?.userId} />
                              <input type="hidden" name="optionId" value={option.id} />
                              <SubmitButton variant="secondary">Lock in</SubmitButton>
                            </form>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
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
                    <input className={`${fieldClass} min-w-0 flex-1`} type="datetime-local" name="deadline" defaultValue={utcToZonedInput(poll.deadline)} required aria-label="Voting closes" />
                    <SubmitButton variant="secondary">Set</SubmitButton>
                  </form>
                </div>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}


import Link from "next/link";
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
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { tripId } = await params;
  const { error, q } = await searchParams;
  const view = await loadTripView(tripId, await getViewerId());
  if (!view) return null;
  const viewer = view.viewer;
  const canVote = !!viewer && viewer.status !== "off_trip" && viewer.status !== "invited" && !view.cancelled;

  const anyBadge = view.polls.some((poll) => poll.options.some((option) => option.badge));
  const tabName = (kind: string) => (kind === "destination" ? "Where" : kind === "dates" ? "Dates" : "Activities");
  const title = (kind: string): [string, string] =>
    kind === "destination" ? ["Where should", "we go?"] : kind === "dates" ? ["When works", "for everyone?"] : ["What should we", "do there?"];
  // One poll at a time. Default to the first one still open, else the first.
  const poll = view.polls.find((item) => item.kind === q) ?? view.polls.find((item) => !item.lockedLabel && !item.closed) ?? view.polls[0];
  const voters = view.members.filter((member) => member.status !== "off_trip" && member.status !== "declined" && member.status !== "invited").length;
  const destination = view.polls.find((item) => item.kind === "destination");

  return (
    <div className="grid grid-cols-1 gap-6 [&>*]:min-w-0">
      {view.polls.length > 1 ? (
        <nav className="ft-seg" aria-label="Polls">
          {view.polls.map((item) => (
            <Link key={item.id} href={`?q=${item.kind}`} scroll={false} aria-current={item.id === poll?.id ? "page" : undefined}>
              {tabName(item.kind)}
            </Link>
          ))}
        </nav>
      ) : null}
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}
      {!viewer ? <p className="ft-lead">Pick who you&apos;re viewing as before you vote.</p> : null}
      {poll ? (() => {
        const visible = poll.options.filter((option) => view.isOrganizer || !option.hidden);
        const leaderVotes = Math.max(0, ...visible.map((option) => option.votes));
        const [one, two] = title(poll.kind);
        return (
          <section key={poll.id} aria-labelledby={`q-${poll.id}`}>
            <h1 id={`q-${poll.id}`} className="ft-h1 text-[48px]">
              {one}
              <br />
              <i>{two}</i>
            </h1>
            <p className="ft-lead mt-4">
              {poll.lockedLabel
                ? `Decided: ${poll.lockedLabel}. `
                : poll.closed
                  ? "Voting is closed. "
                  : poll.kind !== "destination" && poll.kind !== "dates"
                    ? "Pick as many as you like. Children vote with a parent. "
                    : "Tap every one you'd actually do. "}
              {!poll.lockedLabel && !poll.closed ? (
                <>
                  Closes <span className="ft-mono text-[15px] uppercase">{formatDay(poll.deadline)}</span>.
                </>
              ) : null}
            </p>
            {anyBadge ? <p className="ft-meta mt-2">Your budget stays private. Tags only say whether an option fits the group.</p> : null}
            <ul className="ft-rule mt-5">
              {visible.length === 0 ? <li className="ft-meta py-4">No options yet.</li> : null}
              {visible.map((option, index) => {
                const won = poll.lockedOptionId === option.id;
                const on = option.votedByMe;
                const leading = !poll.lockedOptionId && option.votes > 0 && option.votes === leaderVotes;
                const disabled = !canVote || poll.closed;
                const filled = voters > 0 ? Math.round((Math.min(option.votes, voters) / voters) * 10) : 0;
                return (
                  <li key={option.id} className={poll.lockedOptionId && !won ? "opacity-60" : ""}>
                    <form action={voteAction}>
                      <input type="hidden" name="tripId" value={view.id} />
                      <input type="hidden" name="userId" value={viewer?.userId ?? ""} />
                      <input type="hidden" name="optionId" value={option.id} />
                      <button
                        type="submit"
                        disabled={disabled}
                        aria-pressed={on}
                        className={`relative grid w-full grid-cols-[40px_minmax(0,1fr)_auto] gap-x-3 py-5 text-left transition-[transform,box-shadow] duration-[var(--dur-snappy)] ease-[var(--spring-snappy)] active:scale-[0.99] disabled:cursor-default disabled:active:scale-100 ${
                          on || won
                            ? "z-10 -mx-3 w-[calc(100%+24px)] rounded-2xl border border-line bg-card px-3 shadow-[var(--shadow-2)] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-sm before:bg-clay"
                            : "border-b border-line"
                        }`}
                      >
                        <span className={`ft-mono pt-1 text-[15px] ${on || won ? "text-clay-ink" : "text-muted"}`}>{String(index + 1).padStart(2, "0")}</span>
                        <span className="min-w-0">
                          <span className="block text-[18px] font-semibold leading-snug">{option.label}</span>
                          <span className="ft-meta mt-0.5 block">
                            {[
                              poll.kind === "destination" && option.estCost > 0 ? `house ~${money(option.estCost).replace(/\.00$/, "")}` : null,
                              option.hidden ? "hidden from members" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || null}
                          </span>
                          <span className={`ft-vbar mt-3 max-w-[280px] ${on ? "mine" : ""}`} aria-hidden>
                            {Array.from({ length: 10 }, (_, i) => (
                              <i key={i} className={i < filled ? "on" : ""} style={{ ["--i" as string]: i }} />
                            ))}
                          </span>
                          <span className="mt-2.5 flex flex-wrap items-center gap-2">
                            <span className="ft-mono text-[15px] text-ink-2">
                              {option.votes}/{voters}
                              <span className="sr-only"> voted for this</span>
                            </span>
                            {won ? (
                              <span className="ft-chip pine">
                                <span className="ft-dot" aria-hidden />
                                DECIDED
                              </span>
                            ) : leading ? (
                              <span className="ft-chip sun">
                                <span className="ft-dot !bg-sun !shadow-[0_0_0_1px_var(--sun-ink)]" aria-hidden />
                                LEADING
                              </span>
                            ) : null}
                            {option.badge ? (
                              <span className={`ft-chip ${option.badge === "Fits everyone" ? "pine" : option.badge === "Fits most" ? "warn" : "bad"}`}>{option.badge}</span>
                            ) : null}
                            {on ? <span className="ft-mono text-[15px] font-medium tracking-[0.06em] text-clay-ink">YOURS</span> : null}
                          </span>
                          {option.privateLine ? (
                            <span className="mt-2 block text-[15px] text-ink-2">
                              <span className="ft-lbl mr-1">Only you:</span>
                              {option.privateLine}
                            </span>
                          ) : null}
                        </span>
                        <span className={`ft-check mt-0.5 ${on || won ? "on" : ""}`} aria-hidden>
                          {on || won ? (
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                              <path d="M4 10.5 8.2 14.5 16 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            {view.isOrganizer ? (
              <details className="mt-3 rounded-2xl border border-dashed border-line-strong">
                <summary className="ft-summary px-4 text-[15px] font-medium text-ink-2">Organizer: manage this poll</summary>
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
      })() : null}
      {destination && destination.id !== poll?.id && destination.lockedLabel ? (
        <section className="ft-panel">
          <div className="ft-panel-h">
            <span className="ft-lbl ink">Destination</span>
            <span className="ft-live text-pine">
              <span className="ft-dot" aria-hidden />
              DECIDED
            </span>
          </div>
          <p className="flex items-baseline justify-between gap-3 px-4 py-4">
            <span className="ft-h1 text-[34px]">{destination.lockedLabel}</span>
            <span className="ft-mono text-[15px] text-ink-2">
              {destination.options.find((option) => option.id === destination.lockedOptionId)?.votes ?? 0}/{voters}
            </span>
          </p>
        </section>
      ) : null}
    </div>
  );
}


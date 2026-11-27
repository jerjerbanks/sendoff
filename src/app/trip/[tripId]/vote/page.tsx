import Link from "next/link";
import { Spot } from "@/components/spot";
import { addOptionAction, clearLockAction, hideOptionAction, lockOptionAction, pollDeadlineAction, voteAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { fieldClass } from "@/components/ui/input";
import { formatDay, money, utcToZonedInput } from "@/lib/format";
import { extraPriceLine } from "@/lib/extra-price";
import { getViewerId } from "@/lib/session";
import { loadMemberView } from "@/lib/view";
import { optionScenes, sceneSrc, sceneThumb } from "@/lib/scene";
import { ThemeIcon } from "@/components/theme-icon";
import { activeTripTheme, THEME_INFO, themeForTrip } from "@/lib/trip-theme";
import { THEME_PREVIEW_ON } from "@/lib/vibe-flag";

export default async function VotePage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; q?: string; "ft-theme"?: string }>;
}) {
  const { tripId } = await params;
  const { error, q, "ft-theme": themePreview } = await searchParams;
  const view = await loadMemberView(tripId, await getViewerId());
  if (!view) return null;
  const theme = activeTripTheme(themeForTrip(view), themePreview, THEME_PREVIEW_ON);
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
  // Voters see what each extra costs a person before anything is locked in.
  const extras = view.costs.filter((cost) => cost.splitType === "optional");

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
        // LEADING needs a real lead: at least 2 votes, half the voters, and no tie at the top.
        const tiedAtTop = visible.filter((option) => option.votes === leaderVotes).length > 1;
        const leadIsReal = !tiedAtTop && leaderVotes >= Math.max(2, Math.ceil(voters / 2));
        const staggered = new Set(view.polls.filter((item) => !item.closed && !item.lockedOptionId).map((item) => item.deadline.slice(0, 10))).size > 1;
        const thumbs = poll.kind === "destination" ? optionScenes(visible.map((option) => option.label)) : [];
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
                  {staggered ? " Where closes first, then when, then what we'll do, so each vote can build on the last." : null}
                </>
              ) : null}
            </p>
            {anyBadge ? <p className="ft-meta mt-2">Your budget stays private. Tags only say whether an option fits the group.</p> : null}
            {/* v7 theme notice: flavour line only, in the trip theme's tint with its icon. */}
            <p className="ft-notice ft-notice-theme mt-4">
              <ThemeIcon theme={theme} />
              <span>{THEME_INFO[theme].note}</span>
            </p>
            <ul className="ft-rule mt-5">
              {visible.length === 0 ? (
                <li className="py-6 text-center">
                  <Spot name="empty-tent" className="w-[180px]" />
                  <p className="ft-h2 mt-3">{poll.kind === "destination" ? THEME_INFO[theme].empty : "No options yet."}</p>
                  <p className="ft-meta mt-1.5">
                    {view.isOrganizer
                      ? `Add ${poll.kind === "destination" ? "two or three places" : poll.kind === "dates" ? "two or three date ranges" : "a few things to do"} below. Your group taps every one they'd do.`
                      : `${view.organizerShortName || "The organizer"} hasn't added any yet. Check back soon.`}
                  </p>
                </li>
              ) : null}
              {visible.map((option, index) => {
                const won = poll.lockedOptionId === option.id;
                const on = option.votedByMe;
                const leading = !poll.lockedOptionId && leadIsReal && option.votes === leaderVotes;
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
                        className={`relative grid w-full ${poll.kind === "destination" ? "grid-cols-[64px_minmax(0,1fr)_auto]" : "grid-cols-[40px_minmax(0,1fr)_auto]"} gap-x-3 py-5 text-left transition-[transform,box-shadow] duration-[var(--dur-snappy)] ease-[var(--spring-snappy)] active:scale-[0.99] disabled:cursor-default disabled:active:scale-100 ${
                          on || won
                            ? "z-10 -mx-3 w-[calc(100%+24px)] rounded-2xl border border-line bg-card px-3 shadow-[var(--shadow-2)] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-sm before:bg-accent"
                            : "border-b border-line"
                        }`}
                      >
                        {poll.kind === "destination" ? (
                          // Decorative: an illustrated thumbnail so places are easy to tell apart (v6.1). The label names the place.
                          <span
                            className={`ft-vthumb ${on || won ? "on" : ""}`}
                            style={{ backgroundImage: `url(${sceneSrc(thumbs[index] ?? "lake").day})`, ...sceneThumb(thumbs[index] ?? "lake") }}
                            aria-hidden
                          />
                        ) : (
                          <span className={`ft-mono pt-1 text-[15px] ${on || won ? "text-accent-ink" : "text-muted"}`}>{String(index + 1).padStart(2, "0")}</span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-[18px] font-semibold leading-snug">{option.label}</span>
                          <span className="ft-meta mt-0.5 block">
                            {[
                              poll.kind === "destination" && option.estCost > 0 ? `house ~${money(option.estCost).replace(/\.00$/, "")}` : null,
                              poll.kind !== "destination" && poll.kind !== "dates" && option.estCost > 0 ? `about ${money(option.estCost).replace(/\.00$/, "")}` : null,
                              option.perPersonCents != null ? `${money(option.perPersonCents).replace(/\.00$/, "")} a person${view.isDemo ? " · demo estimate" : ""}` : null,
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
                            {on ? <span className="ft-mono text-[15px] font-medium tracking-[0.06em] text-accent-ink">YOURS</span> : null}
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
            {poll.kind === "activity" && extras.length > 0 ? (
              <div className="mt-6">
                <h2 className="ft-lbl">Optional extras · only who&apos;s in pays</h2>
                <ul className="ft-rule mt-2">
                  {extras.map((cost) => (
                    <li key={cost.id} className="flex items-baseline justify-between gap-3 border-b border-line py-3">
                      <span className="min-w-0 text-[16px] font-semibold leading-snug">{cost.label}</span>
                      <span className="ft-meta shrink-0 text-right">
                        {extraPriceLine({ amountCents: cost.amountCents, agePrices: cost.agePrices, goingCount: cost.optInTravelerIds.length })}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href={`/trip/${view.id}/costs`} className="ft-link mt-2 inline-block text-[15px]">
                  Opt in on Costs
                </Link>
              </div>
            ) : null}
            {view.isOrganizer ? (
              <details
                className="mt-3 rounded-2xl border border-dashed border-line-strong"
                open={(!poll.lockedOptionId && visible.length < 3 && (view.status === "planning" || view.status === "voting")) || undefined}
              >
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
                    <label className="text-sm font-medium">
                      {poll.kind === "destination" ? "A place" : poll.kind === "dates" ? "A date range" : "Something to do"}
                      <Input
                        className="mt-1.5"
                        name="label"
                        placeholder={poll.kind === "destination" ? "Lake Geneva, WI" : poll.kind === "dates" ? "Jun 12–15, 2027" : "Boat day"}
                        required
                      />
                    </label>
                    {poll.kind !== "dates" ? (
                      <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
                        <label className="text-sm font-medium">
                          {poll.kind === "destination" ? "House total (optional)" : "Cost (optional)"}
                          <Input className="mt-1.5" name="estCost" inputMode="decimal" placeholder="$" />
                        </label>
                        <label className="text-sm font-medium">
                          Link (optional)
                          <Input className="mt-1.5" name="link" placeholder="https://…" />
                        </label>
                      </div>
                    ) : null}
                    <SubmitButton variant="outline">Add option</SubmitButton>
                  </form>
                  <p className="text-sm font-medium">Voting closes (US Central)</p>
                  <form action={pollDeadlineAction} className="-mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input type="hidden" name="tripId" value={view.id} />
                    <input type="hidden" name="userId" value={viewer?.userId} />
                    <input type="hidden" name="pollId" value={poll.id} />
                    <input className={`${fieldClass} min-w-0`} type="datetime-local" name="deadline" defaultValue={utcToZonedInput(poll.deadline)} required aria-label="Voting closes" />
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


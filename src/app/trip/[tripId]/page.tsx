import Link from "next/link";
import { requestOrigin } from "@/lib/origin";
import { CopyLink } from "@/components/bits";
import { ShareLauncher } from "@/components/share-launcher";
import { Arrow, HeadcountMeter } from "@/components/motion";
import { money } from "@/lib/format";
import { ageBandLabel, honoreeRoleLabel } from "@/lib/labels";
import { meterCells, meterSub, tripMeter } from "@/lib/meter";
import type { JourneyStep, NextStep } from "@/lib/next-step";
import { getViewerId } from "@/lib/session";
import { loadMemberView, type PartyView, type TripView } from "@/lib/view";
import { ThemeIcon } from "@/components/theme-icon";
import { activeTripTheme, themeChipLabel, themeForTrip, type TripTheme } from "@/lib/trip-theme";
import { THEME_PREVIEW_ON } from "@/lib/vibe-flag";

/** S3, rebuilt around one question: what should I do next? Everything else is one tap away. */
export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ error?: string; "ft-theme"?: string }>;
}) {
  const { tripId } = await params;
  const { error, "ft-theme": themePreview } = await searchParams;
  const view = await loadMemberView(tripId, await getViewerId());
  if (!view) return null;
  const theme = activeTripTheme(themeForTrip(view), themePreview, THEME_PREVIEW_ON);
  const origin = await requestOrigin();

  return (
    <div className="grid grid-cols-1 gap-10 [&>*]:min-w-0">
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}
      <div className="grid gap-6">
        <TripTrail view={view} />
        {/* TODO(map): the v4 pack opens Plan with a lake map. Deferred (Jeremy, Nov 24): trips have no
            coordinates yet, so there is no map slot here. No tiles, no map API until that's decided. */}
        <Hero view={view} theme={theme} />
        {view.journey.some((step) => step.state === "current" || step.state === "todo") ? <Journey tripId={view.id} steps={view.journey} /> : null}
      </div>
      {/* The meter comes before the next step, as in 01-trip-home: count first, then the ask. */}
      <div className="grid gap-6">
        <WhoCard view={view} />
        <NextStepCard tripId={view.id} step={view.nextStep} />
      </div>
      <PlanCard view={view} theme={theme} />
      {view.isOrganizer ? <OrganizerCard view={view} /> : null}
      {!view.cancelled && !view.lockedIn ? (
        <section id="invite" className="ft-panel scroll-mt-20">
          <div className="ft-panel-h">
            <span className="ft-lbl ink">Bring people in</span>
            <span className="ft-kbd">{view.inviteToken}</span>
          </div>
          <div className="p-4">
            <p className="ft-meta">One link. They join, add who they&apos;re bringing, and see their number. No app to install.</p>
            <ShareLauncher
              origin={origin}
              view={{
                id: view.id,
                name: view.name,
                inviteToken: view.inviteToken,
                organizerName: view.organizerName,
                guestName: view.guestName,
                buyInDeadline: view.buyInDeadline,
                currentShareCents: view.currentShareCents,
              }}
            />
            <details className="mt-2 border-t border-line">
              <summary className="ft-summary text-[15px] font-medium text-ink-2">Show the link</summary>
              <div className="pb-1">
                <CopyLink path={`/join/${view.inviteToken}`} />
              </div>
            </details>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** The invitation: who's asking, where, and the three numbers that matter, as mono kv rows. */
function Hero({ view, theme }: { view: TripView; theme: TripTheme }) {
  const dates = view.polls.find((poll) => poll.kind === "dates");
  const when = dates?.lockedLabel ?? dates?.options.filter((option) => option.votes > 0).sort((a, b) => b.votes - a.votes)[0]?.label ?? null;
  const decided = !!view.polls.find((poll) => poll.kind === "destination")?.lockedLabel;
  const place = view.place.split(",")[0];
  const leading = !decided && view.place !== view.name;
  const party = view.viewerParty;
  const share = view.currentShareCents ?? view.ifYouCommitCents ?? party?.bill?.totalCents ?? null;
  const households = view.parties.filter((item) => item.status !== "off_trip" && item.status !== "declined").length;
  return (
    <section>
      <p className="ft-lbl accent">
        {view.subtitle}
        {view.organizerName ? ` · from ${view.organizerName}` : ""}
      </p>
      <h1 className="ft-display mt-3">
        {decided ? "We're going to" : leading ? "Leaning toward" : view.name}
        <br />
        <i>{decided || leading ? `${place}${decided ? "." : "?"}` : "Where to?"}</i>
      </h1>
      <p className="mt-4">
        <span className="ft-chip ft-chip-theme">
          <ThemeIcon theme={theme} size={16} />
          {themeChipLabel(theme, view)}
        </span>
      </p>
      <dl className="ft-rule mt-6">
        <div className="ft-kv">
          <dt>Dates</dt>
          <dd className="v">{when ?? <span className="text-ink-2">Still voting</span>}</dd>
        </div>
        <div className="ft-kv">
          <dt>Going</dt>
          <dd className="v">
            {view.travelerCount} {view.travelerCount === 1 ? "person" : "people"}
            <span className="ft-meta"> · {households} {households === 1 ? "household" : "households"}</span>
          </dd>
        </div>
        {share != null && view.viewer?.role !== "honoree" ? (
          <div className="ft-kv">
            <dt>Your share</dt>
            <dd className="flex items-baseline justify-between gap-3">
              <Link href={`/trip/${view.id}/costs`} className="ft-mono inline-flex min-h-11 items-center text-[22px] font-semibold text-accent-ink underline decoration-1 underline-offset-4">
                {money(share).replace(/\.00$/, "")}
              </Link>
              {party ? (
                <span className="ft-meta truncate">
                  {party.name} · {party.travelers.length} {party.travelers.length === 1 ? "person" : "people"}
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

const stepHref: Record<JourneyStep["key"], string> = {
  party: "/party",
  budget: "/budget",
  vote: "/vote",
  commit: "/pay",
  room: "/spots",
};

/**
 * v6.1 progress trail: where the whole trip stands, from data the page already has.
 * Done is a sun-gold segment, the current step a half-filled one. Words carry the state too.
 */
function TripTrail({ view }: { view: TripView }) {
  const active = view.parties.filter((party) => party.status !== "off_trip" && party.status !== "declined");
  const done = [
    active.length >= 2,
    view.polls.length === 0 || view.polls.every((poll) => poll.closed || !!poll.lockedOptionId),
    view.lockedIn || view.status === "booked",
  ];
  const current = done.findIndex((item) => !item);
  const labels = ["Invite", "Vote", "Commit"];
  return (
    <ol className="ft-trail" aria-label={current < 0 ? "Trip progress: all steps done" : `Trip progress: ${labels[current]} is next`}>
      {labels.map((label, index) => {
        const state = done[index] ? "done" : index === current ? "now" : "todo";
        return (
          <li key={label} className={state} aria-current={state === "now" ? "step" : undefined}>
            <i aria-hidden />
            <span>
              {label}
              <span className="sr-only">{state === "done" ? ", done" : state === "now" ? ", in progress" : ", not started"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Your steps as numbered mono cells. Done is sun-gold with a check (progress), current is the lake accent colour. */
function Journey({ tripId, steps }: { tripId: string; steps: JourneyStep[] }) {
  const done = steps.filter((step) => step.state === "done" || step.state === "skipped").length;
  return (
    <nav aria-label={`Your progress: ${done} of ${steps.length} steps`}>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const tone =
            step.state === "done"
              ? "border-joy-meter bg-sun-tint text-sun-ink"
              : step.state === "current"
                ? "border-accent bg-accent-tint text-accent-ink"
                : "border-line-strong bg-card text-muted";
          return (
            <li key={step.key}>
              <Link
                href={`/trip/${tripId}${stepHref[step.key]}`}
                aria-current={step.state === "current" ? "step" : undefined}
                className={`flex min-h-12 flex-col justify-center rounded-sm border px-2 ${tone}`}
              >
                <span className="ft-mono text-[14px]">
                  {step.state === "done" ? "✓" : step.state === "skipped" ? "–" : String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate text-[14px] font-medium">{step.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function NextStepCard({ tripId, step }: { tripId: string; step: NextStep }) {
  const dot = step.tone === "bad" ? "error" : step.tone === "warn" ? "warn" : step.tone === "action" ? "accent" : "";
  return (
    <section className={`rise-in ft-panel p-5 ${step.tone === "bad" ? "border-bad/40" : ""}`}>
      <p className="ft-live">
        <span className={`ft-dot ${dot}`} aria-hidden />
        <span className={step.tone === "bad" ? "text-bad" : "text-accent-ink"}>{step.eyebrow.toUpperCase()}</span>
      </p>
      <h2 className="ft-h2 mt-3">{step.title}</h2>
      <p className="ft-lead mt-1.5">{step.body}</p>
      {step.cta && step.href !== null ? (
        <Link href={`/trip/${tripId}${step.href}`} className="ft-btn mt-5">
          <span>{step.cta}</span>
          <Arrow />
        </Link>
      ) : null}
    </section>
  );
}

function statusWord(party: PartyView): { text: string; tone: string; dot: string } {
  if (party.isHonoreeOnly) return { text: "Honored", tone: "text-sun-ink", dot: "lake" };
  if (party.status === "committed") return { text: "In", tone: "text-pine", dot: "" };
  if (party.status === "joined") return { text: "Deciding", tone: "text-accent-ink", dot: "accent" };
  if (party.status === "invited") return { text: "Invited", tone: "text-muted", dot: "open" };
  if (party.status === "declined") return { text: "Declined", tone: "text-muted", dot: "open" };
  return { text: "Dropped", tone: "text-bad", dot: "error" };
}

function WhoCard({ view }: { view: TripView }) {
  const need = view.minPayerCount;
  const active = view.parties.filter((party) => party.status !== "off_trip" && party.status !== "declined");
  const gone = view.parties.length - active.length;
  return (
    <section>
      <h2 className="ft-sec">
        <span className="ix">§1</span>
        <span className="ft-h2">Who&apos;s coming</span>
      </h2>
      <div className="mt-5">
        <HeadcountMeter
          cells={meterCells(view)}
          need={need}
          unit="households"
          sub={meterSub(tripMeter(view), "households", `${view.travelerCount} ${view.travelerCount === 1 ? "person" : "people"}`)}
          booked={view.lockedIn || view.status === "booked"}
        />
      </div>
      <ul className="mt-5 border-t border-line">
        {active.map((party) => {
          const word = statusWord(party);
          const mine = party.payerUserId === view.viewerParty?.payerUserId;
          const showPeople = party.travelers.length > 1 || party.travelers.some((traveler) => traveler.isHonoree);
          const row = (
            <span className="flex min-h-14 items-center gap-3.5">
              <span className={`ft-dot ${word.dot}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold">
                  {party.name}
                  <span className="ft-meta font-normal">
                    {" · "}
                    {party.isHonoreeOnly ? "covered" : party.travelers.length}
                    {mine ? " · you" : ""}
                  </span>
                </span>
                {party.rooms.length > 0 ? <span className="ft-meta block truncate">{party.rooms.join(", ")}</span> : null}
              </span>
              <span className={`ft-mono text-[15px] font-medium uppercase tracking-[0.06em] ${word.tone}`}>{word.text}</span>
            </span>
          );
          return (
            <li key={party.payerUserId} className="border-b border-line">
              {showPeople ? (
                <details>
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">{row}</summary>
                  <ul className="flex flex-wrap gap-1.5 pb-3 pl-6">
                    {party.travelers.map((traveler) => (
                      <li key={traveler.id} className="ft-chip font-sans">
                        {traveler.name.split(" ")[0]}
                        <span className="text-muted">
                          {traveler.isHonoree ? honoreeRoleLabel(traveler.honoreeRole) : ageBandLabel(traveler.ageBand)}
                          {!traveler.hasAccount ? " · no app" : ""}
                        </span>
                        {view.isOrganizer && traveler.needsNotes ? <span className="text-warn">· note</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
      {gone > 0 ? (
        <p className="ft-meta mt-2">
          {gone} {gone === 1 ? "party is" : "parties are"} off the trip.
        </p>
      ) : null}
    </section>
  );
}

function PlanCard({ view, theme }: { view: TripView; theme: TripTheme }) {
  const open = view.polls.some((poll) => !poll.lockedLabel && !poll.closed);
  return (
    <section>
      <h2 className="ft-sec">
        <span className="ix">§2</span>
        <span className="ft-h2 flex-1">The plan</span>
        <Link href={`/trip/${view.id}/vote`} className="ft-link min-w-11 justify-center">
          {open ? "Vote" : "Polls"}
        </Link>
      </h2>
      {/* v7: the plan card takes the trip theme's wash, pattern and ink. */}
      <div className="ft-card-theme mt-3 px-4 pt-3 pb-1">
        <p className="flex items-center justify-between gap-3">
          <span className="ft-lbl ft-theme-ink">Where things stand</span>
          <ThemeIcon theme={theme} className="ft-theme-ink" />
        </p>
      <dl className="mt-1">
        {view.polls.map((poll) => {
          const leader = poll.options.filter((option) => !option.hidden).slice().sort((a, b) => b.votes - a.votes)[0];
          return (
            <div key={poll.id} className="ft-kv">
              <dt>{poll.kind === "destination" ? "Where" : poll.kind === "dates" ? "When" : "Doing"}</dt>
              <dd className="v">
                {poll.lockedLabel ?? (leader && leader.votes > 0 ? (
                  <span>
                    {leader.label} <span className="ft-meta">leads</span>
                  </span>
                ) : (
                  <span className="text-ink-2">Still voting</span>
                ))}
              </dd>
            </div>
          );
        })}
      </dl>
      </div>
    </section>
  );
}

function OrganizerCard({ view }: { view: TripView }) {
  const items = [
    view.status === "booking_ready" ? "ready to book" : null,
    view.underMinimum ? "short of the minimum" : null,
    view.joinersWaiting > 0 ? `${view.joinersWaiting} waiting to join` : null,
    view.pendingApprovals > 0 ? `${view.pendingApprovals} room ${view.pendingApprovals === 1 ? "request" : "requests"}` : null,
  ].filter(Boolean);
  return (
    <Link href={`/trip/${view.id}/organize`} className="ft-panel flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="ft-lbl ink block">Organizer tools</span>
        <span className="ft-meta block">{items.length ? items.join(" · ") : "Rooms, costs, payments, settings"}</span>
      </span>
      <span className="text-accent-ink">
        <Arrow />
      </span>
    </Link>
  );
}

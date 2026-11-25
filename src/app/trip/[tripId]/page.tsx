import Link from "next/link";
import { headers } from "next/headers";
import { CopyLink } from "@/components/bits";
import { ShareLauncher } from "@/components/share-launcher";
import { Arrow, HeadcountMeter } from "@/components/motion";
import { money } from "@/lib/format";
import { ageBandLabel, honoreeRoleLabel } from "@/lib/labels";
import { meterCells } from "@/lib/meter";
import type { JourneyStep, NextStep } from "@/lib/next-step";
import { getViewerId } from "@/lib/session";
import { loadTripView, type PartyView, type TripView } from "@/lib/view";

/** S3, rebuilt around one question: what should I do next? Everything else is one tap away. */
export default async function DashboardPage({
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
  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:4747"}`;

  return (
    <div className="grid grid-cols-1 gap-10 [&>*]:min-w-0">
      {error ? <p className="ft-panel border-bad/40 bg-bad-soft px-4 py-3 text-[15px] text-bad">{error}</p> : null}
      <div className="grid gap-6">
        <Hero view={view} />
        {view.journey.some((step) => step.state === "current" || step.state === "todo") ? <Journey tripId={view.id} steps={view.journey} /> : null}
      </div>
      {/* The meter comes before the next step, as in 01-trip-home: count first, then the ask. */}
      <div className="grid gap-6">
        <WhoCard view={view} />
        <NextStepCard tripId={view.id} step={view.nextStep} />
      </div>
      <PlanCard view={view} />
      {view.isOrganizer ? <OrganizerCard view={view} /> : null}
      {!view.cancelled && !view.lockedIn ? (
        <section className="ft-panel">
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
              <summary className="ft-summary text-[15px] font-medium text-ink-2">Copy the link</summary>
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
function Hero({ view }: { view: TripView }) {
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
      <p className="ft-lbl clay">
        {view.subtitle}
        {view.organizerName ? ` · from ${view.organizerName}` : ""}
      </p>
      <h1 className="ft-display mt-3">
        {decided ? "We're going to" : leading ? "Leaning toward" : view.name}
        <br />
        <i>{decided || leading ? `${place}${decided ? "." : "?"}` : "Where to?"}</i>
      </h1>
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
              <Link href={`/trip/${view.id}/costs`} className="ft-mono text-[22px] font-semibold text-clay-ink underline decoration-1 underline-offset-4">
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

/** Your steps as numbered mono cells. Done is lake with a check, current is clay. */
function Journey({ tripId, steps }: { tripId: string; steps: JourneyStep[] }) {
  const done = steps.filter((step) => step.state === "done" || step.state === "skipped").length;
  return (
    <nav aria-label={`Your progress: ${done} of ${steps.length} steps`}>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const tone =
            step.state === "done"
              ? "border-lake bg-lake-tint text-lake"
              : step.state === "current"
                ? "border-clay bg-clay-tint text-clay-ink"
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
  const dot = step.tone === "bad" ? "error" : step.tone === "warn" ? "clay" : step.tone === "action" ? "clay" : "";
  return (
    <section className={`rise-in ft-panel p-5 ${step.tone === "bad" ? "border-bad/40" : ""}`}>
      <p className="ft-live">
        <span className={`ft-dot ${dot}`} aria-hidden />
        <span className={step.tone === "bad" ? "text-bad" : "text-clay-ink"}>{step.eyebrow.toUpperCase()}</span>
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
  if (party.status === "joined") return { text: "Deciding", tone: "text-clay-ink", dot: "clay" };
  if (party.status === "invited") return { text: "Invited", tone: "text-muted", dot: "open" };
  if (party.status === "declined") return { text: "Declined", tone: "text-muted", dot: "open" };
  return { text: "Dropped", tone: "text-bad", dot: "error" };
}

function WhoCard({ view }: { view: TripView }) {
  const committed = view.payerCount;
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
          sub={
            committed >= need
              ? `Minimum of ${need} met · ${view.travelerCount} people`
              : `${need} needed to book · ${view.travelerCount} people`
          }
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

function PlanCard({ view }: { view: TripView }) {
  const open = view.polls.some((poll) => !poll.lockedLabel && !poll.closed);
  return (
    <section>
      <h2 className="ft-sec">
        <span className="ix">§2</span>
        <span className="ft-h2 flex-1">The plan</span>
        <Link href={`/trip/${view.id}/vote`} className="ft-link min-h-0">
          {open ? "Vote" : "Polls"}
        </Link>
      </h2>
      <dl className="mt-2">
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
    </section>
  );
}

function OrganizerCard({ view }: { view: TripView }) {
  const items = [
    view.status === "booking_ready" ? "ready to book" : null,
    view.underMinimum ? "short of the minimum" : null,
    view.pendingApprovals > 0 ? `${view.pendingApprovals} room ${view.pendingApprovals === 1 ? "request" : "requests"}` : null,
  ].filter(Boolean);
  return (
    <Link href={`/trip/${view.id}/organize`} className="ft-panel flex min-h-16 items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="ft-lbl ink block">Organizer tools</span>
        <span className="ft-meta block">{items.length ? items.join(" · ") : "Rooms, costs, payments, settings"}</span>
      </span>
      <span className="text-clay-ink">
        <Arrow />
      </span>
    </Link>
  );
}

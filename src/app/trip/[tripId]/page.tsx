import Link from "next/link";
import { headers } from "next/headers";
import { CopyLink } from "@/components/bits";
import { ForecastSlider } from "@/components/forecast-slider";
import { ShareLauncher } from "@/components/share-launcher";
import { money } from "@/lib/format";
import { ageBandLabel, honoreeRoleLabel, pollKindLabel } from "@/lib/labels";
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
    <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <Hero view={view} />
      {view.journey.some((step) => step.state === "current" || step.state === "todo") ? <Journey tripId={view.id} steps={view.journey} /> : null}
      <NextStepCard tripId={view.id} step={view.nextStep} />
      <NumberCard view={view} />
      <WhoCard view={view} />
      <PlanCard view={view} />
      {view.isOrganizer ? <OrganizerCard view={view} /> : null}
      {!view.cancelled && !view.lockedIn ? (
        <section className="rounded-3xl border border-line bg-card p-4">
          <h2 className="font-serif text-xl">Bring people in</h2>
          <p className="mt-1 text-sm text-muted">One link. They join, add who they&apos;re bringing, and see their number. No app to install.</p>
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
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">Copy the link · code {view.inviteToken}</summary>
            <div className="mt-2">
              <CopyLink path={`/join/${view.inviteToken}`} />
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}

/** The trip as an event page: where, when, and the faces of who's in. */
function Hero({ view }: { view: TripView }) {
  const dates = view.polls.find((poll) => poll.kind === "dates");
  const when = dates?.lockedLabel ?? dates?.options.filter((option) => option.votes > 0).sort((a, b) => b.votes - a.votes)[0]?.label ?? null;
  const decided = !!view.polls.find((poll) => poll.kind === "destination")?.lockedLabel;
  const faces = view.parties.filter((party) => party.status === "committed");
  const shown = faces.slice(0, 6);
  return (
    <section className="pt-1">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {decided ? "We're going to" : view.place !== view.name ? "Leading the vote" : "Where to?"}
      </p>
      <p className="font-serif text-5xl leading-[0.95]">{view.place.split(",")[0]}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex -space-x-2" aria-hidden>
          {shown.map((party) => (
            <span key={party.payerUserId} className="flex size-8 items-center justify-center rounded-full border-2 border-paper bg-accent font-serif text-sm text-accent-ink">
              {party.name.charAt(0)}
            </span>
          ))}
          {faces.length > shown.length ? (
            <span className="flex size-8 items-center justify-center rounded-full border-2 border-paper bg-chip text-xs">+{faces.length - shown.length}</span>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {when ? `${when} · ` : ""}
          {view.travelerCount} going
        </p>
      </div>
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

function Journey({ tripId, steps }: { tripId: string; steps: JourneyStep[] }) {
  const done = steps.filter((step) => step.state === "done" || step.state === "skipped").length;
  return (
    <nav aria-label={`Your progress: ${done} of ${steps.length} steps`}>
      <ol className="relative flex justify-between">
        <span className="absolute inset-x-4 top-3 h-px bg-line" aria-hidden />
        {steps.map((step) => (
          <li key={step.key} className="relative z-10 flex flex-col items-center gap-1">
            <Link
              href={`/trip/${tripId}${stepHref[step.key]}`}
              aria-current={step.state === "current" ? "step" : undefined}
              className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                step.state === "done"
                  ? "bg-accent text-accent-ink"
                  : step.state === "current"
                    ? "bg-paper text-accent ring-2 ring-accent"
                    : "bg-chip text-muted"
              }`}
            >
              {step.state === "done" ? "✓" : step.state === "skipped" ? "–" : ""}
            </Link>
            <span className={`text-[11px] ${step.state === "current" ? "font-semibold text-ink" : "text-muted"}`}>{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function NextStepCard({ tripId, step }: { tripId: string; step: NextStep }) {
  const frame =
    step.tone === "action"
      ? "border-2 border-accent"
      : step.tone === "bad"
        ? "border border-bad/40 bg-bad-soft"
        : step.tone === "warn"
          ? "border border-warn/40 bg-warn-soft"
          : "border border-line";
  return (
    <section className={`rise-in rounded-3xl bg-card p-5 ${frame}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{step.eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl leading-tight">{step.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
      {step.cta && step.href !== null ? (
        <Link
          href={step.href.startsWith("?") ? `/trip/${tripId}${step.href}` : `/trip/${tripId}${step.href}`}
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-accent-ink"
        >
          {step.cta}
        </Link>
      ) : null}
    </section>
  );
}

function NumberCard({ view }: { view: TripView }) {
  const viewer = view.viewer;
  const party = view.viewerParty;
  if (!viewer || !party || viewer.role === "honoree" || viewer.status === "off_trip" || viewer.status === "declined") return null;
  const preview = view.currentShareCents == null && view.ifYouCommitCents != null;
  const amount = preview ? view.ifYouCommitCents : (view.currentShareCents ?? party.bill?.totalCents ?? null);
  if (amount == null) return null;
  const bill = party.bill;
  const many = party.travelers.length > 1;
  const official = view.payerCount >= view.minPayerCount;
  const band = view.shareLowCents != null && view.shareHighCents != null && view.currentShareCents != null;
  const slider = (() => {
    if (view.lockedIn || view.sensitivityRows.length === 0) return null;
    const rows = [...view.sensitivityRows];
    const committed = party.status === "committed";
    // Below the minimum, today's unofficial share is the honest starting point.
    if (committed && view.currentShareCents != null && !rows.some((row) => row.payers === view.payerCount)) {
      rows.unshift({ payers: view.payerCount, totalCents: view.currentShareCents, expanded: false });
    }
    if (rows.length < 2) return null;
    const wanted = committed ? view.payerCount : Math.max(view.minPayerCount, view.payerCount + 1);
    const start = rows.some((row) => row.payers === wanted) ? wanted : (rows[0]?.payers ?? wanted);
    return { rows, start };
  })();
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {many ? `The ${party.name} party's share` : "Your share"}
        {preview ? " if you commit now" : ""}
      </p>
      {slider ? (
        <ForecastSlider
          rows={slider.rows}
          startPayers={slider.start}
          nowPayers={view.payerCount}
          bandLowDeltaCents={band ? view.shareLowCents! - view.currentShareCents! : null}
          bandHighDeltaCents={band ? view.shareHighCents! - view.currentShareCents! : null}
        />
      ) : (
        <>
          <p className="mt-1 font-serif text-5xl leading-none">{money(amount).replace(/\.00$/, "")}</p>
          {band ? (
            <p className="mt-2 text-sm text-accent">
              {money(view.shareLowCents!).replace(/\.00$/, "")}–{money(view.shareHighCents!).replace(/\.00$/, "")} with your flight
            </p>
          ) : null}
        </>
      )}
      <p className="mt-2 text-sm text-muted">
        {!official
          ? `Estimate until ${view.minPayerCount} parties commit.`
          : view.lockedIn
            ? "Final unless someone drops or a room changes."
            : "Official at today's count."}
        {!viewer.isPayer ? ` ${party.payerName.split(" ")[0]} pays it.` : ""}
      </p>
      <details className="mt-3 border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">How this is figured</summary>
        {bill?.payer ? (
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">Lodging{party.rooms.length ? `, ${party.rooms.join(", ")}` : ""}</dt>
            <dd>{money(bill.lodgingCents)}</dd>
            <dt className="text-muted">Shared food and activities</dt>
            <dd>{money(bill.evenCents)}</dd>
            {bill.optionalCents + bill.ticketCents > 0 ? (
              <>
                <dt className="text-muted">Extras you opted into</dt>
                <dd>{money(bill.optionalCents + bill.ticketCents)}</dd>
              </>
            ) : null}
            {bill.individualCents > 0 ? (
              <>
                <dt className="text-muted">Just yours (flights)</dt>
                <dd>{money(bill.individualCents)}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Lodging is priced by the beds {many ? "your party claims" : "you claim"}: nicer rooms cost more, a couch costs less. Food and activities
          split per person{many ? ", with kids at a reduced share" : ""}. Shares round up to the dollar; the spare change stays in the trip pot.
        </p>
        {view.rebase.length > 0 ? (
          <p className="mt-3 text-sm">
            The real lodging bill came in, so shares moved:{" "}
            {view.rebase.map((row) => `${row.name.split(" ")[0]} ${money(row.beforeCents)} → ${money(row.afterCents)}`).join("; ")}.
          </p>
        ) : null}
        <Link href={`/trip/${view.id}/costs`} className="mt-3 inline-block text-sm font-semibold text-accent">
          See the whole cost sheet →
        </Link>
      </details>
    </section>
  );
}

function statusWord(party: PartyView): { text: string; tone: string } {
  if (party.isHonoreeOnly) return { text: "Guest of honor", tone: "text-accent" };
  if (party.status === "committed") return { text: "In", tone: "text-good" };
  if (party.status === "joined") return { text: "Deciding", tone: "text-warn" };
  if (party.status === "invited") return { text: "Invited", tone: "text-muted" };
  if (party.status === "declined") return { text: "Declined", tone: "text-muted" };
  return { text: "Dropped", tone: "text-bad" };
}

function Avatar({ party }: { party: PartyView }) {
  const committed = party.status === "committed";
  const out = party.status === "off_trip" || party.status === "declined";
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-base ${
        committed ? "bg-accent text-accent-ink" : out ? "bg-chip text-muted line-through" : "border border-accent/60 text-accent"
      }`}
      aria-hidden
    >
      {party.name.charAt(0)}
    </span>
  );
}

function WhoCard({ view }: { view: TripView }) {
  const committed = view.payerCount;
  const need = view.minPayerCount;
  const pct = Math.min(100, Math.round((committed / Math.max(1, need)) * 100));
  const active = view.parties.filter((party) => party.status !== "off_trip" && party.status !== "declined");
  const gone = view.parties.length - active.length;
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl">Who&apos;s going</h2>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink">
          {committed} of {need}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={committed} aria-valuemax={need} aria-label="Parties committed">
        <div className="fill-in h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {committed >= need
          ? `${committed} ${committed === 1 ? "party" : "parties"} committed. Enough to book.`
          : `${need - committed} more ${need - committed === 1 ? "party" : "parties"} to commit before the stay can be booked.`}{" "}
        {view.travelerCount} people in all.
      </p>
      <ul className="mt-3 grid gap-1">
        {active.map((party) => {
          const word = statusWord(party);
          const mine = party.payerUserId === view.viewerParty?.payerUserId;
          const showPeople = party.travelers.length > 1 || party.travelers.some((traveler) => traveler.isHonoree);
          const row = (
            <span className="flex items-center gap-3">
              <Avatar party={party} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {party.name}
                  {mine ? <span className="font-normal text-accent"> · you</span> : null}
                </span>
                <span className="block truncate text-xs text-muted">
                  {party.travelers.length > 1 ? `${party.travelers.length} people` : party.isHonoreeOnly ? "Covered by the group" : "Solo"}
                  {party.rooms.length > 0 ? ` · ${party.rooms.join(", ")}` : ""}
                </span>
              </span>
              <span className={`text-sm font-semibold ${word.tone}`}>{word.text}</span>
            </span>
          );
          return (
            <li key={party.payerUserId}>
              {showPeople ? (
                <details className="rounded-2xl px-2 py-2 open:bg-chip/50">
                  <summary className="cursor-pointer list-none">{row}</summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5 pl-12">
                    {party.travelers.map((traveler) => (
                      <li key={traveler.id} className="rounded-full bg-chip px-2.5 py-1 text-xs">
                        {traveler.name.split(" ")[0]}
                        <span className="text-muted">
                          {" · "}
                          {traveler.isHonoree ? honoreeRoleLabel(traveler.honoreeRole) : ageBandLabel(traveler.ageBand)}
                          {!traveler.hasAccount ? " · no app" : ""}
                        </span>
                        {view.isOrganizer && traveler.needsNotes ? <span className="text-warn"> · has a note</span> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div className="px-2 py-2">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
      {gone > 0 ? <p className="mt-2 px-2 text-xs text-muted">{gone} {gone === 1 ? "party is" : "parties are"} off the trip.</p> : null}
    </section>
  );
}

function PlanCard({ view }: { view: TripView }) {
  const open = view.polls.some((poll) => !poll.lockedLabel && !poll.closed);
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl">The plan</h2>
        <Link href={`/trip/${view.id}/vote`} className="text-sm font-semibold text-accent">
          {open ? "Vote →" : "Polls →"}
        </Link>
      </div>
      <dl className="mt-3 grid gap-2">
        {view.polls.map((poll) => {
          const leader = poll.options.filter((option) => !option.hidden).slice().sort((a, b) => b.votes - a.votes)[0];
          return (
            <div key={poll.id} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">{pollKindLabel(poll.kind)}</dt>
              <dd className="text-right text-sm font-semibold">
                {poll.lockedLabel ?? (leader && leader.votes > 0 ? <span>{leader.label} <span className="font-normal text-muted">leads</span></span> : "Still voting")}
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
    <Link href={`/trip/${view.id}/organize`} className="flex items-center justify-between gap-3 rounded-3xl border border-line bg-card p-5">
      <span>
        <span className="block font-serif text-xl">Organizer tools</span>
        <span className="block text-sm text-muted">{items.length ? items.join(" · ") : "Rooms, costs, payments, settings"}</span>
      </span>
      <span className="text-xl text-accent" aria-hidden>
        →
      </span>
    </Link>
  );
}

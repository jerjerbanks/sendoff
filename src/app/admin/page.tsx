import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminSignInAction, adminSignOutAction } from "./actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/wordmark";
import { adminKey, isAdmin } from "@/lib/admin";
import { formatDuration, insights, usageStats, type InsightTrip } from "@/lib/admin-stats";
import { APP_NAME } from "@/lib/constants";
import { getD1 } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { tripStatusLabel } from "@/lib/labels";
import type { TripStatus } from "@/lib/trip-math";

export const metadata: Metadata = { title: `Usage · ${APP_NAME}`, robots: { index: false, follow: false } };

const STEP_LABELS: Record<string, string> = {
  trip_created: "Trips created",
  member_joined: "Invitees joined",
  voted: "People voted (organizers too)",
  committed: "People committed (organizers too)",
};

/**
 * The operator's usage page: who is trying it, on which trips, for how long, and who they
 * invited. Never anyone's budget; phones and emails are masked. Without the ADMIN_KEY
 * secret the page doesn't exist, and without the key cookie it shows only the key form.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; mine?: string }> }) {
  if (!adminKey()) notFound();
  const { error, mine } = await searchParams;
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
        <Wordmark />
        <form action={adminSignInAction} className="mt-6 grid gap-3 ft-panel p-4">
          <h1 className="ft-h2">Usage</h1>
          {error ? (
            <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error === "wait" ? "Too many tries. Wait a minute." : "That key isn't right."}</p>
          ) : null}
          <label className="text-sm font-medium">
            Admin key
            <Input className="mt-1.5" name="key" type="password" required autoComplete="current-password" />
          </label>
          <SubmitButton pendingLabel="Checking…">Open</SubmitButton>
        </form>
      </main>
    );
  }
  const viewer = await getViewer();
  const me = viewer && !viewer.demo ? { userId: viewer.userId } : null;
  const [stats, more] = await Promise.all([usageStats(getD1()), insights(getD1(), me)]);
  const created = stats.funnel[0]?.total ?? 0;
  const hideMine = mine === "hide" && more.youKnown;
  const people = hideMine ? more.people.filter((person) => !person.isYou) : more.people;
  const trips = hideMine ? more.trips.filter((trip) => !trip.mine) : more.trips;
  const s = more.summary;
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark />
        <form action={adminSignOutAction}>
          <button type="submit" className="min-h-11 text-sm font-semibold text-accent-ink">
            Sign out of admin
          </button>
        </form>
      </div>
      <h1 className="ft-h1 mt-6">
        Usage <i>at a glance.</i>
      </h1>
      <p className="mt-1 text-sm text-muted">
        Real trips only (the demo is left out). Nobody&apos;s budget is shown here; phones and emails are masked.
      </p>
      <p className="mt-2 text-sm">
        {more.youKnown ? (
          <>
            Your own trips and sign-ins are marked <YouTag />.{" "}
            <a className="font-semibold text-accent-ink" href={hideMine ? "/admin" : "/admin?mine=hide"}>
              {hideMine ? "Show mine" : "Hide mine"}
            </a>
          </>
        ) : (
          <span className="text-muted">Sign in to the app in this browser too and your own trips get marked, so testers stand out.</span>
        )}
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Testers at a glance">
        <Tile label="Testers" value={String(s.testers)} note={`${s.testersActive7} active in 7 days`} />
        <Tile label="Their time in app" value={formatDuration(s.testerSeconds7)} note={`last 7 days · ${formatDuration(s.testerSeconds)} all time`} />
        <Tile label="Invite opens" value={String(s.inviteOpens7)} note={`last 7 days · ${s.inviteOpens} all time`} />
        <Tile label="Invitees joined" value={String(s.invitesJoined7)} note={`last 7 days · ${s.invitesJoined} all time`} />
      </section>
      <p className="mt-2 text-xs text-muted">
        Testers are everyone on a real trip except you{more.youKnown ? "" : " (sign in to the app here to exclude yourself)"} and the honorees organizers type in.{" "}
        {s.trackingSince
          ? `Time in app and invite opens are tracked since ${s.trackingSince.slice(0, 10)}.`
          : "Time in app and invite opens start counting with this update, so they read — until people use it."}
      </p>

      <section className="mt-6" aria-labelledby="funnel">
        <h2 id="funnel" className="ft-h2">
          Funnel
        </h2>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Step</th>
              <th className="py-1 text-right font-medium">All time</th>
              <th className="py-1 text-right font-medium">Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {stats.funnel.map((row) => (
              <tr key={row.step} className="border-t border-line">
                <td className="py-2">{STEP_LABELS[row.step] ?? row.step}</td>
                <td className="py-2 text-right font-mono">{row.total}</td>
                <td className="py-2 text-right font-mono">{row.last7}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">
          Counted once per person per trip. Invitees joined counts people who came in through an invite link, so organizers (and honorees they
          type in) aren&apos;t in it, while voted and committed count organizers too. Trips created before the funnel existed may be missing from it.
        </p>
      </section>

      <section className="mt-6 grid gap-1 text-sm" aria-label="Totals">
        <p>
          <span className="font-mono">{stats.trips.total}</span> trips in all
          {stats.trips.byStatus.length ? `: ${stats.trips.byStatus.map((row) => `${row.count} ${statusLabel(row.status).toLowerCase()}`).join(", ")}` : ""}.
        </p>
        <p>
          <span className="font-mono">{stats.signedInPhones.active}</span> signed-in phones, <span className="font-mono">{stats.signedInPhones.new7}</span> new in the last 7 days.
        </p>
        {created === 0 && stats.trips.total > 0 ? <p className="text-muted">The funnel is empty because these trips predate it.</p> : null}
      </section>

      <section className="mt-8" aria-labelledby="people">
        <h2 id="people" className="ft-h2">
          People
        </h2>
        {people.length ? (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mt-2 w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 pr-3 font-medium">Person</th>
                  <th className="py-1 pr-3 font-medium">Trips</th>
                  <th className="py-1 pr-3 text-right font-medium">First seen</th>
                  <th className="py-1 pr-3 text-right font-medium">Last seen</th>
                  <th className="py-1 text-right font-medium">Time in app</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.key} className="border-t border-line align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium">{person.name}</span> {person.isYou ? <YouTag /> : null}
                      <div className="whitespace-nowrap font-mono text-xs text-muted">{person.contact}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <ul className="grid gap-0.5">
                        {person.trips.map((trip) => (
                          <li key={`${trip.tripShort}-${trip.role}`}>
                            {trip.role === "organizer"
                              ? "Organizes "
                              : trip.role === "asked"
                                ? `Asked to join (${trip.status}) `
                                : "Invited to "}
                            <span className="font-medium">{trip.tripName}</span>
                            {trip.organizerName && trip.role !== "organizer" ? <span className="text-muted"> by {trip.organizerName}</span> : null}
                            {trip.status === "deleted" ? <span className="text-muted"> (deleted)</span> : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right font-mono">{day(person.firstSeen)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right font-mono">{day(person.lastSeen)}</td>
                    <td className="py-2 text-right font-mono">
                      {formatDuration(person.seconds)}
                      {person.activeDays ? (
                        <div className="text-xs text-muted">
                          {person.activeDays} {person.activeDays === 1 ? "day" : "days"}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Nobody yet.</p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="trips">
        <h2 id="trips" className="ft-h2">
          Trips and invites
        </h2>
        {trips.length ? (
          <ul className="mt-2 grid gap-3">
            {trips.map((trip) => (
              <TripCard key={trip.idShort} trip={trip} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No real trips yet.</p>
        )}
      </section>
      <p className="mt-6 text-xs text-muted">As of {stats.generatedAt.replace("T", " ").slice(0, 16)} UTC.</p>
    </main>
  );
}

/** Trip statuses, plus "deleted" for trips their organizer deleted (still counted here). */
function statusLabel(status: string): string {
  return status === "deleted" ? "Deleted" : tripStatusLabel(status as TripStatus);
}

function day(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "—";
}

function YouTag() {
  return <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold">You</span>;
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="ft-panel p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = { organizer: "organizer", honoree: "honoree", member: "joined" };

/** One trip: who organizes it, who they invited and how far each person got. Never budgets. */
function TripCard({ trip }: { trip: InsightTrip }) {
  return (
    <li className="ft-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-semibold">
          {trip.name} {trip.mine ? <YouTag /> : null}
        </p>
        <p className="font-mono text-xs text-muted">
          {trip.idShort} · {trip.tripType}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        {statusLabel(trip.status)} · by {trip.organizerName} · created {day(trip.createdAt)} · last active {day(trip.lastActive)}
      </p>
      <p className="mt-2 text-sm">
        Invite link opened <span className="font-mono">{trip.inviteOpens}</span>×{trip.inviteOpens7 !== trip.inviteOpens ? ` (${trip.inviteOpens7} this week)` : ""} ·{" "}
        <span className="font-mono">{trip.invitesJoined}</span> joined
        {trip.waiting ? (
          <>
            {" "}
            · <span className="font-mono">{trip.waiting}</span> waiting for approval
          </>
        ) : null}
        {trip.declined ? (
          <>
            {" "}
            · <span className="font-mono">{trip.declined}</span> turned away
          </>
        ) : null}
        {" "}· <span className="font-mono">{formatDuration(trip.seconds)}</span> in app
      </p>
      {trip.people.length ? (
        <ul className="mt-2 grid gap-1 border-t border-line pt-2 text-sm">
          {trip.people.map((person, index) => (
            <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>
                {person.name} {person.isYou ? <YouTag /> : null}{" "}
                <span className="text-muted">
                  {ROLE_LABELS[person.role] ?? person.role}
                  {person.joinedAt && person.role !== "honoree" ? ` ${day(person.joinedAt)}` : ""}
                  {person.voted ? " · voted" : ""}
                  {person.committed ? " · committed" : ""}
                </span>
              </span>
              <span className="font-mono text-xs text-muted">{person.role === "honoree" ? "" : formatDuration(person.seconds)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

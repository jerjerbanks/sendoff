import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminSignInAction, adminSignOutAction } from "./actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/wordmark";
import { adminKey, isAdmin } from "@/lib/admin";
import { usageStats } from "@/lib/admin-stats";
import { APP_NAME } from "@/lib/constants";
import { getD1 } from "@/lib/db";
import { tripStatusLabel } from "@/lib/labels";
import type { TripStatus } from "@/lib/trip-math";

export const metadata: Metadata = { title: `Usage · ${APP_NAME}`, robots: { index: false, follow: false } };

const STEP_LABELS: Record<string, string> = {
  trip_created: "Trips created",
  member_joined: "People joined",
  voted: "People voted",
  committed: "People committed",
};

/**
 * The operator's usage page: are testers actually using it? Counts only, never trip
 * names, budgets, contacts or people. Without the ADMIN_KEY secret the page doesn't exist.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!adminKey()) notFound();
  const { error } = await searchParams;
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
  const stats = await usageStats(getD1());
  const created = stats.funnel[0]?.total ?? 0;
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Wordmark />
        <form action={adminSignOutAction}>
          <button type="submit" className="min-h-11 text-sm font-semibold text-clay-ink">
            Sign out of admin
          </button>
        </form>
      </div>
      <h1 className="ft-h1 mt-6">
        Usage <i>at a glance.</i>
      </h1>
      <p className="mt-1 text-sm text-muted">Real trips only (the demo is left out). Counts only: no names, budgets or contacts.</p>

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
        <p className="mt-2 text-xs text-muted">Counted once per person per trip. Trips created before the funnel existed may be missing from it.</p>
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

      <section className="mt-6" aria-labelledby="recent">
        <h2 id="recent" className="ft-h2">
          Trips by last activity
        </h2>
        {stats.recent.length ? (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 font-medium">Trip</th>
                <th className="py-1 font-medium">Status</th>
                <th className="py-1 text-right font-medium">People</th>
                <th className="py-1 text-right font-medium">Committed</th>
                <th className="py-1 text-right font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((row) => (
                <tr key={row.idShort} className="border-t border-line">
                  <td className="py-2 font-mono">
                    {row.idShort} <span className="text-muted">{row.tripType}</span>
                  </td>
                  <td className="py-2">{statusLabel(row.status)}</td>
                  <td className="py-2 text-right font-mono">{row.members}</td>
                  <td className="py-2 text-right font-mono">{row.committed}</td>
                  <td className="py-2 text-right font-mono">{row.lastActive ? row.lastActive.slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

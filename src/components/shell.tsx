import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  jumpSecondAction,
  resetClockAction,
  resetDemoAction,
  simulateDeadlineAction,
  switchUserAction,
} from "@/app/actions";
import { Identify } from "@/components/identify";
import { TripNav } from "@/components/nav";
import { ShareLauncher } from "@/components/share-launcher";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DEMO_TRIP_ID, LAKE_TRIP_ID } from "@/lib/constants";
import { partyStatusLabel, roleLabel, tripStatusLabel } from "@/lib/labels";
import { formatWhen } from "@/lib/format";
import type { TripView } from "@/lib/view";

export async function Shell({ view, children }: { view: TripView; children: ReactNode }) {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:4747";
  const origin = `${proto}://${host}`;
  const tone =
    view.cancelled || view.underMinimum ? "bad" : view.lockedIn ? "good" : view.buyInOpen ? "warn" : "default";
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-3xl">
        <header className="px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Sendoff</p>
              <h1 className="font-serif text-3xl leading-tight">{view.name}</h1>
              <p className="mt-1 text-sm text-muted">{view.subtitle}</p>
            </div>
            <Badge tone={tone}>{tripStatusLabel(view.status)}</Badge>
          </div>
          <details className="mt-3 rounded-2xl border border-line bg-card">
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold">
              Viewing as{" "}
              {view.viewer
                ? `${view.viewer.name} · ${view.viewerParty && view.viewerParty.travelers.length > 1 ? `${view.viewerParty.name} · ` : ""}${roleLabel(view.viewer.role)}`
                : "nobody yet — pick a person"}
            </summary>
            <div className="grid gap-2 border-t border-line p-2">
              {view.parties.map((party) => {
                const people = view.members.filter((member) => member.partyUserId === party.payerUserId);
                const offline = party.travelers.filter((traveler) => !traveler.hasAccount);
                return (
                  <div key={party.payerUserId} className="rounded-xl bg-chip/50 p-1">
                    <p className="flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      <span>{party.name}</span>
                      <span className="normal-case tracking-normal">{partyStatusLabel(party.status)}</span>
                    </p>
                    {people.map((member) => (
                      <form key={member.userId} action={switchUserAction}>
                        <input type="hidden" name="tripId" value={view.id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <button
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-chip"
                          type="submit"
                        >
                          <span>
                            {member.name}
                            <span className="text-muted"> · {member.isPayer ? roleLabel(member.role) : "on this party"}</span>
                          </span>
                          {member.userId === view.viewer?.userId ? <span className="text-xs text-accent">You</span> : null}
                        </button>
                      </form>
                    ))}
                    {offline.length > 0 ? (
                      <p className="px-2 pb-1 text-xs text-muted">
                        No app: {offline.map((traveler) => traveler.name.split(" ")[0]).join(", ")}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {view.isDemo ? (
                <p className="px-2 pt-1 text-xs text-muted">
                  Other demo:{" "}
                  {view.id === LAKE_TRIP_ID ? (
                    <Link className="font-semibold text-accent" href={`/demo?trip=${DEMO_TRIP_ID}`}>Alex&apos;s Bachelor Party</Link>
                  ) : (
                    <Link className="font-semibold text-accent" href={`/demo?trip=${LAKE_TRIP_ID}`}>Harper Lake House (family)</Link>
                  )}
                </p>
              ) : null}
            </div>
          </details>
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
          <div className="mt-3 hidden md:block">
            <TripNav tripId={view.id} />
          </div>
        </header>
        <Identify
          tripId={view.id}
          hasViewer={!!view.viewer}
          members={view.members.map((member) => ({
            userId: member.userId,
            name: member.name,
            role: member.role,
            party: view.parties.find((party) => party.payerUserId === member.partyUserId)?.name ?? null,
          }))}
        />
        <div className="px-4 pt-3">
          <QaBar view={view} />
        </div>
        <main className="flex-1 px-4 py-4 pb-28 md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <TripNav tripId={view.id} />
      </div>
    </div>
  );
}

function QaBar({ view }: { view: TripView }) {
  return (
    <details className="rounded-2xl border border-dashed border-line bg-chip/70">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-muted">
        QA clock · {view.simulated ? formatWhen(view.now) : "real time"} · Simulate deadline now
      </summary>
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <form action={simulateDeadlineAction}>
          <input type="hidden" name="tripId" value={view.id} />
          <button className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-card" type="submit">
            Simulate deadline now
          </button>
        </form>
        <form action={jumpSecondAction}>
          <input type="hidden" name="tripId" value={view.id} />
          <button className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold" type="submit">
            Day after 2nd payment
          </button>
        </form>
        <form action={resetClockAction}>
          <input type="hidden" name="tripId" value={view.id} />
          <button className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold" type="submit">
            Real time
          </button>
        </form>
        {view.isDemo ? (
          <form action={resetDemoAction}>
            <input type="hidden" name="tripId" value={view.id} />
            <button className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold" type="submit">
              Reset demo
            </button>
          </form>
        ) : null}
      </div>
      <p className="px-3 pb-3 text-xs text-muted">
        The clock only moves when you use these controls. Resetting time does not undo drops. Reset demo restores both seeded trips.
      </p>
    </details>
  );
}

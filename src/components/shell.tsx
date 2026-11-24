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
import { roleLabel, statusLabel, tripStatusLabel } from "@/lib/labels";
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
              <p className="mt-1 text-sm text-muted">
                Bachelor party for {view.guestName}
              </p>
            </div>
            <Badge tone={tone}>{tripStatusLabel(view.status)}</Badge>
          </div>
          <details className="mt-3 rounded-2xl border border-line bg-card">
            <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold">
              Viewing as {view.viewer ? `${view.viewer.name} · ${roleLabel(view.viewer.role)}` : "nobody yet — pick a person"}
            </summary>
            <div className="grid gap-1 border-t border-line p-2">
              {view.members.map((member) => (
                <form key={member.userId} action={switchUserAction}>
                  <input type="hidden" name="tripId" value={view.id} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <button
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-chip"
                    type="submit"
                  >
                    <span>
                      {member.name}
                      <span className="text-muted"> · {roleLabel(member.role)}</span>
                    </span>
                    <span className="text-xs text-muted">{statusLabel(member.status)}</span>
                  </button>
                </form>
              ))}
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
          members={view.members.map((member) => ({ userId: member.userId, name: member.name, role: member.role }))}
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
        The clock only moves when you use these controls. Resetting time does not undo drops. Reset demo puts Alex&apos;s party back to the seeded crew.
      </p>
    </details>
  );
}

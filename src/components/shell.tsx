import type { ReactNode } from "react";
import Link from "next/link";
import { DemoPanel } from "@/components/demo-panel";
import { Identify } from "@/components/identify";
import { TripNav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { tripStatusLabel } from "@/lib/labels";
import { formatDay } from "@/lib/format";
import type { TripView } from "@/lib/view";

export async function Shell({ view, children }: { view: TripView; children: ReactNode }) {
  const tone =
    view.cancelled || view.underMinimum ? "bad" : view.lockedIn ? "good" : view.buyInOpen ? "warn" : "default";
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-3xl">
        <header className="px-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/trip/${view.id}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Sendoff
              </Link>
              <h1 className="mt-0.5 font-serif text-2xl leading-tight">{view.name}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {view.subtitle}
                {view.buyInOpen && view.buyInDeadline ? ` · commit by ${formatDay(view.buyInDeadline)}` : ""}
              </p>
            </div>
            <Badge tone={tone} className="mt-1 shrink-0">
              {tripStatusLabel(view.status)}
            </Badge>
          </div>
          <DemoPanel view={view} />
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
        <main className="flex-1 px-4 py-5 pb-28 md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <TripNav tripId={view.id} />
      </div>
    </div>
  );
}

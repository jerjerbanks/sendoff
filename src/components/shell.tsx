import type { ReactNode } from "react";
import Link from "next/link";
import { DemoBanner } from "@/components/demo-panel";
import { Identify } from "@/components/identify";
import { TripNav } from "@/components/nav";
import { Badge } from "@/components/ui/badge";
import { isDemoTrip } from "@/lib/demo-tour";
import { tripStatusLabel } from "@/lib/labels";
import { formatDay } from "@/lib/format";
import type { TripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";

export async function Shell({ view, children }: { view: TripView; children: ReactNode }) {
  const demo = isDemoTrip(view.id);
  const tone =
    view.cancelled || view.underMinimum ? "bad" : view.lockedIn ? "good" : view.buyInOpen ? "warn" : "default";
  // A real trip shows nothing to someone who isn't on it: no roster, no plan, no numbers.
  if (!demo && !view.viewer) return <PrivateTrip />;
  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-0 md:max-w-3xl">
        {demo ? (
          <div className="px-4">
            <DemoBanner view={view} tripId={view.id} viewerName={view.viewer?.name.split(" ")[0] ?? null} />
          </div>
        ) : null}
        <header className="px-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/trip/${view.id}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {APP_NAME}
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
          <div className="mt-3 hidden md:block">
            <TripNav tripId={view.id} />
          </div>
        </header>
        {demo ? (
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
        ) : null}
        <main className="flex-1 px-4 py-5 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-10">{children}</main>
      </div>
      <div className="md:hidden">
        <TripNav tripId={view.id} />
      </div>
    </div>
  );
}

function PrivateTrip() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{APP_NAME}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight">This trip is private.</h1>
      <p className="mt-3 text-base text-muted">
        Open the invite link you were sent to join or get back in. If you joined on another phone, open the same link here and use the same
        phone number or email.
      </p>
      <Link href="/" className="mt-6 text-sm font-semibold text-accent">
        Go to {APP_NAME}
      </Link>
    </main>
  );
}

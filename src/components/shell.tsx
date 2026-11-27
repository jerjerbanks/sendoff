import type { ReactNode } from "react";
import Link from "next/link";
import { DemoBanner } from "@/components/demo-panel";
import { Identify } from "@/components/identify";
import { TripNav, TripSidebar } from "@/components/nav";
import { TopBar } from "@/components/top-bar";
import { TripScene, TripThemeRoot } from "@/components/scene";
import { sceneForPage, sceneUrl } from "@/lib/scenes";
import { themeForTrip } from "@/lib/trip-theme";
import { THEME_PREVIEW_ON } from "@/lib/vibe-flag";
import { Wordmark } from "@/components/wordmark";
import { isDemoTrip } from "@/lib/demo-tour";
import { tripStatusLabel } from "@/lib/labels";
import type { TripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";
import { FeedbackButton } from "@/components/feedback-button";
import { requestOrigin } from "@/lib/origin";
import { shareDraft } from "@/lib/share-copy";

export async function Shell({ view, children }: { view: TripView; children: ReactNode }) {
  const demo = isDemoTrip(view.id);
  // A real trip shows nothing to someone who isn't on it: no roster, no plan, no numbers.
  if (!demo && !view.viewer) return <PrivateTrip />;
  const payLabel = view.lockedIn || view.status === "booked" ? "Pay" : "Commit";
  const live = view.cancelled || view.underMinimum ? "error" : view.lockedIn ? "pine" : view.buyInOpen ? "accent" : "lake";
  const status = view.cancelled
    ? "Cancelled"
    : view.buyInOpen || view.lockedIn
      ? `${view.payerCount}/${view.minPayerCount} in`
      : tripStatusLabel(view.status);
  const share =
    view.cancelled || view.lockedIn
      ? null
      : shareDraft(
          {
            id: view.id,
            name: view.name,
            inviteToken: view.inviteToken,
            organizerName: view.organizerName,
            guestName: view.guestName,
            buyInDeadline: view.buyInDeadline,
            currentShareCents: view.currentShareCents,
          },
          "invite",
          await requestOrigin(),
        );
  // v7: the trip's theme, derived from what this member's page already loaded. Nothing stored.
  const theme = themeForTrip(view);
  return (
    <TripThemeRoot derived={theme} flagOn={THEME_PREVIEW_ON} className="ft-theme-band min-h-dvh lg:pl-[264px]">
      <TripSidebar
        tripId={view.id}
        tripName={view.name}
        payLabel={payLabel}
        isOrganizer={view.isOrganizer}
        meta={status}
        wordmark={<Wordmark />}
        thumb={sceneUrl(sceneForPage("home", theme))}
      />
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        {demo ? <DemoBanner view={view} tripId={view.id} viewerName={view.viewer?.name.split(" ")[0] ?? null} /> : null}
        <TopBar tripId={view.id} tripName={view.name} payLabel={payLabel} status={status} tone={live} isOrganizer={view.isOrganizer} share={share} />
        <TripScene tripId={view.id} theme={theme} flagOn={THEME_PREVIEW_ON} />
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
        <main className="flex-1 px-5 pt-2 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-16">
          {children}
          {/* Inline at the end of the page, above the tab bar's reserved space: it never covers the tabs or a CTA. */}
          <FeedbackButton className="mt-10" />
        </main>
      </div>
      <TripNav tripId={view.id} payLabel={payLabel} />
    </TripThemeRoot>
  );
}

function PrivateTrip() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10">
      <Wordmark />
      <h1 className="ft-display mt-8">
        This trip
        <br />
        <i>is private.</i>
      </h1>
      <p className="ft-lead mt-4">
        Open the invite link you were sent to join or get back in. If you joined on another phone, open the same link here and use the same
        phone number or email.
      </p>
      <Link href="/" className="ft-link mt-6">
        Go to {APP_NAME}
      </Link>
      <FeedbackButton className="mt-4" />
    </main>
  );
}

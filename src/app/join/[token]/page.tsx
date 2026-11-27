import { Wordmark } from "@/components/wordmark";
import { SceneHeader } from "@/components/scene";
import { sceneForPage } from "@/lib/scenes";
import { themeForTrip } from "@/lib/trip-theme";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { joinAsMeAction, joinTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Turnstile } from "@/components/turnstile";
import { turnstileSiteKey } from "@/lib/turnstile";
import { FeedbackButton } from "@/components/feedback-button";
import { Input } from "@/components/ui/input";
import { ogCard } from "@/lib/og-copy";
import { getViewer } from "@/lib/session";
import { ensureDemoSeed, isMemberOf, personBasics, tripIdForToken } from "@/lib/store";
import { DemoBanner } from "@/components/demo-panel";
import { isDemoTrip } from "@/lib/demo-tour";
import { loadTripView } from "@/lib/view";
import { APP_NAME } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  await ensureDemoSeed();
  const tripId = await tripIdForToken(token);
  const shell = tripId ? await loadTripView(tripId, null) : null;
  const view = shell;
  if (!view) return { title: `${APP_NAME} invite` };
  const card = ogCard(view);
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:4747";
  const image = `${proto}://${host}/og/invite/${token}`;
  return {
    title: card.pageTitle,
    description: card.alt,
    openGraph: { title: card.shareTitle, description: card.alt, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: card.shareTitle, description: card.alt, images: [image] },
  };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; tour?: string }>;
}) {
  const { token } = await params;
  const { error, tour } = await searchParams;
  await ensureDemoSeed();
  const tripId = await tripIdForToken(token);
  const view = tripId ? await loadTripView(tripId, null) : null;
  // The tour's step 2 pre-fills Taylor; a real invite never pre-fills anyone.
  const onTour = tour === "2" && isDemoTrip(tripId);
  const closed = !!view && (view.lockedIn || view.underMinimum || view.cancelled);
  // Already on this trip on this phone: no second sign-up, just the way in.
  const viewer = tripId && !onTour ? await getViewer() : null;
  const viewerId = viewer?.userId ?? null;
  const alreadyIn = !!viewerId && !!tripId && (await isMemberOf(tripId, viewerId));
  // Signed in for real on another trip: join as yourself in one tap and keep every trip on this phone.
  const self = viewer && !viewer.demo && !alreadyIn && !isDemoTrip(tripId) ? await personBasics(viewer.userId) : null;

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-10 ${isDemoTrip(tripId) && tripId ? "pt-16 md:pt-64" : ""}`}>
      {isDemoTrip(tripId) && tripId ? (
        <div className="fixed inset-x-0 top-0 z-30 mx-auto max-w-lg">
          <DemoBanner view={null} tripId={tripId} viewerName={onTour ? "Taylor" : null} />
        </div>
      ) : null}
      <Wordmark />
      {view ? (
        <>
          <div className="-mx-5 mt-4">
            <SceneHeader scene={sceneForPage("join", themeForTrip(view))} size="sm" />
          </div>
          <p className="ft-lbl accent mt-2">Invitation · from {view.organizerName}</p>
          <h1 className="ft-display mt-3">
            You&apos;re invited to
            <br />
            <i>{view.name}.</i>
          </h1>
          <p className="mt-3 text-base text-muted">
            {view.place !== view.name ? `${view.place.split(",")[0]} · ` : ""}
            {joinWhen(view)}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden>
              {view.parties
                .filter((party) => party.status === "committed")
                .slice(0, 6)
                .map((party, i) => (
                  <span
                    key={party.payerUserId}
                    className="flex size-9 items-center justify-center rounded-full border-2 border-paper font-mono text-[15px] font-medium text-white"
                    style={{ background: `var(--av-${(i % 7) + 1})` }}
                  >
                    {party.name.charAt(0)}
                  </span>
                ))}
            </div>
            <p className="text-sm">
              {view.payerCount} {view.payerCount === 1 ? "party is" : "parties are"} in
              {view.payerCount < view.minPayerCount ? ` · ${view.minPayerCount - view.payerCount} more needed to book` : ""}
            </p>
          </div>
          {alreadyIn ? (
            <Link
              href={`/trip/${tripId}`}
              className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-fg"
            >
              You&apos;re on this trip. Open it
            </Link>
          ) : closed ? (
            <p className="mt-4 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              The buy-in deadline has passed. You can&apos;t join or rejoin.
            </p>
          ) : self ? (
            <>
              <form action={joinAsMeAction} className="mt-6 grid gap-3 ft-panel p-4">
                <input type="hidden" name="token" value={token} />
                {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
                <SubmitButton pendingLabel="Joining…">Join as {self.name}</SubmitButton>
                <p className="text-center text-xs text-muted">Your other trips stay on this phone, under Menu → Your trips.</p>
              </form>
              <details className="mt-3 text-sm">
                <summary className="min-h-11 cursor-pointer py-2 font-semibold text-accent-ink">Not {self.name}? Join as someone else</summary>
                <JoinForm token={token} error={null} onTour={false} />
              </details>
            </>
          ) : (
            <JoinForm token={token} error={error ?? null} onTour={onTour} />
          )}
        </>
      ) : (
        <>
          <h1 className="mt-2 ft-h1">That invite doesn&apos;t go anywhere.</h1>
          <p className="mt-3 text-sm text-muted">Check the link, or start from the demo.</p>
        </>
      )}
      <Link href="/" className="mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent-ink">
        Back to {APP_NAME}
      </Link>
      <FeedbackButton className="mt-2 self-start" />
    </main>
  );
}

/** Name and phone or email: a new sign-in on this phone. */
function JoinForm({ token, error, onTour }: { token: string; error: string | null; onTour: boolean }) {
  return (
    <form action={joinTripAction} className="mt-6 grid gap-3 ft-panel p-4">
      <input type="hidden" name="token" value={token} />
      {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      <label className="text-sm font-medium">
        Your name
        <Input
          className="mt-1.5 scroll-mb-28"
          name="name"
          required
          placeholder="Your name"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          defaultValue={onTour ? "Taylor Nguyen" : undefined}
        />
      </label>
      <label className="text-sm font-medium">
        Phone or email
        {/* Phone or email in one field: the email keyboard has both @ and digits; scroll margin keeps Join visible over the keyboard. */}
        <Input
          className="mt-1.5 scroll-mb-28"
          name="contact"
          type="text"
          required
          placeholder="you@example.com or 555-123-4567"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          defaultValue={onTour ? "taylor@example.com" : undefined}
        />
      </label>
      <Turnstile siteKey={turnstileSiteKey()} />
      <SubmitButton>Join the trip</SubmitButton>
      <p className="text-center text-xs text-muted">
        No app to install and no password. This phone stays signed in. To use another phone later, you&apos;ll make a sign-in link from
        this one.
      </p>
    </form>
  );
}

function joinWhen(view: { polls: { kind: string; lockedLabel: string | null; options: { label: string; votes: number }[] }[]; dateWindow: string }): string {
  const dates = view.polls.find((poll) => poll.kind === "dates");
  return dates?.lockedLabel ?? dates?.options.slice().sort((a, b) => b.votes - a.votes).find((option) => option.votes > 0)?.label ?? view.dateWindow;
}

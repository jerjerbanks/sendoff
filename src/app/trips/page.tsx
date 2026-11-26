import Link from "next/link";
import { joinByCodeAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { FeedbackButton } from "@/components/feedback-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/constants";
import { tripStatusLabel } from "@/lib/labels";
import { listMyTrips, type MyTrip } from "@/lib/landing";
import { getViewer } from "@/lib/session";
import type { TripStatus } from "@/lib/trip-math";

export const metadata = { title: `Your trips · ${APP_NAME}` };

/**
 * Every trip this phone is signed in to, plus the two ways to another one: start a trip,
 * or paste an invite code. Lists only trips the viewer is a member of; someone signed out
 * (or on a demo sign-in) sees just the two ways in, never a trip.
 */
export default async function TripsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  const mine: MyTrip[] = viewer && !viewer.demo ? await listMyTrips(viewer.userId) : [];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12">
      <header className="ft-bar -mx-5 mb-6">
        <Link href="/" className="flex min-h-12 items-center" aria-label={`${APP_NAME} home`}>
          <Wordmark />
        </Link>
        <ThemeToggle variant="bar" />
      </header>
      <h1 className="ft-h1">
        Your <i>trips.</i>
      </h1>
      {mine.length ? (
        <ul className="mt-4 grid gap-2" aria-label="Your trips">
          {mine.map((trip) => (
            <li key={trip.tripId}>
              <Link href={`/trip/${trip.tripId}`} className="ft-panel flex min-h-16 flex-col justify-center px-4 py-3">
                <span className="font-semibold">{trip.name}</span>
                <span className="text-sm text-muted">
                  {tripStatusLabel(trip.status as TripStatus)} · {trip.dateWindow}
                  {trip.role === "organizer" ? " · You're organizing" : trip.memberStatus === "off_trip" ? " · You're off this trip" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">
          {viewer && !viewer.demo
            ? "No trips on this phone yet."
            : "This phone isn't signed in to a trip. Open a trip on the phone you joined with, or use an invite code below."}
        </p>
      )}

      <form action={joinByCodeAction} className="mt-8 grid gap-3 ft-panel p-4">
        <h2 className="ft-h2">Have an invite code?</h2>
        {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <label className="text-sm font-medium">
          Invite code or link
          <Input
            className="mt-1.5"
            name="code"
            required
            placeholder="aB3x9Qk_z1Lm or the whole link"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </label>
        <SubmitButton pendingLabel="Finding the trip…">Find the trip</SubmitButton>
        <p className="text-xs text-muted">The organizer can find the code on the trip&apos;s home screen.</p>
      </form>

      <Link href="/new#start" className="ft-btn mt-4">
        Start a new trip
      </Link>
      <FeedbackButton className="mt-6 self-center" />
    </main>
  );
}

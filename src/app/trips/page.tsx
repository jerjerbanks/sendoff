import Link from "next/link";
import { Spot } from "@/components/spot";
import { deleteTripAction, joinByCodeAction, leaveTripAction } from "@/app/actions";
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
const DONE: Record<string, string> = {
  left: "You left the trip. Any buy-in you'd paid is refunded.",
  deleted: "Trip deleted. Nobody can open it now, and any buy-ins paid are refunded.",
};

/**
 * Leave (members) or delete (the organizer), behind a disclosure and a confirm box. The
 * store has the real rules: payers only, nobody leaves a booked trip they bought into, and a
 * booked trip others paid for can't be deleted.
 */
function TripExit({ trip }: { trip: MyTrip }) {
  if (trip.memberStatus === "off_trip") return null;
  const organizing = trip.role === "organizer";
  return (
    <details className="mt-1 px-1 text-sm">
      <summary className="flex min-h-11 cursor-pointer items-center text-muted">
        {organizing ? "Delete this trip" : "Leave this trip"}
      </summary>
      <form action={organizing ? deleteTripAction : leaveTripAction} className="ft-panel mt-1 grid gap-3 p-4">
        <input type="hidden" name="tripId" value={trip.tripId} />
        <p>
          {organizing
            ? `This deletes ${trip.name} for everyone on it. Nobody can open it or join it after this. Buy-ins paid before booking are refunded.`
            : `You and your party come off ${trip.name}. A buy-in paid before booking is refunded. You can rejoin with the invite while the trip is still planning or open for buy-ins.`}
        </p>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="confirm" value="yes" required className="size-5" />
          {organizing ? `Yes, delete ${trip.name}` : `Yes, leave ${trip.name}`}
        </label>
        <SubmitButton variant="destructive" pendingLabel={organizing ? "Deleting…" : "Leaving…"}>
          {organizing ? "Delete trip" : "Leave trip"}
        </SubmitButton>
      </form>
    </details>
  );
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; problem?: string; done?: string }>;
}) {
  const { error, problem, done } = await searchParams;
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
      {done && DONE[done] ? (
        <p role="status" className="mt-3 rounded-xl bg-good-soft px-3 py-2 text-sm">
          {DONE[done]}
        </p>
      ) : null}
      {problem ? <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{problem}</p> : null}
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
              <TripExit trip={trip} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 text-center">
          <Spot name="empty-tent" className="w-[180px]" />
        <p className="mt-3 text-sm text-muted">
          {viewer && !viewer.demo
            ? "No trips on this phone yet."
            : "This phone isn't signed in to a trip. Open a trip on the phone you joined with, or use an invite code below."}
        </p>
        </div>
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

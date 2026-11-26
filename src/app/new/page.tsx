import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Arrow } from "@/components/motion";
import { Input } from "@/components/ui/input";
import { FeedbackButton } from "@/components/feedback-button";
import { TripKindFields } from "@/components/trip-kind-fields";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { APP_NAME } from "@/lib/constants";
import { getViewer } from "@/lib/session";
import { ensureDemoSeed, personBasics } from "@/lib/store";

export const metadata = { title: `Start a trip · ${APP_NAME}` };

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureDemoSeed();
  const { error } = await searchParams;
  // Signed in for real: the new trip is organized as you, and your other trips stay on this phone.
  const viewer = await getViewer();
  const self = viewer && !viewer.demo ? await personBasics(viewer.userId) : null;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 md:max-w-3xl">
      <header className="ft-bar -mx-5 mb-8">
        <Link href="/" className="flex min-h-12 items-center" aria-label={`${APP_NAME} home`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <span className="ft-live">
            <span className="ft-dot" aria-hidden />
            Test mode
          </span>
          <ThemeToggle variant="bar" />
        </div>
      </header>
      <p className="ft-lbl accent">Group trips, without fronting the bill</p>
      <h1 className="ft-display mt-3 max-w-xl">
        Plan the trip.
        <br />
        <i>Commit, or you&apos;re off.</i>
      </h1>
      <p className="ft-lead mt-4 max-w-xl">
        For whoever usually puts the rental on their card. Vote the place and the dates, see what each household owes before anyone pays,
        and collect a buy-in that is part of the share — not a fee on top. It stays refundable until the stay is booked.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href="#start" className="ft-btn">
          <span>Start a trip</span>
          <Arrow />
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
        <a href="/demo" className="ft-panel flex min-h-14 flex-col justify-center px-4 py-3 font-semibold">
          Take the 2-minute tour
          <span className="text-xs font-normal text-muted">7 steps through a sample bachelor party</span>
        </a>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo/{n} is a redirect that sets cookies; it must be a full navigation */}
      <a href="/demo/7" className="ft-link mt-2">
        Or see a family trip: four households, kids, and grandparents
      </a>
      <ol className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["1", "Vote", "Approve any place, weekend, or plan you'd actually do. A private budget shows whether it fits the group without telling anyone your number."],
          ["2", "See your number", "Rooms are priced by the bed, not split evenly. Kids pay less of the food and activities. Optional things split only among who's in."],
          ["3", "Commit", "One test buy-in per household holds your room. Refundable until the stay is booked; after that, a late drop forfeits it."],
        ].map(([step, title, body]) => (
          <li key={step} className="ft-rule pt-3">
            <p className="ft-mono text-[14px] text-accent-ink">§{step}</p>
            <h2 className="mt-1 ft-h2">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <form id="start" action={createTripAction} className="mt-10 grid gap-4 ft-panel p-5">
        <div>
          <h2 className="ft-h1">
            Start a <i>trip.</i>
          </h2>
          <p className="mt-1 text-sm text-muted">Friends and golf templates are coming next.</p>
        </div>
        {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <Field label="Trip name" name="name" placeholder="Jamie & Sam's weekend" />
        <TripKindFields>
          {self ? (
            <p className="text-sm text-muted">
              You&apos;ll organize this as <span className="font-semibold text-ink">{self.name}</span>. Your other trips stay under{" "}
              <Link href="/trips" className="ft-link">
                Your trips
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Your name" name="organizerName" placeholder="Jordan Lee" />
              <Field label="Your phone or email" name="organizerContact" placeholder="jordan@example.com" />
            </div>
          )}
        </TripKindFields>
        <Field label="Rough date window" name="dateWindow" placeholder="A long weekend in April or May 2027" />
        <SubmitButton pendingLabel="Creating…">Create the trip</SubmitButton>
      </form>
      <FeedbackButton className="mt-6 self-center" />
    </main>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input className="mt-1.5" name={name} placeholder={placeholder} required />
    </label>
  );
}

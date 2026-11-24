import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input, fieldClass } from "@/components/ui/input";
import { LAKE_TRIP_ID } from "@/lib/constants";
import { ensureDemoSeed } from "@/lib/store";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await ensureDemoSeed();
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8 md:max-w-3xl md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Sendoff</p>
      <h1 className="mt-2 max-w-xl font-serif text-4xl leading-tight md:text-6xl">
        Plan the trip. Commit, or you&apos;re off.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        For whoever usually puts the rental on their card. Vote the place and the dates, see what each household owes before anyone pays,
        and collect a buy-in that is part of the share — not a fee on top. It stays refundable until the stay is booked.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/demo"
          className="flex min-h-12 flex-col justify-center rounded-xl bg-accent px-5 py-3 font-semibold text-accent-ink"
        >
          Pre-wedding demo
          <span className="text-xs font-normal opacity-80">Alex&apos;s Bachelor Party · 9 people</span>
        </Link>
        <Link
          href={`/demo?trip=${LAKE_TRIP_ID}`}
          className="flex min-h-12 flex-col justify-center rounded-xl border border-line bg-card px-5 py-3 font-semibold"
        >
          Family demo
          <span className="text-xs font-normal text-muted">Harper Lake House · 4 households, kids, grandparents</span>
        </Link>
      </div>
      <a href="#start" className="mt-3 text-sm font-semibold text-accent">Start a new trip</a>
      <ol className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["1", "Vote", "Approve any place, weekend, or plan you'd actually do. A private budget shows whether it fits the group without telling anyone your number."],
          ["2", "See your number", "Rooms are priced by the bed, not split evenly. Kids pay less of the food and activities. Optional things split only among who's in."],
          ["3", "Commit", "One test buy-in per household holds your room. Refundable until the stay is booked; after that, a late drop forfeits it."],
        ].map(([step, title, body]) => (
          <li key={step} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs font-semibold text-accent">Step {step}</p>
            <h2 className="mt-1 font-serif text-2xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>

      <form id="start" action={createTripAction} className="mt-10 grid gap-4 rounded-3xl border border-line bg-card p-5">
        <div>
          <h2 className="font-serif text-3xl">Start a trip</h2>
          <p className="mt-1 text-sm text-muted">Friends and golf templates are coming next.</p>
        </div>
        {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <Field label="Trip name" name="name" placeholder="Jamie & Sam's weekend" />
        <fieldset className="grid gap-2 text-sm">
          <legend className="font-medium">What kind of trip</legend>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-3">
            <input type="radio" name="tripType" value="pre_wedding" defaultChecked />
            Pre-wedding
            <select className={`${fieldClass} ml-auto h-9 w-auto`} name="preWeddingStyle" defaultValue="joint" aria-label="Pre-wedding style">
              <option value="joint">Joint</option>
              <option value="bachelorette">Bachelorette</option>
              <option value="bachelor">Bachelor</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-3">
            <input type="radio" name="tripType" value="family" />
            Family trip
          </label>
        </fieldset>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" name="organizerName" placeholder="Jordan Lee" />
          <Field label="Your phone or email" name="organizerContact" placeholder="jordan@example.com" />
        </div>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Guests of honor (optional — leave blank for none)</legend>
          <p className="text-xs text-muted">They come along, the group covers their share, and they can&apos;t be dropped. Name up to two here.</p>
          {[1, 2].map((index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
              <Input name={`honoree${index}Name`} placeholder={index === 1 ? "Name" : "Second name (optional)"} aria-label={`Guest of honor ${index}`} />
              <select className={`${fieldClass} w-32`} name={`honoree${index}Role`} defaultValue="other" aria-label={`Guest of honor ${index} role`}>
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="birthday">Birthday</option>
                <option value="other">Other</option>
              </select>
              <Input className="col-span-2" name={`honoree${index}Contact`} placeholder="Their phone or email (optional)" aria-label={`Guest of honor ${index} contact`} />
            </div>
          ))}
        </fieldset>
        <Field label="Rough date window" name="dateWindow" placeholder="A long weekend in April or May 2027" />
        <SubmitButton pendingLabel="Creating…">Create the trip</SubmitButton>
      </form>
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

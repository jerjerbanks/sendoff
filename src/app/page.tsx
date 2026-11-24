import Link from "next/link";
import { createTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/bits";
import { Input } from "@/components/ui/input";
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
        The bachelor weekend, priced before anyone puts a card down.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Vote the city, see what each person owes, and collect a buy-in that is part of the share — not a
        fee on top. It stays refundable until the stay is booked. After that, a late drop leaves the buy-in in the pot and the rest of
        the crew splits what&apos;s left.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/demo"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-ink"
        >
          Open Alex&apos;s demo party
        </Link>
        <a href="#start" className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-card px-5 font-semibold">
          Start a new trip
        </a>
      </div>
      <ol className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ["1", "Vote", "Approve any city, weekend, or plan you'd actually do. The organizer locks a winner."],
          ["2", "See the number", "Shared costs round up to the next dollar. Optional stuff, like tee times, splits only among people who opted in."],
          ["3", "Commit", "A test buy-in holds your spot. Miss the minimum and it's refunded. Lock in, then bail, and it's forfeited."],
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
          <h2 className="font-serif text-3xl">Start a bachelor party</h2>
          <p className="mt-1 text-sm text-muted">Golf and camping templates aren&apos;t in this version. The guest of honor is in the trip, doesn&apos;t pay, and can&apos;t be dropped.</p>
        </div>
        {error ? <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <Field label="Trip name" name="name" placeholder="Alex's bachelor party" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" name="organizerName" placeholder="Chris Hale" />
          <Field label="Your phone or email" name="organizerContact" placeholder="chris@example.com" />
          <Field label="Guest of honor" name="honoreeName" placeholder="Alex Mora" />
          <Field label="Their phone or email" name="honoreeContact" placeholder="alex@example.com" />
        </div>
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
